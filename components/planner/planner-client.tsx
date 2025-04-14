// /components/planner/planner-client.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { LocationData, ItineraryDay } from "@/lib/types";
import type { CategoryData } from "@/lib/supabase/categories";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { useItinerary } from "@/hooks/use-itinerary";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { HeartIcon as HeartOutline, ExclamationTriangleIcon, XMarkIcon as CloseIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid, PlusIcon } from "@heroicons/react/24/solid";
import DayItinerary from "@/components/planner/planner-day-itinerary";
import EmptyState from "@/components/empty-state";
import type { PopupContentProps } from '@/components/map/map-view';
import InteractiveMapLayout from '@/components/map/interactive-map-layout'; // Import the new layout
import LocationListView from '@/components/location-list-view'; // Import the generic list view

interface PlannerClientProps {
  itineraryId: number;
  initialItineraryData: ItineraryDay[];
  itineraryName: string;
  initialLocations: LocationData[]; // All available locations for the list/map
  categories: CategoryData[];
}

export default function PlannerClient({
  itineraryId,
  initialItineraryData,
  itineraryName,
  initialLocations,
  categories
}: PlannerClientProps) {
  // --- Hooks ---
  const { isLoggedIn } = useAuth(); // Needed for conditional UI
  const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites(); // Needed for list/popup
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

  // --- State specific to Planner ---
  const [selectedDayIds, setSelectedDayIds] = useState<number[]>([]); // For filtering
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

  // --- Handlers specific to Planner ---
  const handleDayFilterToggle = useCallback((dayId: number) => {
    setSelectedDayIds(prev => prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]);
  }, []);

  const handleShowAddToDayModal = useCallback((location: LocationData) => {
    setLocationToAdd(location);
    setShowDaySelectorModal(true);
  }, []);

  const handleHideAddToDayModal = useCallback(() => {
    setShowDaySelectorModal(false);
    setLocationToAdd(null);
  }, []);

  const handleAddLocationToSelectedDay = useCallback((dayId: number) => {
    if (locationToAdd) {
      addLocationToDay(dayId, locationToAdd);
    }
    handleHideAddToDayModal();
  }, [locationToAdd, addLocationToDay, handleHideAddToDayModal]);

  // --- Rendering Logic ---

  const renderPlannerPopupContent = useCallback(({
    location,
    onClosePopup,
    // Props injected by InteractiveMapLayout's internal wrapper:
    isLoggedIn: popupIsLoggedIn,
    isFavorited: popupIsFavorited,
    toggleFavorite: popupToggleFavorite,
    isLoadingFavorite: popupIsLoadingFavorite,
  }: PopupContentProps) => {
     return (
      <div className="airbnb-popup-content">
        {/* Image and Heart/Close Buttons */}
        <div className="relative w-full h-0 pb-[56.25%]">
          <Image src={location.images[0] || "/placeholder.svg"} alt={location.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw"/>
          <div
            className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
            onClick={async (e) => {
              e.preventDefault(); e.stopPropagation();
              if (!popupIsLoggedIn) { window.open('/login', '_blank'); return; }
              if (popupIsLoadingFavorite?.[location.id]) return;
              await popupToggleFavorite(location.id);
            }}
            title={popupIsLoggedIn ? (popupIsFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
          >
            {popupIsFavorited(location.id) ? <HeartSolid className="w-5 h-5 text-red-500" /> : <HeartOutline className="w-5 h-5 text-gray-700" />}
          </div>
          <div
            className="absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); }}
            title="Close"
          >
            <CloseIcon className="w-5 h-5 text-gray-700" />
          </div>
        </div>
        {/* Details Link */}
        <Link href={`/location/${location.id}`} target="_blank" className="block" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) e.stopPropagation(); }}>
          <div className="p-3">
            <h3 className="font-medium text-lg text-gray-900 truncate">{location.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
            <div className="mt-2"><span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{location.category}</span></div>
          </div>
        </Link>
        {/* Add to Itinerary Button */}
        <div className="px-3 pb-3">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); handleShowAddToDayModal(location); }} className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm">
            <PlusIcon className="w-4 h-4" /><span>Add to itinerary</span>
          </button>
        </div>
      </div>
    );
  }, [isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite, handleShowAddToDayModal]); // Add planner-specific handler

  // Define the action button for the planner list view cards
  const renderPlannerCardActions = useCallback((location: LocationData) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleShowAddToDayModal(location); // Use the handler from PlannerClient state
      }}
      className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
    >
      <PlusIcon className="w-4 h-4" />
      <span>Add to itinerary</span>
    </button>
  ), [handleShowAddToDayModal]);

  // Function to render the list view using the new LocationListView
  const renderPlannerListView = useCallback(({ locations, hoveredLocation, onLocationHover }: {
    locations: LocationData[];
    hoveredLocation: LocationData | null;
    onLocationHover: (location: LocationData | null) => void;
  }) => (
    <LocationListView
      locations={locations}
      onLocationHover={onLocationHover}
      hoveredLocation={hoveredLocation}
      columns={1} // Planner uses 1 column
      // Pass down favorite props
      isLoggedIn={isLoggedIn}
      userFavorites={userFavorites}
      isLoadingFavorite={isLoadingFavorite}
      onToggleFavorite={toggleFavorite}
      // Pass planner-specific action renderer
      renderCardActions={renderPlannerCardActions}
      // Pass link props
      getCardHref={(loc) => `/location/${loc.id}`}
      cardLinkTarget="_blank"
    />
  ), [isLoggedIn, userFavorites, isLoadingFavorite, toggleFavorite, renderPlannerCardActions]); // Add planner-specific action renderer

  // Function to render the plan column view
  const renderPlannerPlanView = useCallback(() => (
     <>
      <div className="p-3 bg-white border-b flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-lg font-medium truncate pr-2">{itineraryName} {isSaving ? <span className="text-sm text-gray-500">(Saving...)</span> : ''}</h2>
        <Button
          size="sm"
          onClick={addDay}
          className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 text-white"
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
                isSelected={false} // Plan column doesn't need selection highlight
                onSelect={() => {}} // No action needed on select here
                onRemove={() => removeDay(day.id)}
                onRemoveLocation={(locationId) => removeLocationFromDay(day.id, locationId)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  ), [itineraryName, isSaving, days, addDay, removeDay, removeLocationFromDay]); // Include all dependencies

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
              )) : <p className="text-sm text-gray-500 p-3">No days available. Add a day first.</p>}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleHideAddToDayModal}>Cancel</Button>
            </div>
          </div>
          <div className="fixed inset-0 z-40" onClick={handleHideAddToDayModal}></div> {/* Backdrop */}
        </div>
      )}

      {/* --- Main Layout --- */}
      <InteractiveMapLayout
        initialLocations={initialLocations} // Pass all available locations
        categories={categories}
        showSearchControls={true} // Show controls above map on desktop
        showAiSearch={true}
        showFilterControls={true}
        mobileNavViews={['map', 'list', 'plan']}
        desktopLayoutConfig={{
          showPlanColumn: true,
          planWidth: 'w-[30%]',
          listWidth: 'w-[30%]',
          mapWidth: 'w-[40%]',
        }}
        filterOptions={{
          showDayFilter: true,
          days: days, // Pass current days from useItinerary
          selectedDayIds: selectedDayIds, // Pass selected day IDs for filtering
          onDayToggle: handleDayFilterToggle, // Pass the handler
        }}
        renderPopupContent={renderPlannerPopupContent}
        renderListView={renderPlannerListView}
        renderPlanView={renderPlannerPlanView}
        locationToDayMap={locationToDayMap} // Pass the map for marker styling
      />
    </div>
  );
}