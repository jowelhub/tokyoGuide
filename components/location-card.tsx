"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import type { LocationData } from "@/lib/types"

export interface LocationCardProps {
  location: LocationData
  isHovered: boolean
  onHoverStart: (location: LocationData) => void
  onHoverEnd: () => void
  isLoggedIn: boolean
  isFavorited: boolean
  onToggleFavorite: (locationId: string) => Promise<void | boolean>
  isLoadingFavorite: boolean
  renderActions?: (location: LocationData) => React.ReactNode
  className?: string
  href?: string
  linkTarget?: string
}

export default function LocationCard({
  location,
  isHovered,
  onHoverStart,
  onHoverEnd,
  isLoggedIn,
  isFavorited,
  onToggleFavorite,
  isLoadingFavorite,
  renderActions,
  className,
  href,
  linkTarget
}: LocationCardProps) {
  
  // Local optimistic state for immediate UI feedback
  const [optimisticFavorited, setOptimisticFavorited] = useState(isFavorited);

  // Sync local state when the prop changes (after API call completes)
  useEffect(() => {
    setOptimisticFavorited(isFavorited);
  }, [isFavorited]);
  
  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      // Redirect to login if not logged in
      window.open('/login', '_blank');
      return;
    }
    
    if (isLoadingFavorite) return;
    
    // Update local state immediately for instant feedback
    setOptimisticFavorited(!optimisticFavorited);
    
    // Call the toggle favorite function passed from parent
    await onToggleFavorite(location.id);
    // No need to manually revert here, useEffect will sync when the prop updates
  };

  const cardContent = (
    <>
      {/* Image container with consistent aspect ratio */}
      <div className="relative w-full h-0 pb-[75%]"> {/* 4:3 aspect ratio */}
        <Image
          src={location.images[0] || "/placeholder.svg"}
          alt={location.name}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
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
        
        {/* Render custom actions if provided */}
        {renderActions && (
          <div className="mt-3">
            {renderActions(location)}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "block border rounded-lg overflow-hidden transition-all h-full relative",
        isHovered ? "ring-2 ring-blue-500" : "hover:shadow-md",
        className
      )}
      onMouseEnter={() => onHoverStart(location)}
      onMouseLeave={onHoverEnd}
    >
      {/* Heart icon */}
      <div 
        className="absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
        onClick={handleHeartClick}
        title={isLoggedIn ? (optimisticFavorited ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
      >
        {optimisticFavorited ? 
          <HeartSolid className="w-5 h-5 text-red-500" /> : 
          <HeartOutline className="w-5 h-5 text-gray-700" />
        }
      </div>

      {href ? (
        <Link 
          href={href} 
          target={linkTarget}
          className="block h-full"
        >
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </div>
  )
}
