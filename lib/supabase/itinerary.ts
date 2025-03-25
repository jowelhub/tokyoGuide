import { createClient } from "./client";
import type { LocationData } from "@/lib/types";

export interface ItineraryDay {
  id: number;
  locations: LocationData[];
}

export interface Itinerary {
  id: number;
  name: string;
  days: ItineraryDay[];
  created_at: string;
  updated_at: string;
}

/**
 * Save a complete itinerary for the current user.
 * If the user already has an itinerary, it will update it instead.
 * 
 * @param name - The name of the itinerary
 * @param days - Array of itinerary days with locations
 * @returns The ID of the created or updated itinerary
 */
export async function saveItinerary(name: string, days: ItineraryDay[]): Promise<number> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in to save itineraries");
  }
  
  // First check if the user already has an itinerary
  const { data: existingItineraries, error: fetchError } = await supabase
    .from("user_itineraries")
    .select("id")
    .eq("user_id", user.id);
  
  if (fetchError) {
    console.error("Error checking for existing itineraries:", fetchError);
    throw fetchError;
  }
    
  // If user already has an itinerary, update it instead of creating a new one
  if (existingItineraries && existingItineraries.length > 0) {
    return updateItinerary(existingItineraries[0].id, name, days);
  }
  
  // Create a new itinerary
  const { data: itinerary, error: itineraryError } = await supabase
    .from("user_itineraries")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();
  
  if (itineraryError) {
    console.error("Error creating itinerary:", itineraryError);
    throw itineraryError;
  }
  
  // Create days for the itinerary
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const dayNumber = day.id; // Use the day's actual ID
    
    const { data: itineraryDay, error: dayError } = await supabase
      .from("itinerary_days")
      .insert({ itinerary_id: itinerary.id, day_number: dayNumber })
      .select("id")
      .single();
    
    if (dayError) {
      console.error("Error creating day:", dayError);
      throw dayError;
    }
    
    // Add locations to the day
    if (day.locations.length > 0) {
      const locationInserts = day.locations.map((location, index) => ({
        day_id: itineraryDay.id,
        location_id: location.id,
        position: index
      }));
      
      const { error: locationsError } = await supabase
        .from("itinerary_locations")
        .insert(locationInserts);
      
      if (locationsError) {
        console.error("Error adding locations:", locationsError);
        throw locationsError;
      }
    }
  }
  
  return itinerary.id;
}

/**
 * Get all itineraries for the current user
 * 
 * @returns Array of user itineraries
 */
export async function getUserItineraries(): Promise<Itinerary[]> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return []; // Return empty array if not logged in
  }
  
  const { data: itineraries, error: itinerariesError } = await supabase
    .from("user_itineraries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  if (itinerariesError) {
    console.error("Error fetching user itineraries:", itinerariesError);
    return [];
  }
  
  return itineraries || [];
}

/**
 * Get a specific itinerary with all its days and locations
 * 
 * @param itineraryId - The ID of the itinerary to retrieve
 * @returns The complete itinerary with days and locations
 */
export async function getItinerary(itineraryId: number): Promise<Itinerary> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in to view itineraries");
  }
  
  // Get the itinerary
  const { data: itinerary, error: itineraryError } = await supabase
    .from("user_itineraries")
    .select("*")
    .eq("id", itineraryId)
    .eq("user_id", user.id)
    .single();
  
  if (itineraryError) {
    console.error("Error fetching itinerary:", itineraryError);
    throw itineraryError;
  }
  
  // Get all days for this itinerary
  const { data: days, error: daysError } = await supabase
    .from("itinerary_days")
    .select("*")
    .eq("itinerary_id", itineraryId)
    .order("day_number", { ascending: true });
  
  if (daysError) {
    console.error("Error fetching days:", daysError);
    throw daysError;
  }
  
  // For each day, get its locations
  const daysWithLocations = await Promise.all((days || []).map(async (day) => {
    const { data: locationRelations, error: locationsError } = await supabase
      .from("itinerary_locations")
      .select("location_id, position")
      .eq("day_id", day.id)
      .order("position", { ascending: true });
    
    if (locationsError) {
      console.error("Error fetching location relations:", locationsError);
      throw locationsError;
    }
    
    // Get the full location data for each location ID
    const locationIds = (locationRelations || []).map(rel => rel.location_id);
    
    if (locationIds.length === 0) {
      return {
        id: day.day_number,
        locations: []
      };
    }
    
    const { data: locations, error: locationsDataError } = await supabase
      .from("locations")
      .select("*")
      .in("id", locationIds);
    
    if (locationsDataError) {
      console.error("Error fetching locations:", locationsDataError);
      throw locationsDataError;
    }
    
    // Sort locations based on their position in the day
    const sortedLocations = (locationRelations || [])
      .map(rel => {
        const location = (locations || []).find(loc => loc.id === rel.location_id);
        return location;
      })
      .filter(Boolean);
    
    return {
      id: day.day_number,
      locations: sortedLocations
    };
  }));
  
  return {
    ...itinerary,
    days: daysWithLocations
  };
}

