import { createClient } from "./server";
import { LocationData } from "../types";

export async function getLocations(): Promise<LocationData[]> {
  const supabase = createClient();
  
  // Join locations with categories to get the category name
  const { data, error } = await supabase
    .from("locations")
    .select(`
      *,
      categories!inner (
        name
      )
    `);
  
  if (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
  
  // Transform the data to match our LocationData type
  return data.map((location: any) => ({
    id: location.id,
    name: location.name,
    description: location.description,
    category: location.categories.name,
    coordinates: [location.latitude, location.longitude] as [number, number],
    images: Array.isArray(location.images) ? location.images : JSON.parse(location.images)
  }));
}

export async function getLocationById(id: string): Promise<LocationData | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("locations")
    .select(`
      *,
      categories!inner (
        name
      )
    `)
    .eq("id", id)
    .single();
  
  if (error || !data) {
    console.error("Error fetching location:", error);
    return null;
  }
  
  // Transform the data to match our LocationData type
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.categories.name,
    coordinates: [data.latitude, data.longitude] as [number, number],
    images: Array.isArray(data.images) ? data.images : JSON.parse(data.images)
  };
}

export async function getLocationBySlug(slug: string): Promise<LocationData | null> {
  const supabase = createClient();
  
  try {
    // Directly use the slug as the ID - much simpler and more reliable
    const { data, error } = await supabase
      .from("locations")
      .select(`
        *,
        categories!inner (
          name
        )
      `)
      .eq("id", slug)
      .single();
    
    if (error || !data) {
      console.error("Error fetching location by slug/id:", error);
      return null;
    }
    
    // Transform the data to match our LocationData type
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.categories.name,
      coordinates: [data.latitude, data.longitude] as [number, number],
      images: Array.isArray(data.images) ? data.images : JSON.parse(data.images)
    };
  } catch (error) {
    console.error("Exception in getLocationBySlug:", error);
    return null;
  }
}
