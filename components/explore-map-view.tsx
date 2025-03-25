"use client"

import React, { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet"
import Link from "next/link"
import Image from "next/image"
import "leaflet/dist/leaflet.css"
import { MAP_CONFIG } from "@/lib/constants"
import { markerIcon, highlightedMarkerIcon } from "@/lib/marker-icon"
import type { MapViewProps } from "@/lib/types"
import { XMarkIcon, HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { toggleFavorite, getUserFavorites } from "@/lib/supabase/favorites"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"

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

// Custom popup component with Airbnb styling
function AirbnbStylePopup({ 
  location, 
  refreshFavorites 
}: { 
  location: MapViewProps['locations'][0],
  refreshFavorites?: () => Promise<void>
}) {
  const { isLoggedIn } = useAuth();
  const { toggleFavorite, isFavorited: checkIsFavorited, isLoading } = useFavorites();
  const [isFavorited, setIsFavorited] = useState(false);
  
  // Check if this location is favorited
  useEffect(() => {
    setIsFavorited(checkIsFavorited(location.id));
  }, [location.id, checkIsFavorited]);

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      // Redirect to login if not logged in
      window.open('/login', '_blank');
      return;
    }
    
    if (isLoading[location.id]) return;
    
    // Toggle favorite status
    const success = await toggleFavorite(location.id);
    
    if (success) {
      // Update local state for immediate feedback
      setIsFavorited(!isFavorited);
      
      // Then refresh parent component state if needed
      if (refreshFavorites) {
        await refreshFavorites();
      }
      
      // Close popup if removing a favorite in favorites-only mode
      if (!isFavorited && document.querySelector('[data-favorites-filter="true"]')) {
        const closeButton = document.querySelector('.leaflet-popup-close-button') as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    }
  };

  return (
    <div className="airbnb-popup-content">
      <div className="relative w-full h-0 pb-[56.25%]">
        <Image
          src={location.images[0] || "/placeholder.svg"}
          alt={location.name}
          fill
          className="object-cover"
        />
        <div 
          className="airbnb-popup-heart" 
          onClick={handleHeartClick}
          title={isLoggedIn ? (isFavorited ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
        >
          {isFavorited ? 
            <HeartSolid className="w-5 h-5 text-red-500" /> : 
            <HeartOutline className="w-5 h-5 text-gray-700" />
          }
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-lg truncate text-gray-900">{location.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
            {location.category}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MapView({ 
  locations, 
  onLocationHover, 
  hoveredLocation,
  onViewportChange,
  refreshFavorites
}: MapViewProps) {
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

  const handleClosePopup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
              <Link 
                href={`/location/${location.id}`}
                target="_blank"
                className="block relative"
              >
                <div 
                  className="airbnb-popup-close"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClosePopup(e);
                  }}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-700" />
                </div>
                <AirbnbStylePopup location={location} refreshFavorites={refreshFavorites} />
              </Link>
            </Popup>
          </Marker>
        ))}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
      </MapContainer>
    </div>
  )
}