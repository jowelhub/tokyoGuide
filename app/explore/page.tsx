"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import { locations } from "@/lib/data"
import { CATEGORIES, Category } from "@/lib/constants"
import CategoryFilter from "@/components/category-filter"
import ViewToggle from "@/components/view-toggle"
import LocationDetail from "@/components/location-detail"
import ListView from "@/components/list-view"
import EmptyState from "@/components/empty-state"
import Header from "@/components/layout/header"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

export default function ExplorePage() {
  const [view, setView] = useState<"map" | "list">("map")
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(locations)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const handleFilterChange = (selectedCategories: string[]) => {
    if (selectedCategories.length === 0) {
      setFilteredLocations(locations)
    } else {
      setFilteredLocations(
        locations.filter((location) =>
          selectedCategories.some((category) => location.category.toLowerCase() === category.toLowerCase())
        )
      )
    }
  }

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location)
  }

  const handleCloseDetail = () => {
    setSelectedLocation(null)
  }

  const renderDetailView = () => (
    <div
      className={`${
        isMobile && !selectedLocation ? "hidden" : "flex"
      } flex-col w-full md:w-1/2 border-r overflow-hidden`}
    >
      {selectedLocation ? (
        <LocationDetail
          location={selectedLocation}
          onClose={isMobile ? handleCloseDetail : undefined}
          isMobile={isMobile}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  )

  const renderExploreView = () => (
    <div
      className={`${
        isMobile && selectedLocation ? "hidden" : "flex"
      } flex-col w-full md:w-1/2 h-full overflow-hidden`}
    >
      <div className="border-b flex-shrink-0 p-2 flex items-center justify-between">
        <CategoryFilter 
          categories={Array.from(CATEGORIES)} 
          onFilterChange={handleFilterChange} 
        />
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <div className="flex-1 relative overflow-hidden">
        {view === "map" ? (
          <MapView
            locations={filteredLocations}
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
          />
        ) : (
          <ListView
            locations={filteredLocations}
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {renderDetailView()}
        {renderExploreView()}
      </div>
    </div>
  )
}