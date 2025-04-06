// /app/api/itineraries/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/itineraries - Fetch all itinerary names for the user
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: itineraries, error: fetchError } = await supabase
      .from("user_itineraries")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }); // Or order by name, etc.

    if (fetchError) {
      console.error("Error fetching itineraries:", fetchError.message);
      return NextResponse.json({ error: "Failed to fetch itineraries" }, { status: 500 });
    }

    return NextResponse.json(itineraries || [], { status: 200 });

  } catch (error) {
    console.error("Unexpected error fetching itineraries:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

// POST /api/itineraries - Create a new itinerary
export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: "Itinerary name is required and must be a non-empty string" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Insert the new itinerary
    const { data: newItinerary, error: insertError } = await supabase
      .from("user_itineraries")
      .insert({ user_id: user.id, name: name.trim() })
      .select('id, name')
      .single();

    if (insertError) {
      // Handle potential unique constraint violation (user_id, name)
      if (insertError.code === '23505') { // Unique violation code in PostgreSQL
         return NextResponse.json({ error: `An itinerary with the name "${name.trim()}" already exists.` }, { status: 409 }); // 409 Conflict
      }
      console.error("Error creating itinerary:", insertError.message);
      return NextResponse.json({ error: "Failed to create itinerary" }, { status: 500 });
    }

    // Insert the default first day for the new itinerary
    const { error: dayError } = await supabase
      .from("itinerary_days")
      .insert({ itinerary_id: newItinerary.id, day_number: 1 });

    if (dayError) {
      // Log the error, but maybe don't fail the whole request?
      // Or potentially roll back the itinerary creation if the day fails?
      // For simplicity, we'll log and continue, returning the created itinerary.
      console.error(`Error creating default day 1 for itinerary ${newItinerary.id}:`, dayError.message);
      // Consider cleanup logic here if needed
    }

    return NextResponse.json(newItinerary, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Unexpected error creating itinerary:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}