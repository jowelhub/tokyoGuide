"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import CategoryFilter from "@/components/category-filter"
import ListView from "@/components/planner-list-view"
import EmptyState from "@/components/empty-state"
import { MapIcon, ListBulletIcon, CalendarIcon } from "@heroicons/react/24/outline"
import DayItinerary from "@/components/day-itinerary"
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
import { useItinerary } from "@/hooks/use-itinerary"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/planner-map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

interface PlannerClientProps {
  initialLocations: LocationData[]
  categories: CategoryData[]
}

interface ItineraryDay {
  id: number
  locations: LocationData[]
}

export default function PlannerClient({ initialLocations, categories }: PlannerClientProps) {
  const { isLoggedIn } = useAuth();
  const { favorites: userFavorites, refreshFavorites: fetchFavorites } = useFavorites();
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
  const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [mobileView, setMobileView] = useState<"map" | "list" | "plan">("map") // Default to map view on mobile
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  // Itinerary state
  const [days, setDays] = useState<ItineraryDay[]>([{ id: 1, locations: [] }])
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [showDaySelector, setShowDaySelector] = useState<boolean>(false)
  const [locationToAdd, setLocationToAdd] = useState<LocationData | null>(null)

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
  const addDay = () => {
    const newDayId = days.length > 0 ? Math.max(...days.map(day => day.id)) + 1 : 1;
    setDays([...days, { id: newDayId, locations: [] }]);
    setSelectedDay(newDayId);
  }

  const removeDay = (dayId: number) => {
    if (days.length <= 1) return; // Don't remove the last day
    
    const newDays = days.filter(day => day.id !== dayId);
    setDays(newDays);
    
    // If the selected day was removed, select the first available day
    if (selectedDay === dayId && newDays.length > 0) {
      setSelectedDay(newDays[0].id);
    }
  }

  const selectDay = (dayId: number) => {
    setSelectedDay(dayId);
  }

  // Location management for itinerary
  const showAddToDay = (location: LocationData) => {
    setLocationToAdd(location);
    setShowDaySelector(true);
  }

  const hideAddToDay = () => {
    setShowDaySelector(false);
    setLocationToAdd(null);
  }

  const addLocationToDay = (dayId: number, location: LocationData) => {
    setDays(days.map(day => {
      if (day.id === dayId) {
        // Check if location already exists in this day
        if (!day.locations.some(loc => loc.id === location.id)) {
          return { ...day, locations: [...day.locations, location] };
        }
      }
      return day;
    }));
    hideAddToDay();
  }

  const removeLocationFromDay = (dayId: number, locationId: string) => {
    setDays(days.map(day => {
      if (day.id === dayId) {
        return { ...day, locations: day.locations.filter(loc => loc.id !== locationId) };
      }
      return day;
    }));
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Day selector modal */}
      {showDaySelector && locationToAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Add to which day?</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {days.map(day => (
                <button
                  key={day.id}
                  onClick={() => addLocationToDay(day.id, locationToAdd)}
                  className="w-full text-left px-4 py-2 rounded hover:bg-gray-100"
                >
                  Day {day.id} ({day.locations.length} activities)
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
                  onAddToDay={showAddToDay}
                  categories={categories.map(cat => cat.name)}
                  onFilterChange={handleFilterChange}
                  onFavoritesFilterChange={handleFavoritesFilterChange}
                />
              </div>
            </>
          )}

          {/* List View */}
          {mobileView === "list" && (
            <>
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {getVisibleLocations().length > 0 ? (
                    <ListView
                      locations={getVisibleLocations()}
                      onLocationHover={handleLocationHover}
                      hoveredLocation={hoveredLocation}
                      refreshFavorites={refreshFavorites}
                      userFavorites={userFavorites}
                      onAddToDay={showAddToDay}
                    />
                  ) : (
                    <EmptyState
                      message="No locations found. Try adjusting your filters to see more locations."
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Plan View */}
          {mobileView === "plan" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="sticky top-0 z-10 p-2 bg-white border-b flex justify-between items-center">
                <h2 className="text-lg font-medium">Your Itinerary</h2>
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
                {days.map(day => (
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
            </div>
          )}

          {/* Bottom navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-10">
            <button 
              onClick={() => toggleMobileView("map")}
              className={`flex flex-col items-center p-2 ${mobileView === "map" ? "text-blue-500" : "text-gray-500"}`}
            >
              <MapIcon className="h-6 w-6" />
              <span className="text-xs">Map</span>
            </button>
            <button 
              onClick={() => toggleMobileView("list")}
              className={`flex flex-col items-center p-2 ${mobileView === "list" ? "text-blue-500" : "text-gray-500"}`}
            >
              <ListBulletIcon className="h-6 w-6" />
              <span className="text-xs">List</span>
            </button>
            <button 
              onClick={() => toggleMobileView("plan")}
              className={`flex flex-col items-center p-2 ${mobileView === "plan" ? "text-blue-500" : "text-gray-500"}`}
            >
              <CalendarIcon className="h-6 w-6" />
              <span className="text-xs">Plan</span>
            </button>
          </div>
        </div>
      ) : (
        /* Desktop: Three-column layout (itinerary, list, map) */
        <div className="flex-1 flex flex-row overflow-hidden h-full">
          {/* Left column: Day-based itinerary */}
          <div className="w-[30%] h-full flex flex-col overflow-hidden border-r">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-medium">Your Itinerary</h2>
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
              {days.map(day => (
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
          </div>

          {/* Middle column: List view */}
          <div className="w-[30%] h-full flex flex-col overflow-hidden border-r">
            <div className="flex-1 overflow-y-auto">
              {getVisibleLocations().length > 0 ? (
                <ListView
                  locations={getVisibleLocations()}
                  onLocationHover={handleLocationHover}
                  hoveredLocation={hoveredLocation}
                  refreshFavorites={refreshFavorites}
                  userFavorites={userFavorites}
                  onAddToDay={showAddToDay}
                />
              ) : (
                <EmptyState
                  message="No locations found. Try adjusting your filters to see more locations."
                />
              )}
            </div>
          </div>

          {/* Right column: Map view */}
          <div className="w-[40%] h-full relative">
            <MapView
              locations={filteredLocations}
              onLocationHover={handleLocationHover}
              hoveredLocation={hoveredLocation}
              onViewportChange={handleViewportChange}
              refreshFavorites={refreshFavorites}
              onAddToDay={showAddToDay}
              categories={categories.map(cat => cat.name)}
              onFilterChange={handleFilterChange}
              onFavoritesFilterChange={handleFavoritesFilterChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}