import { getLocations } from "@/lib/supabase/locations"
import { redirect } from "next/navigation"
import Header from "@/components/layout/header"
import ExploreClient from "@/components/explore-client"

export default async function ExploreSlugPage({
  params,
}: {
  params: { slug: string }
}) {
  // Fetch locations from Supabase
  const locations = await getLocations()
  
  // Find the location with the matching slug
  const selectedLocation = locations.find((loc) => loc.id === params.slug)
  
  // If no matching location is found, redirect to the main explore page
  if (!selectedLocation) {
    redirect("/explore")
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <ExploreClient 
        initialLocations={locations} 
        initialSelectedLocationId={params.slug} 
      />
    </div>
  )
}
