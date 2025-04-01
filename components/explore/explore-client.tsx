"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import CategoryFilter from "../category-filter"
import ListView from "./explore-list-view"
import EmptyState from "../empty-state"
import { MapIcon, ListBulletIcon } from "@heroicons/react/24/outline"
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import Link from "next/link"
import Image from "next/image"
import { generateMarkerIcon } from "@/lib/marker-icon"
import L from "leaflet"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("../map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

interface ExploreClientProps {
  initialLocations: LocationData[]
  categories: CategoryData[]
}

export default function ExploreClient({ initialLocations, categories }: ExploreClientProps) {
  const { isLoggedIn } = useAuth();
  const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites();
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
  const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [mobileView, setMobileView] = useState<"map" | "list">("map") // Default to map view on mobile
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const getExploreMarkerIcon = (location: LocationData, isHovered: boolean): L.DivIcon => {
    return generateMarkerIcon(isHovered) ?? new L.DivIcon();
  };

  // Function to refresh favorites - will be passed to child components
  const refreshFavorites = async () => {
    await fetchFavorites();
    
    // If we're showing only favorites, we need to update the filtered locations immediately
    if (showOnlyFavorites) {
      // Apply both favorites and category filters
      const newFilteredLocations = initialLocations.filter(location => 
        userFavorites.includes(location.id) && 
        (selectedCategories.length === 0 || selectedCategories.includes(location.category))
      );
      setFilteredLocations(newFilteredLocations);
    }
  };

  // Apply filters whenever selectedCategories or showOnlyFavorites changes
  useEffect(() => {
    let newFilteredLocations = initialLocations;
    
    // Apply category filter if any categories are selected
    if (selectedCategories.length > 0) {
      newFilteredLocations = newFilteredLocations.filter(location => 
        selectedCategories.includes(location.category)
      );
    }
    
    // Apply favorites filter if showOnlyFavorites is true
    if (showOnlyFavorites) {
      newFilteredLocations = newFilteredLocations.filter(location => 
        userFavorites.includes(location.id)
      );
    }
    
    setFilteredLocations(newFilteredLocations);
  }, [initialLocations, selectedCategories, showOnlyFavorites, userFavorites]);

  const handleFilterChange = (selectedCategories: string[]) => {
    setSelectedCategories(selectedCategories);
    let newFilteredLocations = initialLocations;
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      // Convert selected categories to lowercase for case-insensitive comparison
      const lowerCaseSelectedCategories = selectedCategories.map(cat => cat.toLowerCase());
      
      newFilteredLocations = newFilteredLocations.filter((location) => 
        lowerCaseSelectedCategories.includes(location.category.toLowerCase())
      );
    }
    
    // Apply favorites filter if enabled
    if (showOnlyFavorites && userFavorites.length > 0) {
      newFilteredLocations = newFilteredLocations.filter((location) => 
        userFavorites.includes(location.id)
      );
    }
    
    setFilteredLocations(newFilteredLocations);
  }

  const handleFavoritesFilterChange = (showFavorites: boolean) => {
    setShowOnlyFavorites(showFavorites);
    
    let newFilteredLocations = initialLocations;
    
    // Apply favorites filter
    if (showFavorites && userFavorites.length > 0) {
      newFilteredLocations = newFilteredLocations.filter((location) => 
        userFavorites.includes(location.id)
      );
    }
    
    setFilteredLocations(newFilteredLocations);
  }

  const handleLocationHover = (location: LocationData | null) => {
    setHoveredLocation(location)
  }

  const handleViewportChange = (locationsInViewport: LocationData[]) => {
    setVisibleLocations(locationsInViewport)
  }

  const toggleMobileView = () => {
    setMobileView(mobileView === "map" ? "list" : "map")
  }

  // Filter visible locations based on favorites if needed
  const getVisibleLocations = () => {
    if (showOnlyFavorites && userFavorites.length > 0) {
      return visibleLocations.filter(location => 
        userFavorites.includes(location.id)
      );
    }
    return visibleLocations;
  }

  // Function to render popup content for the Explore view
  const renderExplorePopupContent = ({ 
    location, 
    isLoggedIn, 
    isFavorited, 
    toggleFavorite, 
    isLoadingFavorite, 
    onClosePopup,
    refreshFavorites 
  }: import("../map-view").PopupContentProps) => {
    return (
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
            onClosePopup();
          }}
        >
          <XMarkIcon className="w-5 h-5 text-gray-700" />
        </div>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!isLoggedIn) {
                  // Redirect to login if not logged in
                  window.open('/login', '_blank');
                  return;
                }
                
                if (isLoadingFavorite[location.id]) return;
                
                // Toggle favorite status
                toggleFavorite(location.id).then(success => {
                  // Then refresh parent component state if needed
                  if (success && refreshFavorites) {
                    refreshFavorites();
                  }
                  
                  // Close popup if removing a favorite in favorites-only mode
                  if (success && !isFavorited(location.id) && document.querySelector('[data-favorites-filter="true"]')) {
                    onClosePopup();
                  }
                });
              }}
              title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
            >
              {isFavorited(location.id) ? 
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
      </Link>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Mobile: Toggle between map and list views */}
      {isMobile ? (
        <div className="h-full relative flex flex-col">
          {/* Map View */}
          {mobileView === "map" && (
            <>
              <div className="flex-1 relative">
                <div className="absolute top-2 left-2 z-10">
                  <CategoryFilter 
                    categories={categories.map(cat => cat.name)} 
                    onFilterChange={handleFilterChange}
                    onFavoritesFilterChange={handleFavoritesFilterChange}
                    refreshFavorites={refreshFavorites}
                  />
                </div>
                <MapView
                  locations={filteredLocations}
                  onLocationHover={handleLocationHover}
                  hoveredLocation={hoveredLocation}
                  onViewportChange={handleViewportChange}
                  refreshFavorites={refreshFavorites}
                  renderPopupContent={(props) => renderExplorePopupContent({
                    ...props,
                    isLoggedIn,
                    isFavorited,
                    toggleFavorite,
                    isLoadingFavorite
                  })}
                  getMarkerIcon={getExploreMarkerIcon}
                />
              </div>
              
              {/* Button to switch to list view at the bottom */}
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <button 
                  onClick={toggleMobileView}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border"
                >
                  <ListBulletIcon className="h-5 w-5" />
                  <span>Show list ({getVisibleLocations().length} places)</span>
                </button>
              </div>
            </>
          )}

          {/* List View */}
          {mobileView === "list" && (
            <>
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Button to switch to map view at the top */}
                <div className="sticky top-0 z-10 p-2 bg-white border-b flex justify-center">
                  <button 
                    onClick={toggleMobileView}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border"
                  >
                    <MapIcon className="h-5 w-5" />
                    <span>Show map</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {getVisibleLocations().length > 0 ? (
                    <ListView
                      locations={getVisibleLocations()}
                      onLocationHover={handleLocationHover}
                      hoveredLocation={hoveredLocation}
                      refreshFavorites={refreshFavorites}
                      userFavorites={userFavorites}
                    />
                  ) : (
                    <EmptyState message="No locations in current view. Try zooming out or changing filters." />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Desktop: Side by side layout (60% list, 40% map) */
        <div className="flex-1 flex flex-row overflow-hidden h-full">
          {/* Left side: Scrollable list of locations (60% on desktop) */}
          <div className="w-[60%] h-full flex flex-col overflow-hidden border-r">
            <div className="flex-1 overflow-y-auto h-screen">
              {getVisibleLocations().length > 0 ? (
                <ListView
                  locations={getVisibleLocations()}
                  onLocationHover={handleLocationHover}
                  hoveredLocation={hoveredLocation}
                  refreshFavorites={refreshFavorites}
                  userFavorites={userFavorites}
                />
              ) : (
                <EmptyState message="No locations in current view. Try zooming out or changing filters." />
              )}
            </div>
          </div>

          {/* Right side: Fixed map (40% on desktop) with filters at the top-left */}
          <div className="w-[40%] h-full relative">
            <div className="absolute top-2 left-2 z-10">
              <CategoryFilter 
                categories={categories.map(cat => cat.name)} 
                onFilterChange={handleFilterChange}
                onFavoritesFilterChange={handleFavoritesFilterChange}
                refreshFavorites={refreshFavorites}
              />
            </div>
            <MapView
              locations={filteredLocations}
              onLocationHover={handleLocationHover}
              hoveredLocation={hoveredLocation}
              onViewportChange={handleViewportChange}
              refreshFavorites={refreshFavorites}
              renderPopupContent={(props) => renderExplorePopupContent({
                ...props,
                isLoggedIn,
                isFavorited,
                toggleFavorite,
                isLoadingFavorite
              })}
              getMarkerIcon={getExploreMarkerIcon}
            />
          </div>
        </div>
      )}
    </div>
  )
}
