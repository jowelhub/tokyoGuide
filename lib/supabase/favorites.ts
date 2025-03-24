import { createClient } from "./client";

// Toggle favorite status for a location
export async function toggleFavorite(locationId: string) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in to favorite locations");
  }
  
  // Check if this location is already favorited
  const { data: existingFavorite } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", user.id)
    .eq("location_id", locationId)
    .single();
  
  // If it exists, remove it (unlike); if not, add it (like)
  if (existingFavorite) {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("location_id", locationId);
      
    if (error) throw error;
    return false; // Return false to indicate it's no longer favorited
  } else {
    const { error } = await supabase
      .from("user_favorites")
      .insert({ user_id: user.id, location_id: locationId });
      
    if (error) throw error;
    return true; // Return true to indicate it's now favorited
  }
}

// Get all favorited locations for current user
export async function getUserFavorites() {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return []; // Return empty array if not logged in
  }
  
  const { data, error } = await supabase
    .from("user_favorites")
    .select("location_id")
    .eq("user_id", user.id);
  
  if (error) {
    console.error("Error fetching user favorites:", error);
    return [];
  }
  
  return data.map(fav => fav.location_id);
}

// Check if a specific location is favorited
export async function isLocationFavorited(locationId: string) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false; // Not favorited if not logged in
  }
  
  const { data, error } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("location_id", locationId)
    .single();
  
  if (error) {
    // If error is not found, it means the location is not favorited
    if (error.code === "PGRST116") {
      return false;
    }
    console.error("Error checking favorite status:", error);
    return false;
  }
  
  return !!data; // Return true if data exists
}
