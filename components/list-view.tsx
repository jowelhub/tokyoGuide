"use client"

import Image from "next/image"
import Link from "next/link"
import type { LocationData } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
}

export default function ListView({ locations, onLocationHover, hoveredLocation }: ListViewProps) {
  return (
    <div className="h-full overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
      <div className="p-4">
        {/* Responsive grid layout: 1 column on mobile, 2 on small screens, max 3 on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Link
              key={location.id}
              href={`/location/${location.id}`}
              target="_blank"
              className={cn(
                "block border rounded-lg overflow-hidden transition-all h-full",
                hoveredLocation?.id === location.id ? "ring-2 ring-blue-500" : "hover:shadow-md"
              )}
              // Only highlight on hover, don't move the map
              onMouseEnter={() => onLocationHover(location)}
              onMouseLeave={() => onLocationHover(null)}
            >
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