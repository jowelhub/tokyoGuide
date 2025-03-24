"use client"

import Image from "next/image"
import type { LocationData } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ListViewProps {
  locations: LocationData[]
  onLocationSelect: (location: LocationData) => void
  selectedLocation: LocationData | null
}

export default function ListView({ locations, onLocationSelect, selectedLocation }: ListViewProps) {
  return (
    <div className="h-full overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
      <div className="p-4 space-y-4">
        {locations.map((location) => (
          <div
            key={location.id}
            className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
              selectedLocation?.id === location.id ? "ring-2 ring-blue-500" : "hover:shadow-md"
            }`}
            onClick={() => onLocationSelect(location)}
          >
            <div className="flex items-center gap-4 p-3">
              <div className="w-20 h-20 relative flex-shrink-0 rounded-md overflow-hidden">
                <Image
                  src={location.images[0] || "/placeholder.svg"}
                  alt={location.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-lg truncate">{location.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{location.description}</p>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                    {location.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}