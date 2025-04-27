"use client";

import Image from "next/image";
import Link from "next/link";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import type { LocationData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LocationCardContentProps {
  location: LocationData;
  isLoggedIn: boolean;
  isFavorited: boolean;
  onToggleFavorite: (locationId: string) => Promise<void | boolean>;
  isLoadingFavorite: boolean;
  renderHeaderActions?: () => React.ReactNode;
  renderFooterActions?: () => React.ReactNode;
  imageSizes: string;
  className?: string;
  linkHref?: string;
  linkTarget?: string;
}

export default function LocationCardContent({
  location,
  isLoggedIn,
  isFavorited,
  onToggleFavorite,
  isLoadingFavorite,
  renderHeaderActions,
  renderFooterActions,
  imageSizes,
  className,
  linkHref,
  linkTarget,
}: LocationCardContentProps) {
  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      window.open('/login', '_blank');
      return;
    }
    if (isLoadingFavorite) return;
    await onToggleFavorite(location.id);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-interactive-area="true"]')) {
      e.preventDefault();
    }
  };

  const cardContent = (
    // Add explicit font and color classes for consistency
    <div className={cn("flex flex-col h-full w-full text-foreground font-sans", className)}>
      {/* Image Section */}
      <div className="relative w-full aspect-[16/9] flex-shrink-0">
        <Image
          src={location.images?.[0] || "/placeholder.svg"}
          alt={location.name}
          fill
          className="object-cover"
          sizes={imageSizes}
          priority={false}
        />
        {/* Favorite Button Overlay */}
        <div
          className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-gray-100"
          onClick={handleHeartClick}
          title={isLoggedIn ? (isFavorited ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          data-interactive-area="true"
        >
          {isFavorited ? (
            <HeartSolid className="w-5 h-5 text-red-500" />
          ) : (
            <HeartOutline className="w-5 h-5 text-gray-700" />
          )}
        </div>
        {/* Header Actions Slot */}
        {renderHeaderActions && (
          <div className="absolute right-2 top-2 z-10" data-interactive-area="true">
             {renderHeaderActions()}
          </div>
        )}
      </div>
      {/* Text/Content Section - REVERTED MARGINS */}
      <div className="p-3 flex-grow flex flex-col">
        <h3 className="font-semibold text-base leading-snug truncate text-gray-900 mb-1">{location.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 leading-tight mt-0.5 mb-2">{location.description}</p>
        <div className="mt-auto pt-1">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {location.category}
          </span>
        </div>
      </div>
      {/* Footer Actions Slot */}
      {renderFooterActions && (
        <div className="px-3 pb-3 pt-1 flex-shrink-0" data-interactive-area="true">
          {renderFooterActions()}
        </div>
      )}
    </div>
  );

  if (linkHref) {
    return (
      <Link
        href={linkHref}
        target={linkTarget}
        className="block h-full w-full"
        onClick={handleLinkClick}
      >
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}
