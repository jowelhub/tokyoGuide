import { getLocations } from "@/lib/supabase/locations"
import { getCategories } from "@/lib/supabase/categories"
import Header from "@/components/layout/header"
import ExploreClient from "@/components/explore-client"

export default async function ExplorePage() {
  // Fetch locations and categories from Supabase
  const [locations, categories] = await Promise.all([
    getLocations(),
    getCategories()
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <ExploreClient initialLocations={locations} categories={categories} />
    </div>
  )
}
