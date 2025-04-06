// /app/api/itineraries/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ItineraryDay, LocationData } from "@/lib/types"; // Import LocationData

export const dynamic = "force-dynamic";

// Helper function to verify ownership
async function verifyItineraryOwnership(supabase: ReturnType<typeof createClient>, itineraryId: number, userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("user_itineraries")
        .select("id")
        .eq("id", itineraryId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error verifying itinerary ownership:", error.message);
        return false;
    }
    return !!data;
}


// GET /api/itineraries/[id] - Fetch details for a specific itinerary
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const itineraryId = parseInt(params.id, 10);
    if (isNaN(itineraryId)) {
        return NextResponse.json({ error: "Invalid Itinerary ID" }, { status: 400 });
    }

    try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // Verify ownership (RLS should also enforce this, but good practice)
        const isOwner = await verifyItineraryOwnership(supabase, itineraryId, user.id);
        if (!isOwner) {
            return NextResponse.json({ error: "Itinerary not found or access denied" }, { status: 404 });
        }

        // Fetch itinerary name (optional, could be passed from client)
         const { data: itineraryInfo, error: nameError } = await supabase
           .from("user_itineraries")
           .select("name")
           .eq("id", itineraryId)
           .single();

         if (nameError || !itineraryInfo) {
             console.warn(`Could not fetch name for itinerary ${itineraryId}: ${nameError?.message}`);
             // Proceed without name if needed, or return error
         }


        // Fetch all days for this itinerary
        const { data: days, error: daysError } = await supabase
            .from("itinerary_days")
            .select("id, day_number")
            .eq("itinerary_id", itineraryId)
            .order("day_number");

        if (daysError) {
            console.error("Error fetching days:", daysError.message);
            return NextResponse.json({ error: "Failed to fetch itinerary days" }, { status: 500 });
        }

        if (!days || days.length === 0) {
             // Itinerary exists but has no days (e.g., immediately after creation before default day insert finishes?)
             // Return empty days array along with ID and name
             return NextResponse.json(
                 { id: itineraryId, name: itineraryInfo?.name || 'Unknown', days: [] },
                 { status: 200 }
             );
        }

        // Fetch all locations for these days
        const dayIds = days.map(day => day.id);
        const { data: itineraryLocations, error: locationsError } = await supabase
            .from("itinerary_locations")
            .select("day_id, location_id, position")
            .in("day_id", dayIds)
            .order("position");

        if (locationsError) {
            console.error("Error fetching itinerary locations:", locationsError.message);
            return NextResponse.json({ error: "Failed to fetch itinerary locations" }, { status: 500 });
        }

        // Extract all unique location IDs
        const locationIds = Array.from(new Set(itineraryLocations?.map(item => item.location_id) || []));

        let locationMap = new Map<string, LocationData>(); // Use LocationData type for map value

        if (locationIds.length > 0) {
            // Fetch all location data for these location IDs
            const { data: locationsData, error: fullLocationsError } = await supabase
                .from("locations")
                .select(`
                    id, name, description, latitude, longitude, images,
                    categories!inner ( name )
                `)
                .in("id", locationIds);

            if (fullLocationsError) {
                console.error("Error fetching location details:", fullLocationsError.message);
                return NextResponse.json({ error: "Failed to fetch location details" }, { status: 500 });
            }

            // Transform location data to match LocationData type (FIXED)
            locationsData?.forEach(location => {
                // Check if categories is an array and has at least one element
                const categoryName = (Array.isArray(location.categories) && location.categories.length > 0)
                    ? location.categories[0].name // Access the name from the first element
                    : (location.categories && typeof location.categories === 'object' && 'name' in location.categories)
                        ? (location.categories as { name: string }).name // Handle if it's already an object
                        : 'Unknown'; // Fallback category name

                locationMap.set(location.id, {
                    id: location.id,
                    name: location.name,
                    description: location.description,
                    category: categoryName, // Use the safely accessed category name
                    coordinates: [location.latitude, location.longitude] as [number, number],
                    images: Array.isArray(location.images) ? location.images : JSON.parse(location.images || '[]')
                });
            });
        }

        // Assemble the days array with their locations
        const assembledDays = days.map(day => {
            const dayLocations = itineraryLocations
                ?.filter(item => item.day_id === day.id)
                .map(item => locationMap.get(item.location_id))
                .filter((loc): loc is LocationData => !!loc); // Type guard to ensure only valid LocationData objects

            return {
                id: day.day_number, // Use day_number as the client-side ID
                locations: dayLocations || []
            };
        });

        return NextResponse.json(
            { id: itineraryId, name: itineraryInfo?.name || 'Unknown', days: assembledDays },
            { status: 200 }
        );

    } catch (error) {
        console.error(`Unexpected error fetching itinerary ${params.id}:`, error);
        return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
}


// POST /api/itineraries/[id] - Update a specific itinerary's content
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const itineraryId = parseInt(params.id, 10);
    if (isNaN(itineraryId)) {
        return NextResponse.json({ error: "Invalid Itinerary ID" }, { status: 400 });
    }

    try {
        const { days } = await request.json(); // Only expect 'days' for content update

        if (!days) {
            return NextResponse.json({ error: "Days data is required" }, { status: 400 });
        }

        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // Verify ownership (RLS should also enforce this)
         const isOwner = await verifyItineraryOwnership(supabase, itineraryId, user.id);
         if (!isOwner) {
             return NextResponse.json({ error: "Unauthorized: Itinerary does not belong to the current user or not found" }, { status: 403 });
         }

        // Prepare the days data for the RPC function
        const daysData = days.map((day: ItineraryDay) => ({
            day_number: day.id,
            locations: day.locations.map(loc => loc.id)
        }));

        // Call the update_itinerary RPC function
        const { error: updateError } = await supabase.rpc(
            'update_itinerary',
            {
                _itinerary_id: itineraryId,
                _days_data: daysData
            }
        );

        if (updateError) {
            console.error("Error updating itinerary:", updateError.message);
            return NextResponse.json({ error: "Failed to update itinerary" }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error(`Unexpected error updating itinerary ${params.id}:`, error);
        return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
}