"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { LocationData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { useFavorites } from "@/hooks/use-favorites"
import { useAuth } from "@/hooks/use-auth"

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
  const { toggleFavorite, isLoading, isFavorited } = useFavorites();
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  
  // Initialize favorites from userFavorites prop
  useEffect(() => {
    if (userFavorites.length > 0) {
      const favoritesMap: Record<string, boolean> = {};
      userFavorites.forEach(locationId => {
        favoritesMap[locationId] = true;
      });
      setFavorites(favoritesMap);
    }
  }, [userFavorites]);

  const handleHeartClick = async (e: React.MouseEvent, locationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      // Redirect to login if not logged in
      window.open('/login', '_blank');
      return;
    }
    
    if (isLoading[locationId]) return;
    
    // Use the toggleFavorite function from the hook
    const success = await toggleFavorite(locationId);
    
    if (success) {
      // Update local state for immediate feedback
      setFavorites(prev => ({
        ...prev,
        [locationId]: !prev[locationId]
      }));
      
      // Then refresh parent component state if needed
      if (refreshFavorites) {
        await refreshFavorites();
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Responsive grid layout: 1 column on mobile, 2 on small screens, max 3 on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Link
              key={location.id}
              href={`/location/${location.id}`}
              target="_blank"
              className={cn(
                "block border rounded-lg overflow-hidden transition-all h-full relative",
                hoveredLocation?.id === location.id ? "ring-2 ring-blue-500" : "hover:shadow-md"
              )}
              // Only highlight on hover, don't move the map
              onMouseEnter={() => onLocationHover(location)}
              onMouseLeave={() => onLocationHover(null)}
            >
              {/* Heart icon */}
              <div 
                className="absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" 
                onClick={(e) => handleHeartClick(e, location.id)}
                title={isLoggedIn ? (favorites[location.id] ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
              >
                {favorites[location.id] ? 
                  <HeartSolid className="w-5 h-5 text-red-500" /> : 
                  <HeartOutline className="w-5 h-5 text-gray-700" />
                }
              </div>

              {/* Image container with consistent aspect ratio */}
              <div className="relative w-full h-0 pb-[75%]"> {/* 4:3 aspect ratio */}
                <Image
                  src={location.images[0] || "/placeholder.svg"}
                  alt={location.name}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="p-3">
                <h3 className="font-medium text-lg truncate">{location.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                    {location.category}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}