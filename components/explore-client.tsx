"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import { CATEGORIES } from "@/lib/constants"
import CategoryFilter from "@/components/category-filter"
import ViewToggle from "@/components/view-toggle"
import LocationDetail from "@/components/location-detail"
import ListView from "@/components/list-view"
import EmptyState from "@/components/empty-state"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

interface ExploreClientProps {
  initialLocations: LocationData[]
  initialSelectedLocationId?: string
}

export default function ExploreClient({ initialLocations, initialSelectedLocationId }: ExploreClientProps) {
  const pathname = usePathname()
  const [view, setView] = useState<"map" | "list">("map")
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initialSelectedLocationId || null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Memoize the selected location to prevent unnecessary re-renders
  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return initialLocations.find(loc => loc.id === selectedLocationId) || null;
  }, [selectedLocationId, initialLocations]);
  
  // Update URL when selected location changes - using a minimal approach
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const basePath = '/explore';
    const newPath = selectedLocationId ? `${basePath}/${selectedLocationId}` : basePath;
    
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [selectedLocationId]);

  const handleFilterChange = (selectedCategories: string[]) => {
    if (selectedCategories.length === 0) {
      setFilteredLocations(initialLocations)
    } else {
      setFilteredLocations(
        initialLocations.filter((location) =>
          selectedCategories.some((category) => location.category.toLowerCase() === category.toLowerCase())
        )
      )
    }
  }

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocationId(location.id);
  }

  const handleCloseDetail = () => {
    setSelectedLocationId(null);
  }

  // Memoize these components to prevent unnecessary re-renders
  const detailView = useMemo(() => (
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
  ), [selectedLocation, isMobile]);

  const exploreView = useMemo(() => (
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
  ), [filteredLocations, view, selectedLocation, isMobile]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {detailView}
      {exploreView}
    </div>
  )
}
