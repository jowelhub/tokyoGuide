// components/explore/explore-client.tsx
"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import type { LocationData } from '@/lib/types';
import type { CategoryData } from '@/lib/supabase/categories';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline, XMarkIcon as CloseIcon } from '@heroicons/react/24/outline';
import InteractiveMapLayout from '@/components/map/interactive-map-layout';
import type { PopupContentProps } from '@/components/map-view';

// Import the consolidated LocationListView
const LocationListView = dynamic(() => import("../location-list-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center">Loading list...</div>,
});

interface ExploreClientProps {
  initialLocations: LocationData[];
  categories: CategoryData[];
}

export default function ExploreClient({ initialLocations, categories }: ExploreClientProps) {
  const { isLoggedIn } = useAuth();
  const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites();

  // Function to render popup content for the Explore view (remains the same)
  const renderExplorePopupContent = ({
    location,
    onClosePopup,
  }: PopupContentProps) => {
    // ... (popup content rendering logic - no changes needed here)
     return (
      <Link href={`/location/${location.id}`} target="_blank" className="block relative">
        <div className="airbnb-popup-close absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); }}>
          <CloseIcon className="w-5 h-5 text-gray-700" />
        </div>
        <div className="airbnb-popup-content">
          <div className="relative w-full h-0 pb-[56.25%]"> {/* Aspect ratio container */}
            <Image src={location.images[0] || "/placeholder.svg"} alt={location.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw"/>
            <div
              className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
              onClick={async (e) => {
                e.preventDefault(); e.stopPropagation();
                if (!isLoggedIn) { window.open('/login', '_blank'); return; }
                if (isLoadingFavorite?.[location.id]) return;
                const success = await toggleFavorite(location.id);
                if (success) {
                  await fetchFavorites();
                }
              }}
              title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
            >
              {isFavorited(location.id) ? <HeartSolid className="w-5 h-5 text-red-500" /> : <HeartOutline className="w-5 h-5 text-gray-700" />}
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-medium text-lg truncate text-gray-900">{location.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
            <div className="mt-2"><span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{location.category}</span></div>
          </div>
        </div>
      </Link>
    );
  };

  // Function to render the list view using the new LocationListView
  const renderExploreListView = ({ locations, hoveredLocation, onLocationHover }: {
    locations: LocationData[];
    hoveredLocation: LocationData | null;
    onLocationHover: (location: LocationData | null) => void;
  }) => (
    <LocationListView
      locations={locations}
      onLocationHover={onLocationHover}
      hoveredLocation={hoveredLocation}
      columns={3} // Explore uses 3 columns
      // Pass down favorite props
      isLoggedIn={isLoggedIn}
      userFavorites={userFavorites}
      isLoadingFavorite={isLoadingFavorite}
      onToggleFavorite={toggleFavorite} // Pass the toggle function directly
      // Pass link props
      getCardHref={(loc) => `/location/${loc.id}`}
      cardLinkTarget="_blank"
      // No custom actions needed for explore cards
      renderCardActions={undefined}
    />
  );

  return (
    <InteractiveMapLayout
      initialLocations={initialLocations}
      categories={categories}
      showSearchControls={true}
      showAiSearch={true}
      showFilterControls={true}
      mobileNavViews={['map', 'list']}
      desktopLayoutConfig={{
        listWidth: 'w-[60%]',
        mapWidth: 'w-[40%]',
        showPlanColumn: false,
      }}
      renderPopupContent={renderExplorePopupContent}
      renderListView={renderExploreListView} // Use the updated render function
      filterOptions={{ showDayFilter: false }}
    />
  );
}