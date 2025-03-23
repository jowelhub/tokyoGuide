"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { MAP_CONFIG } from "@/lib/constants"
import { markerIcon } from "@/components/map/marker-icon"
import { MapController } from "@/components/map/map-controller"
import type { MapViewProps } from "@/lib/types"

export default function MapView({ locations, onLocationSelect, selectedLocation }: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>
  }

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={MAP_CONFIG.defaultCenter}
        zoom={MAP_CONFIG.defaultZoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution={MAP_CONFIG.attribution}
          url={MAP_CONFIG.tileLayerUrl}
        />
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={location.coordinates}
            icon={markerIcon}
            eventHandlers={{
              click: () => onLocationSelect(location),
            }}
          >
            <Tooltip 
              direction="top"
              className="custom-tooltip"
              offset={[0, -8]}
            >
              <div className="bg-white px-2 py-1 rounded shadow-sm">
                <span className="font-medium text-sm">{location.name}</span>
              </div>
            </Tooltip>
          </Marker>
        ))}
        <MapController selectedLocation={selectedLocation} />
      </MapContainer>
    </div>
  )
}