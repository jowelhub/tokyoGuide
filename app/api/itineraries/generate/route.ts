// /app/api/itineraries/generate/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import type { LocationData } from '@/lib/types';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

// Updated Helper function (as defined above)
async function getLocationsForAIPrompt(supabase: ReturnType<typeof createClient>): Promise<Pick<LocationData, 'id' | 'name' | 'description' | 'category' | 'coordinates'>[]> {
    // ... implementation from step 1 ...
    console.log('[AI Generate] Fetching locations with coordinates for AI prompt...');
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

    console.log(`[AI Generate] Fetched ${data.length} locations for AI prompt.`);
    return data.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        description: loc.description,
        category: loc.categories.name,
        coordinates: [loc.latitude, loc.longitude] as [number, number],
    }));
}

// Interface for the NEW expected AI JSON output structure
interface AIItineraryResponse {
    tripName: string; // Added trip name
    days: {
        id: number;
        locations: string[];
    }[];
}

export async function POST(request: Request) {
    console.log('[AI Generate API] Received request.');
    try {
        const { numDays, userPrompt } = await request.json();

        // --- 1. Input Validation (keep as before) ---
        if (!numDays || typeof numDays !== 'number' || numDays <= 0 || numDays > 14) {
            console.error('[AI Generate API] Invalid input: numDays issue.', { numDays });
            return NextResponse.json({ error: 'Invalid input: numDays must be a positive number (max 14).' }, { status: 400 });
        }
        if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
            console.error('[AI Generate API] Invalid input: userPrompt issue.');
            return NextResponse.json({ error: 'Invalid input: userPrompt is required.' }, { status: 400 });
        }
        console.log(`[AI Generate API] Validated input: ${numDays} days, prompt: "${userPrompt.substring(0, 50)}..."`);

        // --- 2. Authentication (keep as before) ---
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('[AI Generate API] Authentication failed:', userError?.message);
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }
        console.log(`[AI Generate API] User authenticated: ${user.id}`);

        // --- 3. Fetch Location Data (uses updated helper) ---
        const availableLocations = await getLocationsForAIPrompt(supabase);
        if (availableLocations.length === 0) {
             console.error('[AI Generate API] Failed to fetch any locations for AI context.');
            return NextResponse.json({ error: 'Could not fetch location data for AI generation.' }, { status: 500 });
        }

        // --- 4. Construct Updated AI Prompt ---
        const locationsString = availableLocations.map(loc =>
            `- ID: ${loc.id}, Name: ${loc.name}, Category: ${loc.category}, Coordinates: [${loc.coordinates[0].toFixed(4)}, ${loc.coordinates[1].toFixed(4)}], Description: ${loc.description.substring(0, 80)}...` // Include coordinates, slightly shorter description
        ).join('\n');

        const systemPrompt = `
You are an expert Tokyo travel itinerary planner.
Your task is to create a ${numDays}-day itinerary based on the user's request and the provided list of available locations with their coordinates.
You MUST ONLY use locations from the provided list.
You MUST structure your output as a valid JSON object containing exactly two keys at the top level: "tripName" and "days".
1. "tripName": A concise and relevant name for the trip (string, max 50 characters), based on the user's prompt and the generated plan.
2. "days": An array containing exactly ${numDays} day objects.

Each day object MUST have two keys:
1. "id": The day number (integer, starting from 1 and incrementing sequentially).
2. "locations": An array of location IDs (strings) for that day, selected ONLY from the provided list. The order matters.

IMPORTANT: When selecting locations for a specific day, prioritize locations that are geographically close to each other to minimize travel time. Use the provided coordinates to assess proximity. Aim for a logical flow within each day. Include a reasonable number of activities per day (e.g., 2-5) based on proximity and user preferences.

Example Output Structure for a 2-day request:
{
  "tripName": "Tokyo Highlights & Culture",
  "days": [
    { "id": 1, "locations": ["meiji-shrine", "harajuku", "shibuya-crossing"] },
    { "id": 2, "locations": ["senso-ji", "ueno-park", "tokyo-national-museum"] }
  ]
}

Available Tokyo Locations (Use ONLY these IDs and consider their coordinates):
${locationsString}

Strictly adhere to the JSON output format. Do not add any extra text, explanations, apologies, or introductory/concluding remarks outside the JSON structure itself. Ensure the final output is a single, valid JSON object starting with { and ending with }.
        `;

        const fullUserPrompt = `Create a ${numDays}-day itinerary for Tokyo. User preferences: ${userPrompt}`;

        // --- 5. Call AI API (keep as before) ---
        console.log('[AI Generate API] Sending request to OpenAI...');
        const completion = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: fullUserPrompt },
            ],
            temperature: 0.6, // Slightly lower temperature might help with adherence
        });
        console.log('[AI Generate API] Received response from OpenAI.');
        const aiResponseContent = completion.choices[0]?.message?.content;
        if (!aiResponseContent) {
            console.error('[AI Generate API] AI response content is empty.');
            throw new Error('AI did not return any content.');
        }

        // --- 6. Parse and Validate Updated AI Response ---
        console.log('[AI Generate API] Parsing AI response...');
        let parsedItinerary: AIItineraryResponse;
        try {
            parsedItinerary = JSON.parse(aiResponseContent);
            console.log('[AI Generate API] AI response parsed successfully.');

            // Validate top-level structure
            if (!parsedItinerary || typeof parsedItinerary.tripName !== 'string' || !Array.isArray(parsedItinerary.days)) {
                 throw new Error('Invalid JSON structure: "tripName" (string) and "days" (array) are required.');
            }
            if (parsedItinerary.tripName.length > 60) { // Add a reasonable length limit check
                 console.warn(`[AI Generate API] AI tripName is long (${parsedItinerary.tripName.length} chars), truncating.`);
                 parsedItinerary.tripName = parsedItinerary.tripName.substring(0, 60).trim() + '...';
            }
            if (parsedItinerary.tripName.trim().length === 0) {
                 console.warn(`[AI Generate API] AI tripName is empty, will use default.`);
                 // Let the fallback handle this later
            }


            // Validate days array length (keep as before)
            if (parsedItinerary.days.length !== numDays) {
                 console.warn(`[AI Generate API] AI returned ${parsedItinerary.days.length} days, but ${numDays} were requested. Adjusting...`);
                 if (parsedItinerary.days.length > numDays) {
                     parsedItinerary.days = parsedItinerary.days.slice(0, numDays);
                 } else {
                     while (parsedItinerary.days.length < numDays) {
                         parsedItinerary.days.push({ id: parsedItinerary.days.length + 1, locations: [] });
                     }
                 }
            }

            // Validate each day and filter location IDs (keep as before)
            const validLocationIds = new Set(availableLocations.map(l => l.id));
            parsedItinerary.days.forEach((day, index) => {
                day.id = index + 1; // Ensure sequential IDs
                if (typeof day.id !== 'number' || !Array.isArray(day.locations)) {
                    throw new Error(`Invalid structure in day ${index + 1}.`);
                }
                const originalLocationCount = day.locations.length;
                day.locations = day.locations.filter(locId => {
                    if (typeof locId !== 'string') {
                        console.warn(`[AI Generate API] Invalid location ID type found in day ${day.id}:`, locId);
                        return false;
                    }
                    const isValid = validLocationIds.has(locId);
                    if (!isValid) {
                        console.warn(`[AI Generate API] AI returned unknown location ID: ${locId} for day ${day.id}. Skipping.`);
                    }
                    return isValid;
                });
                 if (day.locations.length !== originalLocationCount) {
                    console.log(`[AI Generate API] Filtered invalid location IDs for day ${day.id}.`);
                }
            });

        } catch (parseError: any) {
            console.error("[AI Generate API] Error parsing or validating AI JSON response:", parseError.message);
            console.error("[AI Generate API] Raw AI Response Content:", aiResponseContent);
            throw new Error('Failed to process AI response. Please try again.');
        }
        console.log('[AI Generate API] AI response validated.');

        // --- 7. Create Itinerary in Supabase (Use generated name) ---
        console.log('[AI Generate API] Creating itinerary in Supabase...');

        // Use AI name, provide a fallback if empty or missing
        const itineraryName = parsedItinerary.tripName?.trim() || `AI Trip ${new Date().toISOString()}`;
        console.log(`[AI Generate API] Using itinerary name: "${itineraryName}"`);

        const { data: newItinerary, error: insertItineraryError } = await supabase
            .from('user_itineraries')
            .insert({ user_id: user.id, name: itineraryName }) // Use the generated/fallback name
            .select('id')
            .single();

        if (insertItineraryError || !newItinerary) {
            console.error("[AI Generate API] Error creating itinerary entry:", insertItineraryError?.message);
            if (insertItineraryError?.code === '23505') {
                 return NextResponse.json({ error: `An itinerary named "${itineraryName}" might already exist. Please try generating again with a different prompt.` }, { status: 409 });
            }
            throw new Error('Failed to save new itinerary entry.');
        }

        const newItineraryId = newItinerary.id;
        console.log(`[AI Generate API] Created itinerary record ${newItineraryId}. Inserting days/locations...`);

        // Insert days and locations (keep as before)
        for (const day of parsedItinerary.days) {
            // ... (day insertion logic as before) ...
             const { data: newDay, error: dayError } = await supabase
                .from('itinerary_days')
                .insert({ itinerary_id: newItineraryId, day_number: day.id })
                .select('id')
                .single();

            if (dayError || !newDay) {
                console.error(`[AI Generate API] Error creating day ${day.id} for itinerary ${newItineraryId}:`, dayError?.message);
                continue;
            }

            if (day.locations.length > 0) {
                const locationInserts = day.locations.map((locId, index) => ({
                    day_id: newDay.id,
                    location_id: locId,
                    position: index,
                }));
                const { error: locationError } = await supabase
                    .from('itinerary_locations')
                    .insert(locationInserts);

                if (locationError) {
                    console.error(`[AI Generate API] Error inserting locations for day ${day.id} (DB ID: ${newDay.id}):`, locationError.message);
                }
            }
        }

        console.log(`[AI Generate API] Successfully created and populated itinerary ${newItineraryId}`);

        // --- 8. Return New Itinerary ID (keep as before) ---
        return NextResponse.json({ itineraryId: newItineraryId }, { status: 201 });

    } catch (error: any) {
        console.error('[AI Generate API] Unhandled Error:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred during AI itinerary generation.' }, { status: 500 });
    }
}