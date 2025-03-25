import { getLocations } from "@/lib/supabase/locations"
import { getCategories } from "@/lib/supabase/categories"
import Header from "@/components/layout/header"
import ExploreClient from "@/components/explore/explore-client"

export default async function ExplorePage() {
  // Fetch locations and categories from Supabase
  const [locations, categories] = await Promise.all([
    getLocations(),
    getCategories()
  ]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ExploreClient initialLocations={locations} categories={categories} />
      </div>
    </div>
  )
}
