"use client"

import { useState, useCallback } from "react"
import type { LocationData } from "@/lib/types"

export function useLocationHover() {
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)

  const handleLocationHover = useCallback((location: LocationData | null) => {
    setHoveredLocation(location)
  }, [])

  return {
    hoveredLocation,
    handleLocationHover
  }
}
