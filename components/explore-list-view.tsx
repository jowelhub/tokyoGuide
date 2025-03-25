"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { LocationData } from "@/lib/types"
import { useFavorites } from "@/hooks/use-favorites"
import { useAuth } from "@/hooks/use-auth"
import LocationCard from "./location-card"

interface ListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
  refreshFavorites?: () => Promise<void>
  userFavorites?: string[]
}

export default function ListView({ 
  locations, 
  onLocationHover, 
  hoveredLocation,
  refreshFavorites,
  userFavorites = []
}: ListViewProps) {
  const { isLoggedIn } = useAuth();
  const { toggleFavorite, isLoading } = useFavorites();
  
  const handleToggleFavorite = async (locationId: string) => {
    if (!isLoggedIn) {
      // Redirect to login if not logged in
      window.open('/login', '_blank');
      return false;
    }
    
    if (isLoading[locationId]) return false;
    
    // Use the toggleFavorite function from the hook
    const success = await toggleFavorite(locationId);
    
    // Then refresh parent component state if needed
    if (success && refreshFavorites) {
      await refreshFavorites();
    }
    
    return success;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Responsive grid layout: 1 column on mobile, 2 on small screens, max 3 on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
              href={`/location/${location.id}`}
              linkTarget="_blank"
            />
          ))}
        </div>
      </div>
    </div>
  )
}