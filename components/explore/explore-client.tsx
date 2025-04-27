// components/explore/explore-client.tsx
"use client";

import React, { useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LocationData } from '@/lib/types';
import type { CategoryData } from '@/lib/supabase/categories';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import type { PopupContentProps } from '@/components/map/map-view';
import InteractiveMapLayout from '@/components/map/interactive-map-layout'; // Import the new layout
import LocationListView from '@/components/location-list-view'; // Import the generic list view
import LocationCardContent from "@/components/location-card-content";
import { XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';

import { cn } from '@/lib/utils';

interface ExploreClientProps {
  initialLocations: LocationData[];
  categories: CategoryData[];
}

export default function ExploreClient({ initialLocations, categories }: ExploreClientProps) {
  const { isLoggedIn } = useAuth();
  const { favorites: userFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavoriteMap } = useFavorites();

  // --- Rendering Functions for Explore ---
  const renderExplorePopupContent = useCallback(({ location, onClosePopup,
    isLoggedIn: popupIsLoggedIn,
    isFavorited: popupIsFavoritedCheck,
    toggleFavorite: popupToggleFavorite,
    isLoadingFavorite: popupIsLoadingFavoriteMap,
  }: PopupContentProps) => {
    const renderCloseButton = () => (
      <div
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-gray-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClosePopup();
        }}
        title="Close"
        aria-label="Close popup"
      >
        <CloseIcon className="w-5 h-5 text-gray-700" />
      </div>
    );
    const thisLocationIsFavorited = popupIsFavoritedCheck(location.id);
    const thisLocationIsLoadingFavorite = !!popupIsLoadingFavoriteMap[location.id];
    return (
      <div className="w-[340px]">
        <LocationCardContent
          location={location}
          isLoggedIn={popupIsLoggedIn}
          isFavorited={thisLocationIsFavorited}
          onToggleFavorite={popupToggleFavorite}
          isLoadingFavorite={thisLocationIsLoadingFavorite}
          renderHeaderActions={renderCloseButton}
          renderFooterActions={undefined}
          imageSizes="340px"
          linkHref={`/location/${location.id}`}
          linkTarget="_blank"
        />
      </div>
    );
  }, []);

  const renderExploreListView = useCallback(({ locations, hoveredLocation, onLocationHover }: {
    locations: LocationData[];
    hoveredLocation: LocationData | null;
    onLocationHover: (location: LocationData | null) => void;
  }) => (
    <LocationListView
      locations={locations}
      onLocationHover={onLocationHover}
      hoveredLocation={hoveredLocation}
      columns={2}
      isLoggedIn={isLoggedIn}
      userFavorites={userFavorites}
      isLoadingFavorite={isLoadingFavoriteMap}
      onToggleFavorite={toggleFavorite}
      getCardHref={(loc) => `/location/${loc.id}`}
      cardLinkTarget="_blank"
      renderCardActions={undefined}
    />
  ), [isLoggedIn, userFavorites, isLoadingFavoriteMap, toggleFavorite]);

  // --- Render the Layout ---
  return (
    <InteractiveMapLayout
      initialLocations={initialLocations}
      categories={categories}
      showSearchControls={true}
      showAiSearch={true}
      showFilterControls={true}
      mobileNavViews={['map', 'list']}
      desktopLayoutConfig={{
        showPlanColumn: false,
        listWidth: 'w-[60%]',
        mapWidth: 'w-[40%]',
      }}
      filterOptions={{
        showDayFilter: false,
      }}
      renderPopupContent={renderExplorePopupContent}
      renderListView={renderExploreListView}
      renderPlanView={undefined}
      locationToDayMap={undefined}
    />
  );
}