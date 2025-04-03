import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ItineraryDay } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Try to find an existing itinerary for this user
    const { data: existingItinerary, error: findError } = await supabase
      .from("user_itineraries")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (findError) {
      console.error("Error finding itinerary:", findError.message);
      return NextResponse.json(
        { error: "Failed to find itinerary" },
        { status: 500 }
      );
    }

    let itineraryId;

    if (existingItinerary) {
      itineraryId = existingItinerary.id;
    } else {
      // No existing itinerary found, create a new one
      const { data: newItinerary, error: insertError } = await supabase
        .from("user_itineraries")
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (insertError) {
        console.error("Error creating itinerary:", insertError.message);
        return NextResponse.json(
          { error: "Failed to create itinerary" },
          { status: 500 }
        );
      }

      itineraryId = newItinerary.id;

      // Insert default first day
      const { error: dayError } = await supabase
        .from("itinerary_days")
        .insert({ itinerary_id: itineraryId, day_number: 1 });

      if (dayError) {
        console.error("Error creating default day:", dayError.message);
        return NextResponse.json(
          { error: "Failed to create default day" },
          { status: 500 }
        );
      }

      // Return the new empty itinerary
      return NextResponse.json(
        { id: itineraryId, days: [{ id: 1, locations: [] }] },
        { status: 200 }
      );
    }

    // Fetch all days for this itinerary
    const { data: days, error: daysError } = await supabase
      .from("itinerary_days")
      .select("id, day_number")
      .eq("itinerary_id", itineraryId)
      .order("day_number");

    if (daysError) {
      console.error("Error fetching days:", daysError.message);
      return NextResponse.json(
        { error: "Failed to fetch itinerary days" },
        { status: 500 }
      );
    }

    if (!days || days.length === 0) {
      // Return empty days array for an itinerary with no days
      return NextResponse.json(
        { id: itineraryId, days: [] },
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
      return NextResponse.json(
        { error: "Failed to fetch itinerary locations" },
        { status: 500 }
      );
    }

    // Extract all unique location IDs
    const locationIds = Array.from(new Set(itineraryLocations?.map(item => item.location_id) || []));
    
    let locationMap = new Map();
    
    if (locationIds.length > 0) {
      // Fetch all location data for these location IDs
      const { data: locations, error: fullLocationsError } = await supabase
        .from("locations")
        .select(`
          *,
          categories!inner (
            name
          )
        `)
        .in("id", locationIds);

      if (fullLocationsError) {
        console.error("Error fetching location details:", fullLocationsError.message);
        return NextResponse.json(
          { error: "Failed to fetch location details" },
          { status: 500 }
        );
      }

      // Transform location data to match LocationData type
      locations?.forEach(location => {
        locationMap.set(location.id, {
          id: location.id,
          name: location.name,
          description: location.description,
          category: location.categories.name,
          coordinates: [location.latitude, location.longitude] as [number, number],
          images: Array.isArray(location.images) ? location.images : JSON.parse(location.images)
        });
      });
    }

    // Assemble the days array with their locations
    const assembledDays = days.map(day => {
      const dayLocations = itineraryLocations
        ?.filter(item => item.day_id === day.id)
        .map(item => locationMap.get(item.location_id))
        .filter(Boolean); // Remove any undefined locations
      
      return {
        id: day.day_number,
        locations: dayLocations || []
      };
    });

    return NextResponse.json(
      { id: itineraryId, days: assembledDays },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error fetching itinerary:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { itineraryId, days } = await request.json();
    
    if (!itineraryId || !days) {
      return NextResponse.json(
        { error: "Itinerary ID and days are required" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify that the itinerary belongs to the authenticated user
    const { data: userItinerary, error: verifyError } = await supabase
      .from("user_itineraries")
      .select("id")
      .eq("id", itineraryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (verifyError) {
      console.error("Error verifying itinerary ownership:", verifyError.message);
      return NextResponse.json(
        { error: "Failed to verify itinerary ownership" },
        { status: 500 }
      );
    }

    if (!userItinerary) {
      return NextResponse.json(
        { error: "Unauthorized: Itinerary does not belong to the current user" },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: "Failed to update itinerary" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error updating itinerary:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
