"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import type { LocationData } from "@/lib/types"

interface MapControllerProps {
  selectedLocation: LocationData | null
}

export function MapController({ selectedLocation }: MapControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (selectedLocation) {
      const currentZoom = map.getZoom()
      map.setView(selectedLocation.coordinates, currentZoom, {
        animate: true,
        duration: 0.5,
      })
    }
  }, [selectedLocation, map])

  return null
}