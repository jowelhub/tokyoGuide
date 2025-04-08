// /app/api/explore/search/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Use server client for fetching locations
import OpenAI from 'openai';
import type { LocationData } from '@/lib/types';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

// Helper function to get locations for the AI prompt
async function getLocationsForAIPrompt(supabase: ReturnType<typeof createClient>): Promise<Pick<LocationData, 'id' | 'name' | 'description' | 'category' | 'coordinates'>[]> {
    console.log('[AI Search] Fetching locations for AI prompt...');
    // Select necessary fields including coordinates
    const { data, error } = await supabase
        .from('locations')
        .select('id, name, description, latitude, longitude, categories!inner(name)');

    if (error) {
        console.error("Error fetching locations for AI:", error.message);
        return [];
    }
    if (!data) {
        console.warn("No location data found for AI prompt.");
        return [];
    }

    console.log(`[AI Search] Fetched ${data.length} locations for AI prompt.`);
    return data.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        description: loc.description,
        category: loc.categories.name,
        coordinates: [loc.latitude, loc.longitude] as [number, number],
    }));
}

// Interface for the expected AI JSON output structure
interface AISearchResponse {
    matchingLocationIds: string[];
}

export async function POST(request: Request) {
    console.log('[AI Search API] Received request.');
    try {
        const { userQuery } = await request.json();

        // --- 1. Input Validation ---
        if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
            console.error('[AI Search API] Invalid input: userQuery issue.');
            return NextResponse.json({ error: 'Invalid input: userQuery is required.' }, { status: 400 });
        }
        console.log(`[AI Search API] Validated input: query: "${userQuery.substring(0, 100)}..."`);

        // --- 2. Fetch Location Data ---
        const supabase = createClient(); // Server client for fetching data
        const availableLocations = await getLocationsForAIPrompt(supabase);
        if (availableLocations.length === 0) {
             console.error('[AI Search API] Failed to fetch any locations for AI context.');
            return NextResponse.json({ error: 'Could not fetch location data for AI search.' }, { status: 500 });
        }
        const validLocationIds = new Set(availableLocations.map(l => l.id));

        // --- 3. Construct AI Prompt ---
        const locationsString = availableLocations.map(loc =>
            `- ID: ${loc.id}, Name: ${loc.name}, Category: ${loc.category}, Coordinates: [${loc.coordinates[0].toFixed(4)}, ${loc.coordinates[1].toFixed(4)}], Description: ${loc.description.substring(0, 100)}...`
        ).join('\n');

        const systemPrompt = `
You are an AI assistant helping users find relevant locations in Tokyo based on their query.
Your task is to analyze the user's query and identify which of the provided locations best match the request.
Consider the location's name, description, category, and potentially its coordinates if the query implies proximity or a specific area.

You MUST ONLY return locations from the provided list.
You MUST structure your output as a valid JSON object containing exactly one key: "matchingLocationIds".
The value of "matchingLocationIds" MUST be an array of strings, where each string is the ID of a matching location from the provided list.
If no locations match, return an empty array: { "matchingLocationIds": [] }.

Example Output Structure:
{
  "matchingLocationIds": ["shibuya-crossing", "harajuku", "tokyo-skytree"]
}

Available Tokyo Locations (Use ONLY these IDs):
${locationsString}

Strictly adhere to the JSON output format. Do not add any extra text, explanations, apologies, or introductory/concluding remarks outside the JSON structure itself. Ensure the final output is a single, valid JSON object starting with { and ending with }.
        `;

        // --- 4. Call AI API ---
        console.log('[AI Search API] Sending request to AI...');
        const completion = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userQuery },
            ],
            temperature: 0.3, // Lower temperature for more deterministic matching
        });
        console.log('[AI Search API] Received response from AI.');
        const aiResponseContent = completion.choices[0]?.message?.content;

        if (!aiResponseContent) {
            console.error('[AI Search API] AI response content is empty.');
            throw new Error('AI did not return any content.');
        }

        // --- 5. Parse and Validate AI Response ---
        console.log('[AI Search API] Parsing AI response...');
        let parsedResponse: AISearchResponse;
        try {
            parsedResponse = JSON.parse(aiResponseContent);
            console.log('[AI Search API] AI response parsed successfully.');

            // Validate structure
            if (!parsedResponse || !Array.isArray(parsedResponse.matchingLocationIds)) {
                 throw new Error('Invalid JSON structure: "matchingLocationIds" (array) is required.');
            }

            // Validate and filter IDs
            const originalCount = parsedResponse.matchingLocationIds.length;
            parsedResponse.matchingLocationIds = parsedResponse.matchingLocationIds.filter(id => {
                if (typeof id !== 'string') {
                    console.warn(`[AI Search API] Invalid location ID type found:`, id);
                    return false;
                }
                const isValid = validLocationIds.has(id);
                if (!isValid) {
                    console.warn(`[AI Search API] AI returned unknown location ID: ${id}. Skipping.`);
                }
                return isValid;
            });

            if (parsedResponse.matchingLocationIds.length !== originalCount) {
                console.log(`[AI Search API] Filtered invalid location IDs returned by AI.`);
            }

        } catch (parseError: any) {
            console.error("[AI Search API] Error parsing or validating AI JSON response:", parseError.message);
            console.error("[AI Search API] Raw AI Response Content:", aiResponseContent);
            throw new Error('Failed to process AI response. Please try again.');
        }
        console.log(`[AI Search API] AI identified ${parsedResponse.matchingLocationIds.length} matching locations.`);

        // --- 6. Return Matching IDs ---
        return NextResponse.json({ matchingLocationIds: parsedResponse.matchingLocationIds }, { status: 200 });

    } catch (error: any) {
        console.error('[AI Search API] Unhandled Error:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred during AI search.' }, { status: 500 });
    }
}