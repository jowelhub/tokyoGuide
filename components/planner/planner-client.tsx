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
import { HeartIcon as HeartOutline, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid, PlusIcon } from "@heroicons/react/24/solid";
import DayItinerary from "@/components/planner/planner-day-itinerary";
import EmptyState from "@/components/empty-state";
import InteractiveMapLayout from "@/components/map/interactive-map-layout";
import type { PopupContentProps } from '@/components/map-view';

// Import the consolidated LocationListView
const LocationListView = dynamic(() => import("../location-list-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center">Loading list...</div>,
});

interface PlannerClientProps {
  itineraryId: number;
  initialItineraryData: ItineraryDay[];
  itineraryName: string;
  initialLocations: LocationData[];
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

  // --- State specific to Planner ---
  const [selectedDayIds, setSelectedDayIds] = useState<number[]>([]);
  const [selectedDayForPlanView, setSelectedDayForPlanView] = useState<number>(days[0]?.id || 1);
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
  const handleDayFilterToggle = (dayId: number) => {
    setSelectedDayIds(prev => prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]);
  };
  const handleSelectDayForPlanView = (dayId: number) => {
    setSelectedDayForPlanView(dayId);
  };
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

  // Popup content for map markers in Planner (remains the same)
  const renderPlannerPopupContent = ({
    location, onClosePopup
  }: PopupContentProps) => {
    // ... (popup content rendering logic - no changes needed here)
     return (
      <div className="airbnb-popup-content">
        {/* Image and Heart/Close Buttons */}
        <div className="relative w-full h-0 pb-[56.25%]">
          <Image src={location.images[0] || "/placeholder.svg"} alt={location.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw"/>
          <div
            className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
            onClick={async (e) => {
              e.preventDefault(); e.stopPropagation();
              if (!isLoggedIn) { window.open('/login', '_blank'); return; }
              if (isLoadingFavorite?.[location.id]) return;
              const success = await toggleFavorite(location.id);
              if (success) await fetchFavorites();
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
  };

  // Define the action button for the planner list view cards
  const renderPlannerCardActions = (location: LocationData) => (
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
  );

  // Function to render the list view using the new LocationListView
  const renderPlannerListView = ({ locations, hoveredLocation, onLocationHover }: {
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
  );

  // Function to render the plan column view (remains the same)
  const renderPlannerPlanView = () => (
    // ... (plan view rendering logic - no changes needed here)
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
                isSelected={day.id === selectedDayForPlanView}
                onSelect={() => handleSelectDayForPlanView(day.id)}
                onRemove={() => removeDay(day.id)}
                onRemoveLocation={(locationId) => removeLocationFromDay(day.id, locationId)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

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
        // ... (modal rendering logic - no changes needed here)
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
        initialLocations={initialLocations}
        categories={categories}
        showSearchControls={true}
        showAiSearch={true}
        showFilterControls={true}
        mobileNavViews={['map', 'list', 'plan']}
        desktopLayoutConfig={{
          showPlanColumn: true,
          planWidth: 'w-[30%]',
          listWidth: 'w-[30%]',
          mapWidth: 'w-[40%]',
        }}
        renderPopupContent={renderPlannerPopupContent}
        renderListView={renderPlannerListView} // Use the updated render function
        renderPlanView={renderPlannerPlanView}
        filterOptions={{
          showDayFilter: true,
          days: days,
          selectedDayIds: selectedDayIds,
          onDayToggle: handleDayFilterToggle,
        }}
        locationToDayMap={locationToDayMap}
      />
    </div>
  );
}