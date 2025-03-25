"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet"
import Image from "next/image"
import "leaflet/dist/leaflet.css"
import { MAP_CONFIG } from "@/lib/constants"
import { markerIcon, highlightedMarkerIcon } from "@/lib/marker-icon"
import type { MapViewProps } from "@/lib/types"
import { XMarkIcon, HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { PlusIcon } from "@heroicons/react/24/solid"
import CategoryFilter from "@/components/category-filter"
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

// Custom popup component with Airbnb styling and add to day button
function PlannerPopup({ 
  location, 
  refreshFavorites,
  onAddToDay
}: { 
  location: MapViewProps['locations'][0],
  refreshFavorites?: () => Promise<void>,
  onAddToDay: (location: MapViewProps['locations'][0]) => void
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
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close the popup
    const closeButton = document.querySelector('.leaflet-popup-close-button') as HTMLElement;
    if (closeButton) {
      closeButton.click();
    }
    
    // Call the onAddToDay function
    onAddToDay(location);
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
          className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" 
          onClick={handleHeartClick}
          title={isLoggedIn ? (isFavorited ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
        >
          {isFavorited ? 
            <HeartSolid className="w-5 h-5 text-red-500" /> : 
            <HeartOutline className="w-5 h-5 text-gray-700" />
          }
        </div>
        <div 
          className="absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Close the popup
            const closeButton = document.querySelector('.leaflet-popup-close-button') as HTMLElement;
            if (closeButton) {
              closeButton.click();
            }
          }}
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-xl text-gray-900">{location.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
            {location.category}
          </span>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={handleAddClick}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add to itinerary</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlannerMapViewProps extends MapViewProps {
  onAddToDay: (location: MapViewProps['locations'][0]) => void
  categories?: string[]
  onFilterChange?: (selectedCategories: string[]) => void
  onFavoritesFilterChange?: (showOnlyFavorites: boolean) => void
}

export default function PlannerMapView({ 
  locations, 
  onLocationHover, 
  hoveredLocation,
  onViewportChange,
  refreshFavorites,
  onAddToDay,
  categories = [],
  onFilterChange,
  onFavoritesFilterChange
}: PlannerMapViewProps) {
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
      {/* Filter button */}
      {categories.length > 0 && onFilterChange && (
        <div className="absolute top-2 left-2 z-[1000]">
          <CategoryFilter 
            categories={categories} 
            onFilterChange={onFilterChange}
            onFavoritesFilterChange={onFavoritesFilterChange}
            refreshFavorites={refreshFavorites}
          />
        </div>
      )}
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
            <Popup autoPan={false}>
              <PlannerPopup 
                location={location} 
                refreshFavorites={refreshFavorites}
                onAddToDay={onAddToDay}
              />
            </Popup>
          </Marker>
        ))}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
      </MapContainer>
    </div>
  )
}