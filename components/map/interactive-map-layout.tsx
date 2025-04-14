// components/interactive-map-layout.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { LocationData, ItineraryDay } from '@/lib/types';
import type { CategoryData } from '@/lib/supabase/categories';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import FilterModal from '@/components/filter-modal';
import MapControls from '@/components/map/map-controls';
import MobileMapNav from '@/components/map/mobile-map-nav';
import EmptyState from '@/components/empty-state';
import { cn } from '@/lib/utils';
import type { PopupContentProps } from '@/components/map-view'; // Assuming PopupContentProps is exported
import { Button } from '@/components/ui/button';
import { XCircleIcon } from 'lucide-react';

// Dynamically import MapView
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
});

// Types
export type MobileView = 'map' | 'list' | 'plan';

export interface DesktopLayoutConfig {
  showPlanColumn: boolean;
  planWidth?: string; // e.g., 'w-[30%]'
  listWidth: string;  // e.g., 'w-[30%]' or 'w-[60%]'
  mapWidth: string;   // e.g., 'w-[40%]'
}

export interface FilterOptions {
  showDayFilter: boolean;
  days?: ItineraryDay[];
  selectedDayIds?: number[];
  onDayToggle?: (dayId: number) => void;
}

export interface InteractiveMapLayoutProps {
  // Data
  initialLocations: LocationData[];
  categories: CategoryData[];

  // Configuration
  showSearchControls: boolean;
  showAiSearch: boolean;
  showFilterControls: boolean;
  mobileNavViews: MobileView[];
  desktopLayoutConfig: DesktopLayoutConfig;
  filterOptions: FilterOptions;

  // Rendering Functions (Slots)
  renderPopupContent: (props: PopupContentProps) => React.ReactNode;
  renderListView: (props: {
    locations: LocationData[];
    hoveredLocation: LocationData | null;
    onLocationHover: (location: LocationData | null) => void;
  }) => React.ReactNode;
  renderPlanView?: () => React.ReactNode; // Optional for Planner

  // Map Specifics
  locationToDayMap?: Map<string, number>; // Optional for Planner markers

  // Optional: Pass down specific state/handlers if needed, but prefer keeping them internal
  // Example: If a parent needs to trigger a map fit externally
  // externalFitTrigger?: LocationData[] | null;
}

