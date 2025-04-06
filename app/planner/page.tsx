import { getLocations } from "@/lib/supabase/locations"
import { getCategories } from "@/lib/supabase/categories"
import Header from "@/components/layout/header"
import PlannerClient from "@/components/planner/planner-client"

export default async function PlannerPage() {
  // Fetch locations and categories from Supabase
  const [locations, categories] = await Promise.all([
    getLocations(),
    getCategories()
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="sticky top-0 z-50 w-full bg-white"> {/* Use modal/sticky header level */}
        <Header />
      </div>
      <div className="flex-1 overflow-hidden">
        <PlannerClient initialLocations={locations} categories={categories} />
      </div>
    </div>
  )
}