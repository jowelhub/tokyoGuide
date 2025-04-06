// /app/planner/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLocations } from "@/lib/supabase/locations";
import { getCategories } from "@/lib/supabase/categories";
import Header from "@/components/layout/header";
import PlannerClient from "@/components/planner/planner-client";
import PageClient from '@/components/page-client';
import type { ItineraryDay, LocationData } from '@/lib/types';

interface ItineraryDetails {
    id: number;
    name: string;
    days: ItineraryDay[];
}

// Helper to fetch specific itinerary details
async function getItineraryDetails(supabase: ReturnType<typeof createClient>, itineraryId: number, userId: string): Promise<ItineraryDetails | null> {
   // Verify ownership first
    const { data: ownerCheck, error: ownerError } = await supabase
        .from("user_itineraries")
        .select("id, name") // Select name here too
        .eq("id", itineraryId)
        .eq("user_id", userId)
        .maybeSingle();

    if (ownerError) {
        console.error("Error verifying itinerary ownership in server component:", ownerError.message);
        return null;
    }
    if (!ownerCheck) {
        return null; // Not found or not owned
    }

    // Fetch days
    const { data: days, error: daysError } = await supabase
        .from("itinerary_days")
        .select("id, day_number")
        .eq("itinerary_id", itineraryId)
        .order("day_number");

    if (daysError) {
        console.error("Error fetching days:", daysError.message);
        return { id: itineraryId, name: ownerCheck.name, days: [] }; // Return with empty days on error
    }

    if (!days || days.length === 0) {
         return { id: itineraryId, name: ownerCheck.name, days: [] };
    }

    // Fetch locations for days
    const dayIds = days.map(day => day.id);
    const { data: itineraryLocations, error: locationsError } = await supabase
        .from("itinerary_locations")
        .select("day_id, location_id, position")
        .in("day_id", dayIds)
        .order("position");

    if (locationsError) {
         console.error("Error fetching itinerary locations:", locationsError.message);
         // Return with empty locations for days on error
         return { id: itineraryId, name: ownerCheck.name, days: days.map(d => ({ id: d.day_number, locations: [] })) };
    }

    // Fetch location details
    const locationIds = Array.from(new Set(itineraryLocations?.map(item => item.location_id) || []));
    let locationMap = new Map<string, LocationData>();

    if (locationIds.length > 0) {
        const { data: locationsData, error: fullLocationsError } = await supabase
            .from("locations")
            .select(`id, name, description, latitude, longitude, images, categories!inner(name)`)
            .in("id", locationIds);

        if (fullLocationsError) {
            console.error("Error fetching location details:", fullLocationsError.message);
             // Proceed with empty map, locations will be missing
        } else {
            locationsData?.forEach(location => {
                // Safely access category name (FIX APPLIED HERE)
                const categoryName = (Array.isArray(location.categories) && location.categories.length > 0)
                    ? location.categories[0].name
                    : (location.categories && typeof location.categories === 'object' && 'name' in location.categories)
                        ? (location.categories as { name: string }).name
                        : 'Unknown';

                locationMap.set(location.id, {
                    id: location.id,
                    name: location.name,
                    description: location.description,
                    category: categoryName, // Use the safe variable
                    coordinates: [location.latitude, location.longitude] as [number, number],
                    images: Array.isArray(location.images) ? location.images : JSON.parse(location.images || '[]')
                });
            });
        }
    }

    // Assemble final structure
    const assembledDays = days.map(day => {
        const dayLocations = itineraryLocations
            ?.filter(item => item.day_id === day.id)
            .map(item => locationMap.get(item.location_id))
            .filter((loc): loc is LocationData => !!loc); // Type guard

        return {
            id: day.day_number,
            locations: dayLocations || []
        };
    });

    return { id: itineraryId, name: ownerCheck.name, days: assembledDays };
}


export default async function SpecificPlannerPage({ params }: { params: { id: string } }) {
    const itineraryId = parseInt(params.id, 10);

    if (isNaN(itineraryId)) {
        notFound();
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?message=Please log in to view your itinerary&redirectTo=/planner/${itineraryId}`);
    }

    const [locations, categories, itineraryDetails] = await Promise.all([
        getLocations(),
        getCategories(),
        getItineraryDetails(supabase, itineraryId, user.id)
    ]);

    if (!itineraryDetails) {
        notFound();
    }

    return (
        <div className="flex flex-col h-screen">
             <div className="sticky top-0 z-50 w-full bg-white">
                 <Header />
             </div>
             <div className="flex-1 overflow-hidden">
                 <PageClient>
                     <PlannerClient
                         itineraryId={itineraryId}
                         initialItineraryData={itineraryDetails.days}
                         itineraryName={itineraryDetails.name} // Pass the name as a prop
                         initialLocations={locations}
                         categories={categories}
                     />
                 </PageClient>
             </div>
        </div>
    );
}

// Optional: Metadata generation (keep as is)
export async function generateMetadata({ params }: { params: { id: string } }) {
    const itineraryId = parseInt(params.id, 10);
    if (isNaN(itineraryId)) return { title: "Planner" };

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let itineraryName = "My Itinerary";

    if (user) {
        const { data } = await supabase
            .from("user_itineraries")
            .select("name")
            .eq("id", itineraryId)
            .eq("user_id", user.id)
            .single();
        if (data) {
            itineraryName = data.name;
        }
    }

    return {
      title: `${itineraryName} - Planner`,
      description: `Plan your trip for ${itineraryName}.`,
    };
}