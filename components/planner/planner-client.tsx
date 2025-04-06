// /components/planner/planner-client.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { LocationData, ItineraryDay } from "@/lib/types";
import type { CategoryData } from "@/lib/supabase/categories";
import FilterModal from "../filter-modal";
import ListView from "@/components/planner/planner-list-view";
import EmptyState from "@/components/empty-state";
import { MapIcon, ListBulletIcon, CalendarIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Filter } from "lucide-react";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid, PlusIcon } from "@heroicons/react/24/solid";
import DayItinerary from "@/components/planner/planner-day-itinerary";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useItinerary } from "@/hooks/use-itinerary";
import Image from "next/image";
import SearchInput from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Dynamically import MapView
const MapView = dynamic(() => import("@/components/map-view"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
});

interface PlannerClientProps {
    itineraryId: number;
    initialItineraryData: ItineraryDay[];
    itineraryName: string; // Added itineraryName prop
    initialLocations: LocationData[];
    categories: CategoryData[];
}

// Helper function (keep as is)
const getLocationsFromSelectedDays = (days: ItineraryDay[], selectedDayIds: number[]): Set<string> => {
    const locationIds = new Set<string>();
    days.forEach(day => {
        if (selectedDayIds.includes(day.id)) {
            day.locations.forEach(loc => locationIds.add(loc.id));
        }
    });
    return locationIds;
};

