"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import CategoryFilter from "@/components/category-filter"
import ListView from "@/components/list-view"
import EmptyState from "@/components/empty-state"
import { MapIcon, ListBulletIcon } from "@heroicons/react/24/outline"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

interface ExploreClientProps {
  initialLocations: LocationData[]
  categories: CategoryData[]
}

export default function ExploreClient({ initialLocations, categories }: ExploreClientProps) {
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
  const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [mobileView, setMobileView] = useState<"map" | "list">("map") // Default to map view on mobile

  const handleFilterChange = (selectedCategories: string[]) => {
    if (selectedCategories.length === 0) {
      setFilteredLocations(initialLocations)
    } else {
      // Convert selected categories to lowercase for case-insensitive comparison
      const lowerCaseSelectedCategories = selectedCategories.map(cat => cat.toLowerCase())
      
      setFilteredLocations(
        initialLocations.filter((location) => 
          lowerCaseSelectedCategories.includes(location.category.toLowerCase())
        )
      )
    }
  }

  const handleLocationHover = (location: LocationData | null) => {
    setHoveredLocation(location)
  }

  const handleViewportChange = (locationsInViewport: LocationData[]) => {
    setVisibleLocations(locationsInViewport)
  }

  const toggleMobileView = () => {
    setMobileView(mobileView === "map" ? "list" : "map")
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Mobile: Toggle between map and list views */}
      {isMobile ? (
        <div className="h-full relative flex flex-col">
          {/* Map View */}
          {mobileView === "map" && (
            <>
              <div className="flex-1 relative">
                <div className="absolute top-2 left-2 z-10">
                  <CategoryFilter 
                    categories={categories.map(cat => cat.name)} 
                    onFilterChange={handleFilterChange} 
                  />
                </div>
                <MapView
                  locations={filteredLocations}
                  onLocationHover={handleLocationHover}
                  hoveredLocation={hoveredLocation}
                  onViewportChange={handleViewportChange}
                />
              </div>
              
              {/* Button to switch to list view at the bottom */}
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <button 
                  onClick={toggleMobileView}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border"
                >
                  <ListBulletIcon className="h-5 w-5" />
                  <span>Show list ({visibleLocations.length} places)</span>
                </button>
              </div>
            </>
          )}

          {/* List View */}
          {mobileView === "list" && (
            <>
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Button to switch to map view at the top */}
                <div className="sticky top-0 z-10 p-2 bg-white border-b flex justify-center">
                  <button 
                    onClick={toggleMobileView}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border"
                  >
                    <MapIcon className="h-5 w-5" />
                    <span>Show map</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {visibleLocations.length > 0 ? (
                    <ListView
                      locations={visibleLocations}
                      onLocationHover={handleLocationHover}
                      hoveredLocation={hoveredLocation}
                    />
                  ) : (
                    <EmptyState message="No locations in current view. Try zooming out or changing filters." />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Desktop: Side by side layout (60% list, 40% map) */
        <div className="flex-1 flex flex-row overflow-hidden h-full">
          {/* Left side: Scrollable list of locations (60% on desktop) */}
          <div className="w-[60%] h-full flex flex-col overflow-hidden border-r">
            <div className="flex-1 overflow-y-auto">
              {visibleLocations.length > 0 ? (
                <ListView
                  locations={visibleLocations}
                  onLocationHover={handleLocationHover}
                  hoveredLocation={hoveredLocation}
                />
              ) : (
                <EmptyState message="No locations in current view. Try zooming out or changing filters." />
              )}
            </div>
          </div>

          {/* Right side: Fixed map (40% on desktop) with filters at the top-left */}
          <div className="w-[40%] h-full relative">
            <div className="absolute top-2 left-2 z-10">
              <CategoryFilter 
                categories={categories.map(cat => cat.name)} 
                onFilterChange={handleFilterChange} 
              />
            </div>
            <MapView
              locations={filteredLocations}
              onLocationHover={handleLocationHover}
              hoveredLocation={hoveredLocation}
              onViewportChange={handleViewportChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
