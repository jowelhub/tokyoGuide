import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ favorites: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("user_favorites")
      .select("location_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching favorites:", error.message);
      return NextResponse.json({ favorites: [] }, { status: 200 });
    }

    const favorites = data.map(fav => fav.location_id);
    return NextResponse.json({ favorites }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error fetching favorites:", error);
    return NextResponse.json({ favorites: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const { locationId } = await request.json();
    
    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
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

    // Check if this location is already favorited
    const { data: existingFavorite, error: checkError } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", user.id)
      .eq("location_id", locationId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking favorite status:", checkError.message);
      return NextResponse.json(
        { error: "Failed to check favorite status" },
        { status: 500 }
      );
    }

    let isNowFavorited = false;

    // If it exists, remove it (unlike); if not, add it (like)
    if (existingFavorite) {
      const { error: deleteError } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("location_id", locationId);
        
      if (deleteError) {
        console.error("Error removing favorite:", deleteError.message);
        return NextResponse.json(
          { error: "Failed to remove from favorites" },
          { status: 500 }
        );
      }
      
      isNowFavorited = false;
    } else {
      const { error: insertError } = await supabase
        .from("user_favorites")
        .insert({ user_id: user.id, location_id: locationId });
        
      if (insertError) {
        console.error("Error adding favorite:", insertError.message);
        return NextResponse.json(
          { error: "Failed to add to favorites" },
          { status: 500 }
        );
      }
      
      isNowFavorited = true;
    }

    return NextResponse.json(
      { success: true, isFavorited: isNowFavorited },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error toggling favorite:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
