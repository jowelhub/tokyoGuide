"use client"

import React, { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { MAP_CONFIG } from "@/lib/constants"
import { markerIcon, highlightedMarkerIcon } from "@/lib/marker-icon"
import type { LocationData, MapViewProps } from "@/lib/types"

// Custom styles for Leaflet popups - we'll add this to override default Leaflet styles
const customPopupStyles = `
  .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    width: 320px !important;
  }
  .leaflet-popup-content {
    margin: 0;
    width: 100% !important;
  }
  .leaflet-popup-tip {
    display: none;
  }
  .leaflet-popup-close-button {
    display: none;
  }
  .airbnb-popup-close {
    position: absolute;
    right: 8px;
    top: 8px;
    background: #FFFFFF;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .airbnb-popup-heart {
    position: absolute;
    left: 8px;
    top: 8px;
    background: #FFFFFF;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .airbnb-popup-add {
    position: absolute;
    right: 8px;
    top: 8px;
    background: #FFFFFF;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .airbnb-popup-content {
    width: 100%;
  }
  .airbnb-popup-image-container {
    position: relative;
    width: 100%;
    height: 180px;
  }
  .airbnb-popup-details {
    padding: 12px;
  }
  .airbnb-popup-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 1px;
    color: #222;
  }
  .airbnb-popup-description {
    font-size: 14px;
    color: #717171;
    margin-bottom: 2px;
    line-height: 1.2;
  }
  .airbnb-popup-category {
    display: inline-block;
    font-size: 14px;
    font-weight: 400;
    color: #717171;
  }
`;

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

// Define PopupContentProps interface
export interface PopupContentProps {
  location: LocationData
  isLoggedIn: boolean
  isFavorited: (locationId: string) => boolean
  toggleFavorite: (locationId: string) => Promise<boolean>
  isLoadingFavorite: Record<string, boolean>
  onAddToDay?: (location: LocationData) => void
  onClosePopup: () => void
  refreshFavorites?: () => Promise<void>
}

// Extended MapViewProps interface with renderPopupContent
export interface GenericMapViewProps extends MapViewProps {
  renderPopupContent: (props: PopupContentProps) => React.ReactNode
  categories?: string[]
  onFilterChange?: (selectedCategories: string[]) => void
  onFavoritesFilterChange?: (showOnlyFavorites: boolean) => void
  onAddToDay?: (location: LocationData) => void
}

export default function MapView({ 
  locations, 
  onLocationHover, 
  hoveredLocation,
  onViewportChange,
  refreshFavorites,
  renderPopupContent
}: GenericMapViewProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Add custom styles to the document head
    const styleEl = document.createElement('style');
    styleEl.textContent = customPopupStyles;
    document.head.appendChild(styleEl);
    
    return () => {
      styleEl.remove();
    }
  }, [])

  const handleClosePopup = () => {
    // Find and close the Leaflet popup by simulating a click on the default close button
    const closeButton = document.querySelector('.leaflet-popup-close-button') as HTMLElement;
    if (closeButton) {
      closeButton.click();
    }
  };

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
            <Popup closeButton={true} autoPan={false} offset={[0, -23]}>
              {renderPopupContent({
                location,
                isLoggedIn: false, // This will be overridden by the actual implementation
                isFavorited: () => false, // This will be overridden by the actual implementation
                toggleFavorite: async () => false, // This will be overridden by the actual implementation
                isLoadingFavorite: {},
                onClosePopup: handleClosePopup,
                refreshFavorites
              })}
            </Popup>
          </Marker>
        ))}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
      </MapContainer>
    </div>
  )
}
