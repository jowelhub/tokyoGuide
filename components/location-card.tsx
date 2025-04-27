"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import type { LocationData } from "@/lib/types"
import LocationCardContent from "@/components/location-card-content"

export interface LocationCardProps {
  location: LocationData;
  isHovered: boolean;
  onHoverStart: (location: LocationData) => void;
  onHoverEnd: () => void;
  isLoggedIn: boolean;
  isFavorited: boolean;
  onToggleFavorite: (locationId: string) => Promise<void | boolean>;
  isLoadingFavorite: Record<string, boolean>;
  renderCardActions?: (location: LocationData) => React.ReactNode;
  className?: string;
  href?: string;
  linkTarget?: string;
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
  renderCardActions,
  className,
  href,
  linkTarget
}: LocationCardProps) {
  // Determine loading state for this specific card
  const thisCardIsLoadingFavorite = !!isLoadingFavorite[location.id];

  return (
    <div
      className={cn(
        "block border rounded-lg overflow-hidden transition-all h-full relative bg-white",
        isHovered ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md",
        className
      )}
      onMouseEnter={() => onHoverStart(location)}
      onMouseLeave={onHoverEnd}
    >
      <LocationCardContent
        location={location}
        isLoggedIn={isLoggedIn}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
        isLoadingFavorite={thisCardIsLoadingFavorite}
        renderFooterActions={renderCardActions ? () => renderCardActions(location) : undefined}
        renderHeaderActions={undefined}
        imageSizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
        linkHref={href}
        linkTarget={linkTarget}
      />
    </div>
  );
}