/**
 * Delete an itinerary and all its associated data
 * 
 * @param itineraryId - The ID of the itinerary to delete
 * @returns true if successful
 */
export async function deleteItinerary(itineraryId: number): Promise<boolean> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in to delete itineraries");
  }
  
  // Check if the itinerary belongs to the user
  const { data, error: checkError } = await supabase
    .from("user_itineraries")
    .select("id")
    .eq("id", itineraryId)
    .eq("user_id", user.id)
    .single();
  
  if (checkError) {
    console.error("Error checking itinerary ownership:", checkError);
    throw checkError;
  }
  
  // Delete the itinerary (cascade will delete days and locations)
  const { error: deleteError } = await supabase
    .from("user_itineraries")
    .delete()
    .eq("id", itineraryId);
  
  if (deleteError) {
    console.error("Error deleting itinerary:", deleteError);
    throw deleteError;
  }
  
  return true;
}

/**
 * Update an existing itinerary with new data
 * 
 * @param itineraryId - The ID of the itinerary to update
 * @param name - The new name for the itinerary
 * @param days - The updated array of days and locations
 * @returns The ID of the updated itinerary
 */
export async function updateItinerary(itineraryId: number, name: string, days: ItineraryDay[]): Promise<number> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in to update itineraries");
  }
  
  // Check if the itinerary belongs to the user
  const { data: existingItinerary, error: checkError } = await supabase
    .from("user_itineraries")
    .select("id")
    .eq("id", itineraryId)
    .eq("user_id", user.id)
    .single();
  
  if (checkError) {
    console.error("Error checking itinerary ownership:", checkError);
    throw checkError;
  }
  
  // Update the itinerary name and timestamp
  const { error: updateError } = await supabase
    .from("user_itineraries")
    .update({ 
      name, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", itineraryId);
  
  if (updateError) {
    console.error("Error updating itinerary:", updateError);
    throw updateError;
  }
  
  // Get all existing days for this itinerary
  const { data: existingDays, error: daysError } = await supabase
    .from("itinerary_days")
    .select("id, day_number")
    .eq("itinerary_id", itineraryId);
  
  if (daysError) {
    console.error("Error fetching existing days:", daysError);
    throw daysError;
  }
  
  // Delete all existing days and their locations (we'll recreate them)
  if (existingDays && existingDays.length > 0) {
    const dayIdsToDelete = existingDays.map(day => day.id);
    
    const { error: deleteDaysError } = await supabase
      .from("itinerary_days")
      .delete()
      .in("id", dayIdsToDelete);
    
    if (deleteDaysError) {
      console.error("Error deleting existing days:", deleteDaysError);
      throw deleteDaysError;
    }
  }
  
  // Create days for the itinerary
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const dayNumber = day.id; // Use the day's actual ID
    
    const { data: itineraryDay, error: dayError } = await supabase
      .from("itinerary_days")
      .insert({ itinerary_id: itineraryId, day_number: dayNumber })
      .select("id")
      .single();
    
    if (dayError) {
      console.error("Error creating day:", dayError);
      throw dayError;
    }
    
    // Add locations to the day
    if (day.locations.length > 0) {
      const locationInserts = day.locations.map((location, index) => ({
        day_id: itineraryDay.id,
        location_id: location.id,
        position: index
      }));
      
      const { error: locationsError } = await supabase
        .from("itinerary_locations")
        .insert(locationInserts);
      
      if (locationsError) {
        console.error("Error adding locations:", locationsError);
        throw locationsError;
      }
    }
  }
  
  return itineraryId;
}
