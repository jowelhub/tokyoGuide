// components/planner/planner-list-view.tsx
"use client"

import type { LocationData } from "@/lib/types"
import { PlusIcon } from "@heroicons/react/24/outline"
import { useFavorites } from "@/hooks/use-favorites"
import { useAuth } from "@/hooks/use-auth"
import LocationCard from "../location-card"

interface PlannerListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
  refreshFavorites?: () => Promise<void>
  userFavorites?: string[]
  onAddToDay: (location: LocationData) => void // Callback to open the day selector modal
}

export default function PlannerListView({
  locations,
  onLocationHover,
  hoveredLocation,
  refreshFavorites,
  userFavorites = [],
  onAddToDay // Destructure the callback
}: PlannerListViewProps) {
  const { isLoggedIn } = useAuth();
  const { toggleFavorite, isLoading } = useFavorites();

  const handleToggleFavorite = async (locationId: string) => {
    if (!isLoggedIn) {
      window.open('/login', '_blank');
      return false;
    }
    if (isLoading[locationId]) return false;
    const success = await toggleFavorite(locationId);
    if (success && refreshFavorites) {
      await refreshFavorites();
    }
    return success;
  };

  // Define the action button for the planner list view cards
  const renderActions = (location: LocationData) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToDay(location); // Call the passed-in handler
      }}
      className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
    >
      <PlusIcon className="w-4 h-4" />
      <span>Add to itinerary</span>
    </button>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Single column layout for planner */}
        <div className="grid grid-cols-1 gap-4">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isHovered={hoveredLocation?.id === location.id}
              onHoverStart={onLocationHover}
              onHoverEnd={() => onLocationHover(null)}
              isLoggedIn={isLoggedIn}
              isFavorited={userFavorites.includes(location.id)}
              onToggleFavorite={handleToggleFavorite}
              isLoadingFavorite={!!isLoading[location.id]}
              renderActions={renderActions} // Pass the action renderer
              href={`/location/${location.id}`}
              linkTarget="_blank"
            />
          ))}
        </div>
      </div>
    </div>
  )
}