import { getLocations } from "@/lib/supabase/locations"
import Header from "@/components/layout/header"
import ExploreClient from "@/components/explore-client"

export default async function ExplorePage() {
  // Fetch locations from Supabase
  const locations = await getLocations()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <ExploreClient initialLocations={locations} />
    </div>
  )
}
