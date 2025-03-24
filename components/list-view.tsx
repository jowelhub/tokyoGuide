"use client"

import Image from "next/image"
import Link from "next/link"
import type { LocationData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { toggleFavorite } from "@/lib/supabase/favorites"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface ListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
}

export default function ListView({ locations, onLocationHover, hoveredLocation }: ListViewProps) {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  // Check if user is logged in and get their favorites
  useEffect(() => {
    const checkAuthAndFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      
      if (user) {
        // Get all favorites for this user
        try {
          const { data } = await supabase
            .from("user_favorites")
            .select("location_id")
            .eq("user_id", user.id);
          
          if (data) {
            const favoritesMap: Record<string, boolean> = {};
            data.forEach(fav => {
              favoritesMap[fav.location_id] = true;
            });
            setFavorites(favoritesMap);
          }
        } catch (error) {
          console.error("Error fetching favorites:", error);
        }
      }
    };
    
    checkAuthAndFavorites();
  }, [supabase]);

  // Add custom styles for the heart icon
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
    
    setIsLoading(prev => ({ ...prev, [locationId]: true }));
    
    try {
      const newStatus = await toggleFavorite(locationId);
      setFavorites(prev => ({ ...prev, [locationId]: newStatus }));
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, [locationId]: false }));
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ maxHeight: "calc(100vh - 70px)" }}>
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
              <div className="relative w-full h-0 pb-[56.25%]"> {/* 16:9 aspect ratio */}
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