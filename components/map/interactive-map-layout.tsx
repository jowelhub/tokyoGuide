// components/map/interactive-map-layout.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { LocationData, ItineraryDay } from '@/lib/types';
import type { CategoryData } from '@/lib/supabase/categories';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import FilterModal from '@/components/filter-modal';
import MapControls from './map-controls';
import MobileMapNav from './mobile-map-nav';
import EmptyState from '@/components/empty-state';
import { cn } from '@/lib/utils';
import type { PopupContentProps } from '@/components/map-view';
import { Button } from '@/components/ui/button'; // Import Button
import { XCircleIcon } from 'lucide-react'; // Import XCircleIcon

// Dynamically import MapView
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
});

type MobileView = 'map' | 'list' | 'plan';

interface InteractiveMapLayoutProps {
  // Data
  initialLocations: LocationData[];
  categories: CategoryData[];

  // Configuration
  showSearchControls?: boolean;
  showAiSearch?: boolean;
  showFilterControls?: boolean;
  mobileNavViews: MobileView[];
  desktopLayoutConfig: {
    planWidth?: string; // e.g., 'w-[30%]'
    listWidth: string;  // e.g., 'w-[60%]' or 'w-[30%]'
    mapWidth: string;   // e.g., 'w-[40%]'
    showPlanColumn?: boolean;
  };

  // Rendering
  renderPopupContent: (props: PopupContentProps) => React.ReactNode;
  renderListView: (props: {
    locations: LocationData[];
    hoveredLocation: LocationData | null;
    onLocationHover: (location: LocationData | null) => void;
  }) => React.ReactNode;
  renderPlanView?: () => React.ReactNode; // Optional plan column for Planner

  // Planner Specific Props (Optional)
  filterOptions?: {
    showDayFilter: boolean;
    days?: ItineraryDay[];
    selectedDayIds?: number[];
    onDayToggle?: (dayId: number) => void;
  };
  locationToDayMap?: Map<string, number>;
}

// Helper to get locations from selected days (copied from planner-client)
const getLocationsFromSelectedDays = (days: ItineraryDay[], selectedDayIds: number[]): Set<string> => {
    const locationIds = new Set<string>();
    days?.forEach(day => {
        if (selectedDayIds.includes(day.id)) {
            day.locations.forEach(loc => locationIds.add(loc.id));
        }
    });
    return locationIds;
};

