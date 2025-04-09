// components/location-list-view.tsx
"use client"

import type { LocationData } from "@/lib/types"
// Corrected import path using alias
import LocationCard from "@/components/location-card"
import { cn } from "@/lib/utils"

// Define the possible column counts
type ColumnCount = 1 | 2 | 3 | 4;

interface LocationListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
  columns: ColumnCount // Number of columns (1-4)
  // Props needed for LocationCard's favorite functionality
  isLoggedIn: boolean
  userFavorites: string[]
  isLoadingFavorite: Record<string, boolean>
  onToggleFavorite: (locationId: string) => Promise<void | boolean>
  // Optional props for card actions and links
  renderCardActions?: (location: LocationData) => React.ReactNode
  getCardHref?: (location: LocationData) => string
  cardLinkTarget?: string
  listClassName?: string // Optional class for the outer list container
  gridClassName?: string // Optional class for the grid div
}

// Helper function to map column count to Tailwind grid classes
const getGridClasses = (columns: ColumnCount): string => {
  switch (columns) {
    case 1:
      return "grid-cols-1"
    case 2:
      return "grid-cols-1 sm:grid-cols-2"
    case 3:
      // Default responsive grid: 1 col mobile, 2 small, 3 medium+
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
    case 4:
      // Add lg breakpoint for 4 columns
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    default:
      // Fallback to 3 columns (same as case 3)
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
  }
}

export default function LocationListView({
  locations,
  onLocationHover,
  hoveredLocation,
  columns,
  isLoggedIn,
  userFavorites,
  isLoadingFavorite,
  onToggleFavorite,
  renderCardActions,
  getCardHref,
  cardLinkTarget,
  listClassName,
  gridClassName
}: LocationListViewProps) {

  const gridLayoutClasses = getGridClasses(columns);

  return (
    <div className={cn("h-full overflow-y-auto", listClassName)}>
      <div className={cn("p-4", gridClassName)}>
        <div className={cn("grid gap-4", gridLayoutClasses)}>
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isHovered={hoveredLocation?.id === location.id}
              onHoverStart={onLocationHover}
              onHoverEnd={() => onLocationHover(null)}
              // Pass favorite props down
              isLoggedIn={isLoggedIn}
              isFavorited={userFavorites.includes(location.id)}
              onToggleFavorite={onToggleFavorite}
              isLoadingFavorite={!!isLoadingFavorite[location.id]}
              // Pass optional action/link props down
              renderActions={renderCardActions}
              href={getCardHref ? getCardHref(location) : undefined}
              linkTarget={cardLinkTarget}
            />
          ))}
        </div>
      </div>
    </div>
  )
}