"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet"
import Link from "next/link"
import Image from "next/image"
import "leaflet/dist/leaflet.css"
import { MAP_CONFIG } from "@/lib/constants"
import { markerIcon, highlightedMarkerIcon } from "@/components/map/marker-icon"
import type { MapViewProps } from "@/lib/types"

// Component to handle viewport changes and update visible locations
function ViewportHandler({ 
  locations, 
  onViewportChange 
}: { 
  locations: MapViewProps['locations'], 
  onViewportChange: MapViewProps['onViewportChange'] 
}) {
  const map = useMapEvents({
    moveend: () => updateVisibleLocations(),
    zoomend: () => updateVisibleLocations(),
  })

  const updateVisibleLocations = () => {
    const bounds = map.getBounds()
    const visibleLocations = locations.filter(location => 
      bounds.contains([location.coordinates[0], location.coordinates[1]])
    )
    onViewportChange(visibleLocations)
  }

  // Initialize visible locations on mount
  useEffect(() => {
    updateVisibleLocations()
  }, [locations])

  return null
}

export default function MapView({ 
  locations, 
  onLocationHover, 
  hoveredLocation,
  onViewportChange 
}: MapViewProps) {
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
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution={MAP_CONFIG.attribution}
          url={MAP_CONFIG.tileLayerUrl}
        />
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={location.coordinates}
            icon={hoveredLocation?.id === location.id ? highlightedMarkerIcon : markerIcon}
            eventHandlers={{
              mouseover: () => onLocationHover(location),
              mouseout: () => onLocationHover(null),
            }}
          >
            <Popup>
              <Link 
                href={`/location/${location.id}`}
                target="_blank"
                className="block w-48"
              >
                <div className="relative h-24 mb-2">
                  <Image
                    src={location.images[0] || "/placeholder.svg"}
                    alt={location.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <h3 className="font-medium text-sm">{location.name}</h3>
                <p className="text-xs text-gray-600 line-clamp-1">{location.description}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                  {location.category}
                </span>
              </Link>
            </Popup>
          </Marker>
        ))}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
      </MapContainer>
    </div>
  )
}