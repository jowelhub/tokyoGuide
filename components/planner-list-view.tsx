"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { LocationData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { HeartIcon as HeartOutline, PlusIcon } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { createClient } from "@/lib/supabase/client"
import { useFavorites } from "@/hooks/use-favorites"
import { useAuth } from "@/hooks/use-auth"

interface PlannerListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
  refreshFavorites?: () => Promise<void>
  userFavorites?: string[]
  onAddToDay: (location: LocationData) => void
}

export default function PlannerListView({ 
  locations, 
  onLocationHover, 
  hoveredLocation,
  refreshFavorites,
  userFavorites = [],
  onAddToDay
}: PlannerListViewProps) {
  const { isLoggedIn } = useAuth();
  const { toggleFavorite, isLoading } = useFavorites();
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

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .location-card-heart {
        position: absolute;
        left: 8px;
        top: 8px;
        background: #FFFFFF;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .location-card-add {
        position: absolute;
        right: 8px;
        top: 8px;
        background: #FFFFFF;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      styleEl.remove();
    };
  }, []);

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
      // Then refresh parent component state if needed
      if (refreshFavorites) {
        await refreshFavorites();
      }
    }
  };

  const handleAddClick = (e: React.MouseEvent, location: LocationData) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToDay(location);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        {/* Single column layout for planner */}
        <div className="grid grid-cols-1 gap-4">
          {locations.map((location) => (
            <div
              key={location.id}
              className={cn(
                "block border rounded-lg overflow-hidden transition-all h-full relative",
                hoveredLocation?.id === location.id ? "ring-2 ring-blue-500" : "hover:shadow-md"
              )}
              onMouseEnter={() => onLocationHover(location)}
              onMouseLeave={() => onLocationHover(null)}
            >
              {/* Heart icon */}
              <div 
                className="location-card-heart" 
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
              
              <div className="p-4">
                <h3 className="font-medium text-xl text-gray-900">{location.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
                <div className="mt-2">
                  <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                    {location.category}
                  </span>
                </div>
                
                <div className="mt-4">
                  <button 
                    onClick={(e) => handleAddClick(e, location)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add to itinerary</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}