"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import CategoryFilter from "@/components/category-filter"
import DayFilter from "@/components/planner/day-filter"
import ListView from "@/components/planner/planner-list-view"
import EmptyState from "@/components/empty-state"
import { MapIcon, ListBulletIcon, CalendarIcon } from "@heroicons/react/24/outline"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid, PlusIcon } from "@heroicons/react/24/solid"
import DayItinerary from "@/components/planner/planner-day-itinerary"
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
import { useItinerary } from "@/hooks/use-itinerary"
import Image from "next/image"
import { getMarkerIcon, getHighlightedMarkerIcon, createNumberedMarkerIcon } from "@/lib/marker-icon"
import L from "leaflet"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

interface PlannerClientProps {
  initialLocations: LocationData[]
  categories: CategoryData[]
}

// Helper function to get location IDs from selected days
const getLocationsFromSelectedDays = (days: ItineraryDay[], selectedDayIds: number[]): Set<string> => {
  const locationIds = new Set<string>();
  days.forEach(day => {
    if (selectedDayIds.includes(day.id)) {
      day.locations.forEach(loc => locationIds.add(loc.id));
    }
  });
  return locationIds;
};

interface ItineraryDay {
  id: number
  locations: LocationData[]
}

export default function PlannerClient({ initialLocations, categories }: PlannerClientProps) {
  const { isLoggedIn } = useAuth();
  const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites();
  
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
  const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [mobileView, setMobileView] = useState<"map" | "list" | "plan">("map") // Default to map view on mobile
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDayIds, setSelectedDayIds] = useState<number[]>([])
  
  const { 
    days, 
    setDays, 
    addDay, 
    removeDay, 
    addLocationToDay, 
    removeLocationFromDay,
    isLoading: isItineraryLoading,
    isSaving
  } = useItinerary();
  
  // Itinerary state
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [showDaySelector, setShowDaySelector] = useState<boolean>(false)
  const [locationToAdd, setLocationToAdd] = useState<LocationData | null>(null)

  // Create a map of location IDs to day numbers for efficient lookup
  const locationToDayMap = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach(day => {
      day.locations.forEach(loc => {
        map.set(loc.id, day.id);
      });
    });
    return map;
  }, [days]);

  const getPlannerMarkerIcon = (location: LocationData, isHovered: boolean): L.DivIcon => {
    const dayNumber = locationToDayMap.get(location.id);

    if (dayNumber !== undefined) {
      // Location is in the itinerary, use numbered icon
      return createNumberedMarkerIcon(dayNumber, isHovered);
    } else {
      // Location is not in the itinerary, use default icon
      return isHovered ? getHighlightedMarkerIcon() : getMarkerIcon();
    }
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

  // Apply filters whenever selectedCategories, showOnlyFavorites, or selectedDayIds changes
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
    
    // Apply day filter if any days are selected
    if (selectedDayIds.length > 0) {
      const allowedLocationIds = getLocationsFromSelectedDays(days, selectedDayIds);
      newFilteredLocations = newFilteredLocations.filter(location => 
        allowedLocationIds.has(location.id)
      );
    }
    
    setFilteredLocations(newFilteredLocations);
  }, [initialLocations, selectedCategories, showOnlyFavorites, userFavorites, selectedDayIds, days]);

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

  const toggleMobileView = (view: "map" | "list" | "plan") => {
    setMobileView(view)
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

  // Day management functions
  const selectDay = (dayId: number) => {
    setSelectedDay(dayId);
  }

  // Location to day functions
  const showAddToDay = (location: LocationData) => {
    setLocationToAdd(location);
    setShowDaySelector(true);
  }

  const hideAddToDay = () => {
    setShowDaySelector(false);
    setLocationToAdd(null);
  }

  // Function to render popup content for the Planner view
  const renderPlannerPopupContent = ({ 
    location, 
    isLoggedIn, 
    isFavorited, 
    toggleFavorite, 
    isLoadingFavorite, 
    onClosePopup,
    refreshFavorites,
    onAddToDay 
  }: import("@/components/map-view").PopupContentProps) => {
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
              });
            }}
            title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
          >
            {isFavorited(location.id) ? 
              <HeartSolid className="w-5 h-5 text-red-500" /> : 
              <HeartOutline className="w-5 h-5 text-gray-700" />
            }
          </div>
          <div 
            className="absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClosePopup();
            }}
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <Link 
          href={`/location/${location.id}`}
          target="_blank"
          className="block"
          onClick={(e) => {
            // Don't propagate if clicking on the Add to itinerary button
            if ((e.target as HTMLElement).closest('button')) {
              e.stopPropagation();
            }
          }}
        >
          <div className="p-4">
            <h3 className="font-medium text-xl text-gray-900">{location.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
            <div className="mt-2">
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                {location.category}
              </span>
            </div>
          </div>
        </Link>
        
        {onAddToDay && (
          <div className="px-4 pb-4">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClosePopup();
                onAddToDay(location);
              }}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add to itinerary</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Add to day selector */}
      {showDaySelector && locationToAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Add to Day</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => {
                    addLocationToDay(day.id, locationToAdd);
                    hideAddToDay();
                  }}
                  className="w-full text-left p-2 hover:bg-gray-100 rounded flex justify-between items-center"
                >
                  <span>Day {day.id}</span>
                  <span className="text-gray-500 text-sm">{day.locations.length} locations</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={hideAddToDay}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Toggle between map, list, and plan views */}
      {isMobile ? (
        <div className="h-full relative flex flex-col">
          {/* Mobile navigation */}
          <div className="bg-white border-b p-2 flex justify-center space-x-2">
            <button
              onClick={() => setMobileView("map")}
              className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center space-x-1 ${
                mobileView === "map" ? "bg-blue-100 text-blue-700" : "text-gray-600"
              }`}
            >
              <MapIcon className="w-5 h-5" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setMobileView("list")}
              className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center space-x-1 ${
                mobileView === "list" ? "bg-blue-100 text-blue-700" : "text-gray-600"
              }`}
            >
              <ListBulletIcon className="w-5 h-5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setMobileView("plan")}
              className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center space-x-1 ${
                mobileView === "plan" ? "bg-blue-100 text-blue-700" : "text-gray-600"
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
              <span>Plan</span>
            </button>
          </div>
          
          {/* Mobile content area */}
          <div className="flex-1 overflow-hidden">
            {mobileView === "map" && (
              <div className="relative h-full">
                <div className="absolute top-2 left-2 z-10 flex space-x-2">
                  <CategoryFilter 
                    categories={categories.map(cat => cat.name)} 
                    onFilterChange={handleFilterChange}
                    onFavoritesFilterChange={handleFavoritesFilterChange}
                    refreshFavorites={refreshFavorites}
                  />
                  <DayFilter
                    days={days}
                    selectedDayIds={selectedDayIds}
                    onDayFilterChange={setSelectedDayIds}
                  />
                </div>
                <MapView
                  locations={filteredLocations}
                  onLocationHover={handleLocationHover}
                  hoveredLocation={hoveredLocation}
                  onViewportChange={handleViewportChange}
                  refreshFavorites={refreshFavorites}
                  renderPopupContent={(props) => renderPlannerPopupContent({
                    ...props,
                    isLoggedIn,
                    isFavorited,
                    toggleFavorite,
                    isLoadingFavorite,
                    onAddToDay: showAddToDay
                  })}
                  getMarkerIcon={getPlannerMarkerIcon}
                />
              </div>
            )}
            {mobileView === "list" && (
              <ListView
                locations={visibleLocations}
                onLocationHover={handleLocationHover}
                hoveredLocation={hoveredLocation}
                refreshFavorites={refreshFavorites}
                userFavorites={userFavorites}
                onAddToDay={showAddToDay}
              />
            )}
            {mobileView === "plan" && (
              <div className="h-full flex flex-col">
                <div className="p-3 bg-white border-b flex justify-between items-center">
                  <h2 className="text-lg font-medium">Your Plan</h2>
                  <div className="flex space-x-2">
                    <button 
                      onClick={addDay}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add Day
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {days.length === 0 ? (
                    <EmptyState
                      message="No days planned yet"
                      description="Add a day to start planning your trip"
                    />
                  ) : (
                    <div className="space-y-6">
                      {days.map((day) => (
                        <DayItinerary
                          key={day.id}
                          day={day}
                          isSelected={day.id === selectedDay}
                          onSelect={() => selectDay(day.id)}
                          onRemove={() => removeDay(day.id)}
                          onRemoveLocation={(locationId) => removeLocationFromDay(day.id, locationId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Desktop: Three-column layout (plan, list, map)
        <div className="h-full flex">
          {/* Left column: Plan view */}
          <div className="w-[30%] h-full flex flex-col border-r">
            <div className="p-3 bg-white border-b flex justify-between items-center">
              <h2 className="text-lg font-medium">Your Plan</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={addDay}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Day
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {days.length === 0 ? (
                <EmptyState
                  message="No days planned yet"
                  description="Add a day to start planning your trip"
                />
              ) : (
                <div className="space-y-6">
                  {days.map((day) => (
                    <DayItinerary
                      key={day.id}
                      day={day}
                      isSelected={day.id === selectedDay}
                      onSelect={() => selectDay(day.id)}
                      onRemove={() => removeDay(day.id)}
                      onRemoveLocation={(locationId) => removeLocationFromDay(day.id, locationId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle column: List view */}
          <div className="w-[30%] h-full flex flex-col border-r">
            <div className="flex-1 overflow-y-auto">
              <ListView
                locations={visibleLocations}
                onLocationHover={handleLocationHover}
                hoveredLocation={hoveredLocation}
                refreshFavorites={refreshFavorites}
                userFavorites={userFavorites}
                onAddToDay={showAddToDay}
              />
            </div>
          </div>

          {/* Right column: Map view */}
          <div className="w-[40%] h-full relative">
            <div className="absolute top-2 left-2 z-10 flex space-x-2">
              <CategoryFilter 
                categories={categories.map(cat => cat.name)} 
                onFilterChange={handleFilterChange}
                onFavoritesFilterChange={handleFavoritesFilterChange}
                refreshFavorites={refreshFavorites}
              />
              <DayFilter
                days={days}
                selectedDayIds={selectedDayIds}
                onDayFilterChange={setSelectedDayIds}
              />
            </div>
            <MapView
              locations={filteredLocations}
              onLocationHover={handleLocationHover}
              hoveredLocation={hoveredLocation}
              onViewportChange={handleViewportChange}
              refreshFavorites={refreshFavorites}
              renderPopupContent={(props) => renderPlannerPopupContent({
                ...props,
                isLoggedIn,
                isFavorited,
                toggleFavorite,
                isLoadingFavorite,
                onAddToDay: showAddToDay
              })}
              getMarkerIcon={getPlannerMarkerIcon}
            />
          </div>
        </div>
      )}
    </div>
  )
}