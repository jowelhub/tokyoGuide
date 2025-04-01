"use client"

import React, { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MAP_CONFIG, MARKER_CONFIG } from "@/lib/constants"
import { createMarkerSvg } from "@/lib/marker-icon"
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
    if (!map) return
    const bounds = map.getBounds()
    const visibleLocations = locations.filter(location => 
      bounds.contains(location.coordinates)
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
export interface GenericMapViewProps extends Omit<MapViewProps, 'getMarkerIcon'> {
  renderPopupContent: (props: PopupContentProps) => React.ReactNode
  categories?: string[]
  onFilterChange?: (selectedCategories: string[]) => void
  onFavoritesFilterChange?: (showOnlyFavorites: boolean) => void
  onAddToDay?: (location: LocationData) => void
  locations: LocationData[]
  hoveredLocation: LocationData | null // Removed the '?' to match the base interface
  locationToDayMap?: Map<string, number> // New prop for planner view
}

export default function MapView({ 
  locations, 
  onLocationHover, 
  hoveredLocation,
  onViewportChange,
  refreshFavorites,
  renderPopupContent,
  locationToDayMap
}: GenericMapViewProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Internal helper function to generate icons (moved from lib/marker-icon.ts)
  const generateInternalMarkerIcon = (isHovered: boolean, dayNumber?: number): L.DivIcon => {
    const isPlanner = dayNumber !== undefined;
    const baseSize = MARKER_CONFIG.defaultSize;
    const size = isHovered ? Math.floor(baseSize * MARKER_CONFIG.highlightScale) : baseSize;
    
    // Determine color based on marker type and hover state
    let color: string;
    if (isPlanner) {
      // Planner markers use orange colors
      color = isHovered ? MARKER_CONFIG.plannerHighlightColor : MARKER_CONFIG.plannerColor;
    } else {
      // Default markers use blue colors
      color = isHovered ? MARKER_CONFIG.defaultHighlightColor : MARKER_CONFIG.defaultColor;
    }

    // Generate SVG HTML
    const svgMarkup = createMarkerSvg(size, color, dayNumber);
    
    // Calculate anchors based on size and configurable ratio
    const iconAnchor: [number, number] = [size / 2, size * MARKER_CONFIG.anchorRatioY]; 
    const popupAnchor: [number, number] = [0, -size * 0.09]; 
    const tooltipAnchor: [number, number] = [0, -size * 0.73];
    
    return new L.DivIcon({
      html: svgMarkup,
      className: isHovered ? 'custom-marker-icon-highlighted' : 'custom-marker-icon',
      iconSize: [size, size],
      iconAnchor,
      popupAnchor,
      tooltipAnchor
    });
  }
  
  // Debug function to check for invalid locations
  useEffect(() => {
    const invalidLocations = locations.filter(loc => 
      !loc.coordinates || loc.coordinates.length !== 2
    );
    
    if (invalidLocations.length > 0) {
      console.warn('Found invalid locations:', invalidLocations);
    }
  }, [locations]);

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
        {locations.map((location) => {
          // Determine hover state and day number
          const isHovered = hoveredLocation?.id === location.id;
          const dayNumber = locationToDayMap?.get(location.id);
          
          // Generate icon internally
          const icon = generateInternalMarkerIcon(isHovered, dayNumber);
          
          return (
            <Marker
              key={location.id}
              position={location.coordinates}
              icon={icon}
              eventHandlers={{
                mouseover: () => {
                  if (onLocationHover) {
                    onLocationHover(location);
                  }
                },
                mouseout: () => {
                  if (onLocationHover && hoveredLocation?.id === location.id) {
                    onLocationHover(null);
                  }
                },
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
          );
        })}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
      </MapContainer>
    </div>
  )
}
