import { createClient } from "./client";
import type { LocationData } from "@/lib/types";

export interface ItineraryDay {
  id: number; // Represents the day number (1, 2, 3...)
  locations: LocationData[];
}

export interface FetchedItinerary {
  id: number; // The user_itineraries primary key ID
  days: ItineraryDay[];
}

export async function getOrCreateUserItinerary(userId: string): Promise<FetchedItinerary> {
  const supabase = createClient();
  console.log('[getOrCreateUserItinerary] Fetching/creating itinerary for userId:', userId);

  try {
    // Try to find an existing itinerary for this user
    const { data: existingItinerary, error: findError } = await supabase
      .from("user_itineraries")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (findError) {
      console.error('[getOrCreateUserItinerary] Error finding itinerary:', findError);
      throw findError;
    }

    if (existingItinerary) {
      console.log('[getOrCreateUserItinerary] Found existing itinerary ID:', existingItinerary.id);
      
      // Fetch all days for this itinerary
      const { data: days, error: daysError } = await supabase
        .from("itinerary_days")
        .select("id, day_number")
        .eq("itinerary_id", existingItinerary.id)
        .order("day_number");

      if (daysError) {
        console.error('[getOrCreateUserItinerary] Error fetching days:', daysError);
        throw daysError;
      }

      if (!days || days.length === 0) {
        // Return empty days array for an itinerary with no days
        return { id: existingItinerary.id, days: [] };
      }

      // Fetch all locations for these days
      const dayIds = days.map(day => day.id);
      const { data: itineraryLocations, error: locationsError } = await supabase
        .from("itinerary_locations")
        .select("day_id, location_id, position")
        .in("day_id", dayIds)
        .order("position");

      if (locationsError) {
        console.error('[getOrCreateUserItinerary] Error fetching itinerary locations:', locationsError);
        throw locationsError;
      }

      // Extract all unique location IDs
      const locationIds = [...new Set(itineraryLocations?.map(item => item.location_id) || [])];
      
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
          console.error('[getOrCreateUserItinerary] Error fetching location details:', fullLocationsError);
          throw fullLocationsError;
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
      const assembledDays: ItineraryDay[] = days.map(day => {
        const dayLocations = itineraryLocations
          ?.filter(item => item.day_id === day.id)
          .map(item => locationMap.get(item.location_id))
          .filter(Boolean); // Remove any undefined locations
        
        return {
          id: day.day_number,
          locations: dayLocations || []
        };
      });

      console.log('[getOrCreateUserItinerary] Assembled existing days:', JSON.stringify(assembledDays, null, 2));
      return { id: existingItinerary.id, days: assembledDays };
    }

    // No existing itinerary found, create a new one
    console.log('[getOrCreateUserItinerary] No existing itinerary found, creating new one.');
    
    // Insert new itinerary
    const { data: newItinerary, error: insertError } = await supabase
      .from("user_itineraries")
      .insert({ user_id: userId })
      .select('id')
      .single();

    if (insertError) {
      console.error('[getOrCreateUserItinerary] Error creating itinerary:', insertError);
      throw insertError;
    }

    const itineraryId = newItinerary.id;

    // Insert default first day
    const { error: dayError } = await supabase
      .from("itinerary_days")
      .insert({ itinerary_id: itineraryId, day_number: 1 });

    if (dayError) {
      console.error('[getOrCreateUserItinerary] Error creating default day:', dayError);
      throw dayError;
    }

    console.log('[getOrCreateUserItinerary] Created new itinerary ID:', itineraryId);
    return { id: itineraryId, days: [{ id: 1, locations: [] }] };

  } catch (error) {
    console.error('[getOrCreateUserItinerary] Unexpected error:', error);
    throw error;
  }
}

export async function updateUserItinerary(itineraryId: number, days: ItineraryDay[]): Promise<boolean> {
  const supabase = createClient();
  console.log(`[updateUserItinerary] Updating itineraryId: ${itineraryId} with days:`, JSON.stringify(days, null, 2));

  try {
    // Delete all existing days (cascade will handle locations)
    const { error: deleteError } = await supabase
      .from("itinerary_days")
      .delete()
      .eq("itinerary_id", itineraryId);

    if (deleteError) {
      console.error('[updateUserItinerary] Error deleting existing days:', deleteError);
      return false;
    }

    // Insert all new days and their locations
    for (const day of days) {
      // Insert new day
      const { data: newDay, error: dayError } = await supabase
        .from("itinerary_days")
        .insert({ itinerary_id: itineraryId, day_number: day.id })
        .select('id')
        .single();

      if (dayError) {
        console.error(`[updateUserItinerary] Error inserting day ${day.id}:`, dayError);
        return false;
      }

      const dayRecordId = newDay.id;
      console.log(`[updateUserItinerary] Inserted day ${day.id} with record ID ${dayRecordId}`);

      // If this day has locations, insert them
      if (day.locations && day.locations.length > 0) {
        const locationInserts = day.locations.map((loc, index) => ({
          day_id: dayRecordId,
          location_id: loc.id,
          position: index
        }));

        const { error: locError } = await supabase
          .from("itinerary_locations")
          .insert(locationInserts);

        if (locError) {
          console.error(`[updateUserItinerary] Error inserting locations for day ${day.id}:`, locError);
          return false;
        }

        console.log(`[updateUserItinerary] Inserted ${locationInserts.length} locations for day ${day.id}`);
      }
    }

    // Update the timestamp on the itinerary
    const { error: updateError } = await supabase
      .from("user_itineraries")
      .update({ updated_at: new Date() })
      .eq("id", itineraryId);

    if (updateError) {
      console.error('[updateUserItinerary] Error updating timestamp:', updateError);
      // Non-fatal error, continue
    }

    console.log('[updateUserItinerary] Successfully updated itinerary');
    return true;
  } catch (error) {
    console.error('[updateUserItinerary] Unexpected error:', error);
    return false;
  }
}