export default function InteractiveMapLayout({
  initialLocations,
  categories,
  showSearchControls,
  showAiSearch,
  showFilterControls,
  mobileNavViews,
  desktopLayoutConfig,
  filterOptions,
  renderPopupContent,
  renderListView,
  renderPlanView,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAiSearchLoading, setIsAiSearchLoading] = useState(false);
  const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);

  // Ref to store previous dependency values for useEffect comparison
  const prevDepsRef = useRef<{
    selectedCategories: string[];
    showOnlyFavorites: boolean;
    activeSearchQuery: string;
    aiSearchResultIds: string[] | null;
    selectedDayIds?: number[]; // Add day filter state
  } | null>(null);

  // --- Derived State ---
  const isAiSearchActive = useMemo(() => aiSearchResultIds !== null, [aiSearchResultIds]);
  const isNormalSearchActive = useMemo(() => activeSearchQuery.trim() !== '', [activeSearchQuery]);
  const isSearchActive = isAiSearchActive || isNormalSearchActive;
  const activeSearchTerm = isAiSearchActive ? searchQuery : activeSearchQuery;
  const isDayFilterActive = useMemo(() => filterOptions.showDayFilter && (filterOptions.selectedDayIds?.length ?? 0) > 0, [filterOptions.showDayFilter, filterOptions.selectedDayIds]);

  // --- Filtering Logic ---
  useEffect(() => {
    let newFilteredLocations = initialLocations;
    let fitTriggeredBySearchOrFilter = false;

    const prevDeps = prevDepsRef.current;
    const currentSelectedDayIds = filterOptions.selectedDayIds; // Get current day IDs

    // --- AI Search Filter (Overrides others if active) ---
    if (isAiSearchActive) {
      console.log('[Layout] AI Search active. Filtering by AI results:', aiSearchResultIds);
      newFilteredLocations = initialLocations.filter(location =>
        (aiSearchResultIds ?? []).includes(location.id)
      );
      if (JSON.stringify(prevDeps?.aiSearchResultIds) !== JSON.stringify(aiSearchResultIds)) {
        fitTriggeredBySearchOrFilter = true;
      }
    } else {
      // --- Regular Filters (Apply if AI search is NOT active) ---
      console.log('[Layout] AI Search inactive. Applying regular filters.');

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
      // Apply Day filter (Planner only)
      if (filterOptions.showDayFilter && currentSelectedDayIds && currentSelectedDayIds.length > 0 && locationToDayMap) {
        newFilteredLocations = newFilteredLocations.filter(location => {
          const dayNum = locationToDayMap.get(location.id);
          return dayNum !== undefined && currentSelectedDayIds.includes(dayNum);
        });
      }

      // Apply ACTIVE normal search query filter (applied AFTER other filters)
      if (isNormalSearchActive) {
        console.log('[Layout] Normal Search active. Filtering by:', activeSearchQuery);
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
      console.log('[Layout] Fitting map bounds due to search/filter change.');
      setLocationsToFit(newFilteredLocations);
    } else if (newFilteredLocations.length === 0 && fitTriggeredBySearchOrFilter) {
      console.log('[Layout] No results after filter/search, resetting map view.');
      setLocationsToFit(null); // Reset map view if no results
    } else if (!isSearchActive && !isDayFilterActive && selectedCategories.length === 0 && !showOnlyFavorites && prevDeps && fitTriggeredBySearchOrFilter) {
      // If all filters are cleared, reset view to initial state (optional, could just fit the empty filter result)
      console.log('[Layout] All filters cleared, resetting map view to initial.');
      setLocationsToFit(initialLocations);
    }


    // Update previous deps ref
    prevDepsRef.current = { selectedCategories, showOnlyFavorites, activeSearchQuery, aiSearchResultIds, selectedDayIds: currentSelectedDayIds };

  }, [
    initialLocations,
    selectedCategories,
    showOnlyFavorites,
    userFavorites,
    activeSearchQuery,
    isAiSearchActive,
    aiSearchResultIds,
    isNormalSearchActive,
    filterOptions.showDayFilter,
    filterOptions.selectedDayIds, // Add dependency
    locationToDayMap, // Add dependency
  ]);

  // --- Handlers ---
  const handleLocationHover = useCallback((location: LocationData | null) => {
    setHoveredLocation(location);
  }, []);

  const handleViewportChange = useCallback((locationsInViewport: LocationData[]) => {
    setVisibleLocations(locationsInViewport);
  }, []);

  const handleBoundsFitted = useCallback(() => {
    console.log('[Layout] Map bounds fitted, resetting trigger.');
    setLocationsToFit(null);
  }, []);

  const handleCategoryToggle = useCallback((category: string) => {
    setAiSearchResultIds(null);
    setActiveSearchQuery('');
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const handleFavoriteFilterToggle = useCallback(async () => {
    setAiSearchResultIds(null);
    setActiveSearchQuery('');
    const newShowOnlyFavorites = !showOnlyFavorites;
    setShowOnlyFavorites(newShowOnlyFavorites);
    if (newShowOnlyFavorites) {
      await fetchFavorites();
    }
  }, [showOnlyFavorites, fetchFavorites]);

  // Day filter toggle is passed via filterOptions.onDayToggle

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value.trim() === '') {
      setActiveSearchQuery('');
      setAiSearchResultIds(null);
      setAiSearchError(null);
      // Reset map view only if filters are also clear
      if (selectedCategories.length === 0 && !showOnlyFavorites && !isDayFilterActive) {
        setLocationsToFit(initialLocations);
      } else {
        // Refit based on remaining filters
         setLocationsToFit(filteredLocations); // Fit current filter results
      }
    }
  }, [selectedCategories.length, showOnlyFavorites, isDayFilterActive, initialLocations, filteredLocations]);

  const handleClearSearch = useCallback(() => {
    console.log('[Layout] Clearing Search Input and Active Search.');
    setSearchQuery('');
    setActiveSearchQuery('');
    setAiSearchResultIds(null);
    setAiSearchError(null);
    // Reset map view only if filters are also clear
    if (selectedCategories.length === 0 && !showOnlyFavorites && !isDayFilterActive) {
        setLocationsToFit(initialLocations);
    } else {
        // Refit based on remaining filters
        setLocationsToFit(filteredLocations); // Fit current filter results
    }
  }, [selectedCategories.length, showOnlyFavorites, isDayFilterActive, initialLocations, filteredLocations]);

  const handleNormalSearch = useCallback(() => {
    if (!searchQuery.trim() || isAiSearchLoading) return;
    console.log('[Layout] Starting Normal Search for:', searchQuery);
    setActiveSearchQuery(searchQuery);
    setAiSearchResultIds(null);
    setAiSearchError(null);
    // Fitting is handled by the useEffect hook
  }, [searchQuery, isAiSearchLoading]);

  const handleAiSearch = useCallback(async () => {
    if (!showAiSearch || !searchQuery.trim() || isAiSearchLoading) return;

    console.log('[Layout] Starting AI Search for:', searchQuery);
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
      console.log('[Layout] AI Search successful, results:', result.matchingLocationIds);
      setAiSearchResultIds(result.matchingLocationIds || []); // Triggers useEffect
    } catch (err: any) {
      console.error("[Layout] AI Search Error:", err);
      setAiSearchError(err.message || "An unexpected error occurred during AI search.");
      setAiSearchResultIds(null);
    } finally {
      setIsAiSearchLoading(false);
    }
  }, [showAiSearch, searchQuery, isAiSearchLoading]);

  // --- List View Logic ---
  const listLocations = useMemo(() => {
    // If any search is active, list shows only those results
    if (isSearchActive) {
      return filteredLocations;
    }
    // If day filter is active, show all matching locations for those days
    if (isDayFilterActive) {
        return filteredLocations;
    }
    // Otherwise, show locations based on viewport + other filters
    const hasOtherFilters = selectedCategories.length > 0 || showOnlyFavorites;
    const baseList = hasOtherFilters ? filteredLocations : visibleLocations;
    // Ensure locations in the list are also present in the currently filtered set
    return baseList.filter(visLoc => filteredLocations.some(filtLoc => filtLoc.id === visLoc.id));
  }, [isSearchActive, isDayFilterActive, filteredLocations, selectedCategories, showOnlyFavorites, visibleLocations]);

  // Calculate filter count for badge
  const filterCount = useMemo(() => {
      return selectedCategories.length + (showOnlyFavorites ? 1 : 0) + (filterOptions.selectedDayIds?.length ?? 0);
  }, [selectedCategories, showOnlyFavorites, filterOptions.selectedDayIds]);

  const mobileBottomPadding = "pb-[60px]"; // For mobile nav overlap

  // --- Internal Popup Renderer ---
  // This function wraps the provided renderPopupContent and injects common props
  const internalRenderPopupContent = useCallback((props: Omit<PopupContentProps, 'isLoggedIn' | 'isFavorited' | 'toggleFavorite' | 'isLoadingFavorite' | 'refreshFavorites'>) => {
    return renderPopupContent({
      ...props,
      isLoggedIn,
      isFavorited,
      toggleFavorite,
      isLoadingFavorite,
      refreshFavorites: fetchFavorites, // Pass fetchFavorites for potential use inside popup
    });
  }, [renderPopupContent, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite, fetchFavorites]);


  // --- Final Render ---
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
                  locations={filteredLocations}
                  onLocationHover={handleLocationHover}
                  hoveredLocation={hoveredLocation}
                  onViewportChange={handleViewportChange}
                  renderPopupContent={internalRenderPopupContent} // Use internal wrapper
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
            <div className={`h-full flex flex-col border-r ${desktopLayoutConfig.planWidth}`}>
              {renderPlanView()}
            </div>
          )}

          {/* List Column */}
          <div className={`h-full flex flex-col border-r ${desktopLayoutConfig.listWidth}`}>
             {/* Search/Filter Controls (if not shown above map) */}
             {!showSearchControls && showFilterControls && (
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
             {/* Search Active Indicator (if controls not shown here) */}
            {isSearchActive && !showSearchControls && (
               <div className="p-2 bg-blue-50 border-b text-center text-sm text-blue-700 flex justify-between items-center flex-shrink-0">
                 <span>Showing {isAiSearchActive ? 'AI ' : ''}search results for "{activeSearchTerm}"</span>
                 <Button variant="ghost" size="sm" onClick={handleClearSearch} className="text-blue-700 hover:bg-blue-100 h-7 px-2">
                   <XCircleIcon className="w-4 h-4 mr-1" /> Clear
                 </Button>
               </div>
            )}
             {/* AI Search Error (if controls not shown here) */}
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
          <div className={`h-full flex flex-col ${desktopLayoutConfig.mapWidth}`}>
            {/* Optional Fixed Search/Filter Bar above Map */}
            {showSearchControls && showFilterControls && (
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
                locations={filteredLocations}
                onLocationHover={handleLocationHover}
                hoveredLocation={hoveredLocation}
                onViewportChange={handleViewportChange}
                renderPopupContent={internalRenderPopupContent} // Use internal wrapper
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