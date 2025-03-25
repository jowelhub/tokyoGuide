"use client"

import { useState, useCallback } from "react"
import type { LocationData } from "@/lib/types"
import type { LatLngBounds } from "leaflet"

export function useMapViewport() {
  const [visibleLocations, setVisibleLocations] = useState<LocationData[]>([])

  const updateVisibleLocations = useCallback((bounds: LatLngBounds, locations: LocationData[]) => {
    const inViewport = locations.filter(location => 
      bounds.contains([location.coordinates[0], location.coordinates[1]])
    )
    setVisibleLocations(inViewport)
    return inViewport
  }, [])

  const handleViewportChange = useCallback((locationsInViewport: LocationData[]) => {
    setVisibleLocations(locationsInViewport)
  }, [])

  return {
    visibleLocations,
    updateVisibleLocations,
    handleViewportChange
  }
}