export default function PlannerClient({
    itineraryId,
    initialItineraryData,
    itineraryName, // Destructure the new prop
    initialLocations,
    categories
}: PlannerClientProps) {
    // --- Hooks ---
    const { isLoggedIn } = useAuth();
    const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites();
    const {
        days,
        addDay,
        removeDay,
        addLocationToDay,
        removeLocationFromDay,
        isLoading: isItineraryLoading,
        isSaving,
        error: itineraryError
    } = useItinerary(itineraryId, initialItineraryData);

    // --- State ---
    const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations);
    const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null);
    const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations);
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [mobileView, setMobileView] = useState<"map" | "list" | "plan">("map");
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedDayIds, setSelectedDayIds] = useState<number[]>([]); // Filter by day
    const [searchQuery, setSearchQuery] = useState('');
    const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedDayForPlanView, setSelectedDayForPlanView] = useState<number>(1); // Which day is active in plan column
    const [showDaySelectorModal, setShowDaySelectorModal] = useState<boolean>(false);
    const [locationToAdd, setLocationToAdd] = useState<LocationData | null>(null);


    // --- Derived State ---
    const locationToDayMap = useMemo(() => {
        const map = new Map<string, number>();
        days.forEach(day => {
            day.locations.forEach(loc => {
                map.set(loc.id, day.id);
            });
        });
        return map;
    }, [days]);

    const filterCount = useMemo(() => {
        return selectedCategories.length + (showOnlyFavorites ? 1 : 0) + selectedDayIds.length;
    }, [selectedCategories, showOnlyFavorites, selectedDayIds]);


    // --- Effects ---
    useEffect(() => {
        let newFiltered = initialLocations;

        if (selectedCategories.length > 0) {
            newFiltered = newFiltered.filter(loc => selectedCategories.includes(loc.category));
        }
        if (showOnlyFavorites) {
            newFiltered = newFiltered.filter(loc => userFavorites.includes(loc.id));
        }
        if (selectedDayIds.length > 0) {
            const allowedLocationIds = getLocationsFromSelectedDays(days, selectedDayIds);
            newFiltered = newFiltered.filter(loc => allowedLocationIds.has(loc.id));
        }
        if (searchQuery.trim() !== '') {
            const lowerCaseQuery = searchQuery.toLowerCase();
            newFiltered = newFiltered.filter(loc =>
                loc.name.toLowerCase().includes(lowerCaseQuery) ||
                loc.description.toLowerCase().includes(lowerCaseQuery) ||
                loc.category.toLowerCase().includes(lowerCaseQuery)
            );
        }

        setFilteredLocations(newFiltered);
        if (searchQuery.trim() === '') {
            setLocationsToFit(newFiltered.length > 0 ? newFiltered : null);
        } else {
             setLocationsToFit(null);
        }

    }, [initialLocations, selectedCategories, showOnlyFavorites, userFavorites, selectedDayIds, days, searchQuery]);


    // --- Handlers ---
    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
    };
    const handleFavoriteFilterToggle = async () => {
        const nextValue = !showOnlyFavorites;
        setShowOnlyFavorites(nextValue);
        if (nextValue) await fetchFavorites();
    };
    const handleDayFilterToggle = (dayId: number) => {
        setSelectedDayIds(prev => prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]);
    };
    const handleSearchChange = (value: string) => setSearchQuery(value);
    const handleClearSearch = () => setSearchQuery('');
    const handleBoundsFitted = useCallback(() => setLocationsToFit(null), []);
    const handleLocationHover = (location: LocationData | null) => setHoveredLocation(location);
    const handleViewportChange = (locationsInViewport: LocationData[]) => setVisibleLocations(locationsInViewport);
    const handleSelectDayForPlanView = (dayId: number) => setSelectedDayForPlanView(dayId);
    const handleShowAddToDayModal = (location: LocationData) => {
        setLocationToAdd(location);
        setShowDaySelectorModal(true);
    };
    const handleHideAddToDayModal = () => {
        setShowDaySelectorModal(false);
        setLocationToAdd(null);
    };
    const handleAddLocationToSelectedDay = (dayId: number) => {
        if (locationToAdd) {
            addLocationToDay(dayId, locationToAdd);
        }
        handleHideAddToDayModal();
    };


    // --- Rendering Logic ---

    // Popup content for map markers
    const renderPlannerPopupContent = ({
        location, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite, onClosePopup, refreshFavorites
    }: import("@/components/map-view").PopupContentProps) => {
        return (
            <div className="airbnb-popup-content">
                {/* Image and Heart/Close Buttons */}
                <div className="relative w-full h-0 pb-[56.25%]">
                    <Image src={location.images[0] || "/placeholder.svg"} alt={location.name} fill className="object-cover" />
                    <div
                        className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
                        onClick={async (e) => {
                            e.preventDefault(); e.stopPropagation();
                            if (!isLoggedIn) { window.open('/login', '_blank'); return; }
                            if (isLoadingFavorite?.[location.id]) return;
                            const success = await toggleFavorite(location.id);
                            if (success && fetchFavorites) await fetchFavorites();
                        }}
                        title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
                    >
                        {isFavorited(location.id) ? <HeartSolid className="w-5 h-5 text-red-500" /> : <HeartOutline className="w-5 h-5 text-gray-700" />}
                    </div>
                    <div
                        className="absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); }}
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </div>
                </div>
                {/* Details Link */}
                <Link href={`/location/${location.id}`} target="_blank" className="block" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) e.stopPropagation(); }}>
                    <div className="p-4">
                        <h3 className="font-medium text-xl text-gray-900">{location.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
                        <div className="mt-2"><span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{location.category}</span></div>
                    </div>
                </Link>
                {/* Add to Itinerary Button */}
                <div className="px-4 pb-4">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); handleShowAddToDayModal(location); }} className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
                        <PlusIcon className="w-5 h-5" /><span>Add to itinerary</span>
                    </button>
                </div>
            </div>
        );
    };

    // Determine locations for the list view
    const listLocations = useMemo(() => {
        const hasFilters = searchQuery.trim() !== '' || selectedCategories.length > 0 || showOnlyFavorites || selectedDayIds.length > 0;
        const baseList = hasFilters ? filteredLocations : visibleLocations;
        return baseList.filter(visLoc => filteredLocations.some(filtLoc => filtLoc.id === visLoc.id));
    }, [searchQuery, selectedCategories, showOnlyFavorites, selectedDayIds, filteredLocations, visibleLocations]);


    // --- Main Render ---

    if (isItineraryLoading) {
        return <div className="h-full w-full flex items-center justify-center text-gray-500">Loading your itinerary...</div>;
    }
    if (itineraryError) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-red-600 p-6 text-center">
                <ExclamationTriangleIcon className="w-12 h-12 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error Loading Itinerary</h2>
                <p className="max-w-md">{itineraryError}</p>
                <Button onClick={() => window.location.reload()} className="mt-4">Refresh Page</Button>
            </div>
        );
    }

    const mobileBottomPadding = "pb-[60px]";

    return (
        <div className="h-full flex flex-col">
            {/* --- Modals --- */}
            {showDaySelectorModal && locationToAdd && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full z-50">
                        <h3 className="text-lg font-medium mb-4">Add "{locationToAdd.name}" to Day</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                            {days.length > 0 ? days.map((day) => (
                                <button
                                    key={day.id}
                                    onClick={() => handleAddLocationToSelectedDay(day.id)}
                                    className="w-full text-left p-3 hover:bg-gray-100 rounded flex justify-between items-center border border-transparent hover:border-gray-200"
                                >
                                    <span>Day {day.id}</span>
                                    <span className="text-gray-500 text-sm">{day.locations.length} locations</span>
                                </button>
                            )) : <p className="text-sm text-gray-500 p-3">No days available. Add a day in the 'Plan' tab first.</p>}
                        </div>
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={handleHideAddToDayModal}>Cancel</Button>
                        </div>
                    </div>
                    <div className="fixed inset-0 z-40" onClick={handleHideAddToDayModal}></div>
                </div>
            )}

            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                categories={categories.map(cat => cat.name)}
                selectedCategories={selectedCategories}
                onCategoryToggle={handleCategoryToggle}
                showFavoritesFilter={isLoggedIn}
                isFavoriteSelected={showOnlyFavorites}
                onFavoriteToggle={handleFavoriteFilterToggle}
                showDayFilter={true}
                days={days}
                selectedDayIds={selectedDayIds}
                onDayToggle={handleDayFilterToggle}
            />

            {/* --- Layout --- */}
            {isMobile ? (
                /* --- Mobile Layout --- */
                <div className="h-full relative flex flex-col">
                    {(mobileView === 'map' || mobileView === 'list') && (
                        <div className="p-2 bg-white border-b flex gap-2 items-center sticky top-0 z-10">
                            <SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="flex-grow" />
                            <Button variant="outline" size="sm" className="gap-1.5 relative" onClick={() => setIsFilterModalOpen(true)}>
                                <Filter className="h-4 w-4" />
                                <span>Filters</span>
                                {filterCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs">
                                        {filterCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden">
                        {mobileView === "map" && (
                            <div className={cn("relative h-full", mobileBottomPadding)}>
                                <MapView
                                    locations={filteredLocations}
                                    onLocationHover={handleLocationHover}
                                    hoveredLocation={hoveredLocation}
                                    onViewportChange={handleViewportChange}
                                    refreshFavorites={fetchFavorites}
                                    renderPopupContent={(props) => renderPlannerPopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite })}
                                    locationToDayMap={locationToDayMap}
                                    locationsToFit={locationsToFit}
                                    onBoundsFitted={handleBoundsFitted}
                                />
                            </div>
                        )}
                        {mobileView === "list" && (
                            <div className={cn("h-full overflow-y-auto", mobileBottomPadding)}>
                                {listLocations.length > 0 ? (
                                    <ListView
                                        locations={listLocations}
                                        onLocationHover={handleLocationHover}
                                        hoveredLocation={hoveredLocation}
                                        refreshFavorites={fetchFavorites}
                                        userFavorites={userFavorites}
                                        onAddToDay={handleShowAddToDayModal}
                                    />
                                ) : (
                                     <EmptyState message="No locations match filters" description="Try adjusting your search or filters." />
                                )}
                            </div>
                        )}
                        {mobileView === "plan" && (
                            <div className={cn("h-full flex flex-col", mobileBottomPadding)}>
                                <div className="p-3 bg-white border-b flex justify-between items-center sticky top-0 z-10">
                                    <h2 className="text-lg font-medium truncate pr-2">{itineraryName} {isSaving ? <span className="text-sm text-gray-500">(Saving...)</span> : ''}</h2>
                                    <Button
                                        size="sm"
                                        onClick={addDay}
                                        className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white" // Blue button
                                    >
                                        Add Day
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    {days.length === 0 ? (
                                        <EmptyState message="No days planned yet" description="Add a day to start planning your trip." />
                                    ) : (
                                        <div className="space-y-6">
                                            {days.map((day) => (
                                                <DayItinerary
                                                    key={day.id}
                                                    day={day}
                                                    isSelected={day.id === selectedDayForPlanView}
                                                    onSelect={() => handleSelectDayForPlanView(day.id)}
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

                    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t p-1 flex justify-around items-center h-[60px]">
                         <button onClick={() => setMobileView("map")} className={cn("flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full", mobileView === "map" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50")}>
                            <MapIcon className="w-5 h-5" /><span>Map</span>
                        </button>
                        <button onClick={() => setMobileView("list")} className={cn("flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full", mobileView === "list" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50")}>
                            <ListBulletIcon className="w-5 h-5" /><span>List</span>
                        </button>
                        <button onClick={() => setMobileView("plan")} className={cn("flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full", mobileView === "plan" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50")}>
                            <CalendarIcon className="w-5 h-5" /><span>Plan</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* --- Desktop Layout (3 Columns) --- */
                <div className="h-full flex">
                    {/* Column 1: Plan */}
                    <div className="w-[30%] h-full flex flex-col border-r">
                        <div className="p-3 bg-white border-b flex justify-between items-center sticky top-0 z-10">
                            <h2 className="text-lg font-medium truncate pr-2">{itineraryName} {isSaving ? <span className="text-sm text-gray-500">(Saving...)</span> : ''}</h2>
                            <Button
                                size="sm"
                                onClick={addDay}
                                className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white" // Blue button
                            >
                                Add Day
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {days.length === 0 ? (
                                <EmptyState message="No days planned yet" description="Add a day to start planning." />
                            ) : (
                                <div className="space-y-6">
                                    {days.map((day) => (
                                        <DayItinerary
                                            key={day.id}
                                            day={day}
                                            isSelected={day.id === selectedDayForPlanView}
                                            onSelect={() => handleSelectDayForPlanView(day.id)}
                                            onRemove={() => removeDay(day.id)}
                                            onRemoveLocation={(locationId) => removeLocationFromDay(day.id, locationId)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 2: List */}
                    <div className="w-[30%] h-full flex flex-col border-r">
                         <div className="flex-1 overflow-y-auto">
                             {listLocations.length > 0 ? (
                                <ListView
                                    locations={listLocations}
                                    onLocationHover={handleLocationHover}
                                    hoveredLocation={hoveredLocation}
                                    refreshFavorites={fetchFavorites}
                                    userFavorites={userFavorites}
                                    onAddToDay={handleShowAddToDayModal}
                                />
                             ) : (
                                 <EmptyState message="No locations match filters" description="Try adjusting your search or filters." />
                             )}
                        </div>
                    </div>

                    {/* Column 3: Map */}
                    <div className="w-[40%] h-full relative">
                        <div className="absolute top-2 left-2 z-10 flex gap-2 items-center bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow">
                            <SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="w-48" />
                            <Button variant="outline" size="sm" className="gap-1.5 relative" onClick={() => setIsFilterModalOpen(true)}>
                                <Filter className="h-4 w-4" />
                                <span>Filters</span>
                                 {filterCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs">
                                        {filterCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                        <MapView
                            locations={filteredLocations}
                            onLocationHover={handleLocationHover}
                            hoveredLocation={hoveredLocation}
                            onViewportChange={handleViewportChange}
                            refreshFavorites={fetchFavorites}
                            renderPopupContent={(props) => renderPlannerPopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite })}
                            locationToDayMap={locationToDayMap}
                            locationsToFit={locationsToFit}
                            onBoundsFitted={handleBoundsFitted}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}