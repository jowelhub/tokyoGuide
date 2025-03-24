"use client"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from "react-leaflet"
import Link from "next/link"
import Image from "next/image"
import "leaflet/dist/leaflet.css"
import { MAP_CONFIG } from "@/lib/constants"
import { markerIcon, highlightedMarkerIcon } from "@/components/map/marker-icon"
import type { MapViewProps } from "@/lib/types"
import { XMarkIcon, HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { toggleFavorite, getUserFavorites } from "@/lib/supabase/favorites"
import { createClient } from "@/lib/supabase/client"

// Custom styles for Leaflet popups - we'll add this to override default Leaflet styles
const customPopupStyles = `
  .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    width: 280px !important;
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
function AirbnbStylePopup({ location }: { location: MapViewProps['locations'][0] }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      if (user) {
        // Check if this location is favorited
        try {
          const { data } = await supabase
            .from("user_favorites")
            .select("id")
            .eq("user_id", user.id)
            .eq("location_id", location.id)
            .single();
          
          setIsFavorited(!!data);
        } catch (error) {
          // If error, assume not favorited
          setIsFavorited(false);
        }
      }
    };
    
    checkAuth();
  }, [location.id, supabase]);

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      // Redirect to login if not logged in
      window.open('/login', '_blank');
      return;
    }
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const newStatus = await toggleFavorite(location.id);
      setIsFavorited(newStatus);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="airbnb-popup-content">
      <div className="airbnb-popup-image-container">
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
      <div className="airbnb-popup-details">
        <h3 className="airbnb-popup-title">{location.name}</h3>
        <p className="airbnb-popup-description line-clamp-2">{location.description}</p>
        <div className="airbnb-popup-category">{location.category}</div>
      </div>
    </div>
  );
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
            <Popup closeButton={true}>
              <div className="relative">
                <div 
                  className="airbnb-popup-close"
                  onClick={handleClosePopup}
                >
                  <XMarkIcon className="w-5 h-5 text-gray-700" />
                </div>
                <Link 
                  href={`/location/${location.id}`}
                  target="_blank"
                  className="block"
                >
                  <AirbnbStylePopup location={location} />
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
      </MapContainer>
    </div>
  )
}