export default function InteractiveMapLayout({
  initialLocations,
  categories,
  showSearchControls = true,
  showAiSearch = false,
  showFilterControls = true,
  mobileNavViews,
  desktopLayoutConfig,
  renderPopupContent,
  renderListView,
  renderPlanView,
  filterOptions = { showDayFilter: false },
  locationToDayMap,
}: InteractiveMapLayoutProps) {
  // --- Hooks ---
  const { isLoggedIn } = useAuth();
  const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // --- State ---
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations);
  const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null);
  const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations); // Locations currently within map bounds
  const [mobileView, setMobileView] = useState<MobileView>(mobileNavViews[0] || "map");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // Current value in the input
  const [activeSearchQuery, setActiveSearchQuery] = useState(''); // The query that was last searched (normal search)
  const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // AI Search State
  const [isAiSearchLoading, setIsAiSearchLoading] = useState(false);
  const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);

  // Ref to store previous dependency values for useEffect comparison
  const prevDepsRef = useRef<{
    selectedCategories: string[];
    showOnlyFavorites: boolean;
    activeSearchQuery: string;
    aiSearchResultIds: string[] | null;
    selectedDayIds?: number[];
  } | null>(null);

  // --- Derived State ---
  const isAiSearchActive = useMemo(() => aiSearchResultIds !== null, [aiSearchResultIds]);
  const isNormalSearchActive = useMemo(() => activeSearchQuery.trim() !== '', [activeSearchQuery]);
  const isSearchActive = isAiSearchActive || isNormalSearchActive;
  const activeSearchTerm = isAiSearchActive ? searchQuery : activeSearchQuery; // Show input query for AI, active query for normal

  const currentSelectedDayIds = filterOptions.selectedDayIds ?? [];
  const currentDays = filterOptions.days ?? [];

  // --- Filtering Logic ---
  useEffect(() => {
    let newFilteredLocations = initialLocations;
    let fitTriggeredBySearchOrFilter = false;

    const prevDeps = prevDepsRef.current;

    // --- AI Search Filter (Overrides others if active) ---
    if (isAiSearchActive) {
      console.log('[InteractiveMapLayout] AI Search active. Filtering by AI results:', aiSearchResultIds);
      newFilteredLocations = initialLocations.filter(location =>
        (aiSearchResultIds ?? []).includes(location.id)
      );
      if (JSON.stringify(prevDeps?.aiSearchResultIds) !== JSON.stringify(aiSearchResultIds)) {
        fitTriggeredBySearchOrFilter = true;
      }
    } else {
      // --- Regular Filters (Apply if AI search is NOT active) ---
      console.log('[InteractiveMapLayout] AI Search inactive. Applying regular filters.');

      // Apply category filter
      if (selectedCategories.length > 0) {
        newFilteredLocations = newFilteredLocations.filter(location =>
          selectedCategories.includes(location.category)
        );
      }
      // Apply favorite filter
      if (showOnlyFavorites) {
        newFilteredLocations = newFilteredLocations.filter(location =>
          userFavorites.includes(location.id)
        );
      }
      // Apply day filter (Planner only)
      if (filterOptions.showDayFilter && currentSelectedDayIds.length > 0) {
          const allowedLocationIds = getLocationsFromSelectedDays(currentDays, currentSelectedDayIds);
          newFilteredLocations = newFilteredLocations.filter(loc => allowedLocationIds.has(loc.id));
      }
      // Apply ACTIVE normal search query filter
      if (isNormalSearchActive) {
        console.log('[InteractiveMapLayout] Normal Search active. Filtering by:', activeSearchQuery);
        const lowerCaseQuery = activeSearchQuery.toLowerCase();
        newFilteredLocations = newFilteredLocations.filter(location =>
          location.name.toLowerCase().includes(lowerCaseQuery) ||
          location.description.toLowerCase().includes(lowerCaseQuery) ||
          location.category.toLowerCase().includes(lowerCaseQuery)
        );
        if (prevDeps?.activeSearchQuery !== activeSearchQuery) {
          fitTriggeredBySearchOrFilter = true;
        }
      }

      // Check if regular filters changed when no search is active
      if (!isNormalSearchActive && prevDeps && (
        JSON.stringify(prevDeps.selectedCategories) !== JSON.stringify(selectedCategories) ||
        prevDeps.showOnlyFavorites !== showOnlyFavorites ||
        (filterOptions.showDayFilter && JSON.stringify(prevDeps.selectedDayIds) !== JSON.stringify(currentSelectedDayIds))
      )) {
        fitTriggeredBySearchOrFilter = true;
      }
    }

    setFilteredLocations(newFilteredLocations);

    // --- Map Fitting Logic ---
    if (newFilteredLocations.length > 0 && fitTriggeredBySearchOrFilter) {
      console.log('[InteractiveMapLayout] Fitting map bounds due to search/filter change.');
      setLocationsToFit(newFilteredLocations);
    } else if (newFilteredLocations.length === 0 && fitTriggeredBySearchOrFilter) {
      setLocationsToFit(null); // Reset map view if no results
    }

    // Update previous deps ref
    prevDepsRef.current = { selectedCategories, showOnlyFavorites, activeSearchQuery, aiSearchResultIds, selectedDayIds: currentSelectedDayIds };

  }, [
    initialLocations,
    selectedCategories,
    showOnlyFavorites,
    userFavorites, // Re-run if favorites change (for the filter)
    activeSearchQuery,
    isAiSearchActive,
    aiSearchResultIds,
    isNormalSearchActive,
    filterOptions.showDayFilter, // Add planner filter dependencies
    currentSelectedDayIds,
    currentDays,
  ]);


  // --- Handlers ---
  const handleLocationHover = (location: LocationData | null) => {
    setHoveredLocation(location);
  };
  const handleViewportChange = (locationsInViewport: LocationData[]) => {
    setVisibleLocations(locationsInViewport);
  };
  const handleBoundsFitted = useCallback(() => {
    console.log('[InteractiveMapLayout] Map bounds fitted, resetting trigger.');
    setLocationsToFit(null);
  }, []);

  // Filter Modal Handlers
  const handleCategoryToggle = (category: string) => {
    setAiSearchResultIds(null); // Clear AI search when changing filters
    setActiveSearchQuery(''); // Clear normal search when changing filters
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  const handleFavoriteFilterToggle = async () => {
    setAiSearchResultIds(null); // Clear AI search when changing filters
    setActiveSearchQuery(''); // Clear normal search when changing filters
    const newShowOnlyFavorites = !showOnlyFavorites;
    setShowOnlyFavorites(newShowOnlyFavorites);
    if (newShowOnlyFavorites) {
      await fetchFavorites();
    }
  };

  // Search Handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // If input is cleared, also clear active searches immediately
    if (value.trim() === '') {
      setActiveSearchQuery('');
      setAiSearchResultIds(null);
      setAiSearchError(null);
      // Reset map view to show all initial locations when search is cleared
      setLocationsToFit(initialLocations);
    }
  };

  const handleClearSearch = () => {
    console.log('[InteractiveMapLayout] Clearing Search Input and Active Search.');
    setSearchQuery('');
    setActiveSearchQuery('');
    setAiSearchResultIds(null);
    setAiSearchError(null);
    setLocationsToFit(initialLocations); // Reset map view
  };

  const handleNormalSearch = () => {
    if (!searchQuery.trim() || isAiSearchLoading) return;
    console.log('[InteractiveMapLayout] Starting Normal Search for:', searchQuery);
    setActiveSearchQuery(searchQuery);
    setAiSearchResultIds(null);
    setAiSearchError(null);
    // Fitting is handled by the useEffect hook
  };

  const handleAiSearch = async () => {
    if (!showAiSearch || !searchQuery.trim() || isAiSearchLoading) return;

    console.log('[InteractiveMapLayout] Starting AI Search for:', searchQuery);
    setIsAiSearchLoading(true);
    setAiSearchError(null);
    setAiSearchResultIds(null);
    setActiveSearchQuery('');

    try {
      const response = await fetch('/api/explore/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: searchQuery }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `AI search failed (status ${response.status})`);
      }
      console.log('[InteractiveMapLayout] AI Search successful, results:', result.matchingLocationIds);
      setAiSearchResultIds(result.matchingLocationIds || []); // Triggers useEffect
    } catch (err: any) {
      console.error("[InteractiveMapLayout] AI Search Error:", err);
      setAiSearchError(err.message || "An unexpected error occurred during AI search.");
      setAiSearchResultIds(null);
    } finally {
      setIsAiSearchLoading(false);
    }
  };

  // --- List View Logic ---
  const listLocations = useMemo(() => {
    // If any search is active, list shows only those results
    if (isSearchActive) {
      return filteredLocations;
    }
    // Otherwise, show locations based on viewport + other filters
    const hasOtherFilters = selectedCategories.length > 0 || showOnlyFavorites || (filterOptions.showDayFilter && currentSelectedDayIds.length > 0);
    // If filters are applied, show all matching locations. If no filters, show only visible ones.
    const baseList = hasOtherFilters ? filteredLocations : visibleLocations;
    // Ensure locations in the list are also present in the currently filtered set (redundant check, but safe)
    return baseList.filter(visLoc => filteredLocations.some(filtLoc => filtLoc.id === visLoc.id));
  }, [isSearchActive, filteredLocations, selectedCategories, showOnlyFavorites, filterOptions.showDayFilter, currentSelectedDayIds, visibleLocations]);

  // Calculate filter count for badge
  const filterCount = useMemo(() => {
      return selectedCategories.length + (showOnlyFavorites ? 1 : 0) + (filterOptions.showDayFilter ? currentSelectedDayIds.length : 0);
  }, [selectedCategories, showOnlyFavorites, filterOptions.showDayFilter, currentSelectedDayIds]);

  const mobileBottomPadding = "pb-[60px]"; // For mobile nav overlap

  // --- Render ---
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* --- Filter Modal --- */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        categories={categories.map(cat => cat.name)}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        showFavoritesFilter={isLoggedIn}
        isFavoriteSelected={showOnlyFavorites}
        onFavoriteToggle={handleFavoriteFilterToggle}
        // Planner specific filter props
        showDayFilter={filterOptions.showDayFilter}
        days={filterOptions.days}
        selectedDayIds={filterOptions.selectedDayIds}
        onDayToggle={filterOptions.onDayToggle}
      />

      {isMobile ? (
        // --- Mobile Layout ---
        <div className="h-full relative flex flex-col">
          {/* Conditionally render controls based on view */}
          {(mobileView === 'map' || mobileView === 'list') && showSearchControls && (
            <MapControls
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onClearSearch={handleClearSearch}
              onNormalSearch={handleNormalSearch}
              onAiSearch={showAiSearch ? handleAiSearch : undefined}
              onOpenFilterModal={() => setIsFilterModalOpen(true)}
              isAiSearchLoading={isAiSearchLoading}
              isSearchActive={isSearchActive}
              isAiSearchActive={isAiSearchActive}
              activeSearchTerm={activeSearchTerm}
              filterCount={filterCount}
              showAiSearchButton={showAiSearch}
              isMobile={isMobile}
              aiSearchError={aiSearchError}
            />
          )}

          {/* Mobile content area */}
          <div className="flex-1 overflow-hidden">
            {mobileView === "map" && (
              <div className={cn("relative h-full", mobileBottomPadding)}>
                <MapView
                  locations={filteredLocations} // Always show filtered locations on map
                  onLocationHover={handleLocationHover} // Pass the handler
                  hoveredLocation={hoveredLocation}
                  onViewportChange={handleViewportChange}
                  refreshFavorites={fetchFavorites}
                  renderPopupContent={(props) => renderPopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite })}
                  locationToDayMap={locationToDayMap}
                  locationsToFit={locationsToFit}
                  onBoundsFitted={handleBoundsFitted}
                />
              </div>
            )}
            {mobileView === "list" && (
              <div className={cn("h-full overflow-y-auto", mobileBottomPadding)}>
                {listLocations.length > 0 ? (
                  renderListView({ locations: listLocations, hoveredLocation, onLocationHover: handleLocationHover })
                ) : (
                  <EmptyState message={isSearchActive ? "No matching locations found." : "No locations found."} description="Try adjusting your search or filters." />
                )}
              </div>
            )}
            {mobileView === "plan" && renderPlanView && (
              <div className={cn("h-full overflow-y-auto", mobileBottomPadding)}>
                {renderPlanView()}
              </div>
            )}
          </div>

          {/* Mobile bottom navigation */}
          <MobileMapNav
            currentView={mobileView}
            availableViews={mobileNavViews}
            onViewChange={setMobileView}
          />
        </div>
      ) : (
        // --- Desktop Layout ---
        <div className="flex-1 flex flex-row overflow-hidden h-full">
          {/* Plan Column (Optional) */}
          {desktopLayoutConfig.showPlanColumn && renderPlanView && (
            // FIX: Apply width class directly
            <div className={`h-full flex flex-col border-r ${desktopLayoutConfig.planWidth}`}>
              {renderPlanView()}
            </div>
          )}

          {/* List Column */}
          {/* FIX: Apply width class directly */}
          <div className={`h-full flex flex-col border-r ${desktopLayoutConfig.listWidth}`}>
            {/* Search Active Indicator (if not showing controls on map) */}
            {isSearchActive && !showSearchControls && (
               <div className="p-2 bg-blue-50 border-b text-center text-sm text-blue-700 flex justify-between items-center flex-shrink-0">
                 <span>Showing {isAiSearchActive ? 'AI ' : ''}search results for "{activeSearchTerm}"</span>
                 <Button variant="ghost" size="sm" onClick={handleClearSearch} className="text-blue-700 hover:bg-blue-100 h-7 px-2">
                   <XCircleIcon className="w-4 h-4 mr-1" /> Clear
                 </Button>
               </div>
            )}
             {/* AI Search Error (if not showing controls on map) */}
            {aiSearchError && !showSearchControls && (
              <div className="p-2 bg-red-50 border-b text-center text-sm text-red-700 flex-shrink-0">
                AI Search Error: {aiSearchError}
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {listLocations.length > 0 ? (
                 renderListView({ locations: listLocations, hoveredLocation, onLocationHover: handleLocationHover })
              ) : (
                 <EmptyState message={isSearchActive ? "No matching locations found." : "No locations found."} description="Try adjusting your search or filters." />
              )}
            </div>
          </div>

          {/* Map Column */}
          {/* FIX: Apply width class directly */}
          <div className={`h-full flex flex-col ${desktopLayoutConfig.mapWidth}`}>
            {/* Optional Fixed Search/Filter Bar above Map */}
            {showSearchControls && (
              <MapControls
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch}
                onNormalSearch={handleNormalSearch}
                onAiSearch={showAiSearch ? handleAiSearch : undefined}
                onOpenFilterModal={() => setIsFilterModalOpen(true)}
                isAiSearchLoading={isAiSearchLoading}
                isSearchActive={isSearchActive}
                isAiSearchActive={isAiSearchActive}
                activeSearchTerm={activeSearchTerm}
                filterCount={filterCount}
                showAiSearchButton={showAiSearch}
                isMobile={isMobile}
                aiSearchError={aiSearchError}
              />
            )}
            {/* Map Container */}
            <div className="flex-1 overflow-hidden relative">
              <MapView
                locations={filteredLocations} // Always show filtered locations on map
                onLocationHover={handleLocationHover} // Pass the handler
                hoveredLocation={hoveredLocation}
                onViewportChange={handleViewportChange}
                refreshFavorites={fetchFavorites}
                renderPopupContent={(props) => renderPopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite })}
                locationToDayMap={locationToDayMap}
                locationsToFit={locationsToFit}
                onBoundsFitted={handleBoundsFitted}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}