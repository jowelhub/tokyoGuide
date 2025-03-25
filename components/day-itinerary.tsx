"use client"

import Image from "next/image"
import { useState } from "react"
import type { LocationData } from "@/lib/types"
import { cn } from "@/lib/utils"
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/outline"

interface DayItineraryProps {
  day: {
    id: number
    locations: LocationData[]
  }
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  onRemoveLocation: (locationId: string) => void
}

export default function DayItinerary({ 
  day, 
  isSelected, 
  onSelect, 
  onRemove,
  onRemoveLocation
}: DayItineraryProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      onSelect()
    }
  }

  return (
    <div className={cn(
      "mb-4 border rounded-lg overflow-hidden",
      isSelected ? "ring-2 ring-blue-500" : ""
    )}>
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
        onClick={toggleExpanded}
      >
        <div className="flex items-center">
          <h3 className="font-medium">Day {day.id}</h3>
          <span className="ml-2 text-sm text-gray-500">{day.locations.length} activities</span>
        </div>
        <div className="flex items-center space-x-2">
          {day.id > 1 && (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Remove day"
            >
              <TrashIcon className="h-4 w-4 text-gray-500" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3">
          {day.locations.length > 0 ? (
            <div className="space-y-3">
              {day.locations.map((location) => (
                <div 
                  key={location.id} 
                  className="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50"
                >
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={location.images[0] || "/placeholder.svg"}
                      alt={location.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{location.name}</h4>
                    <p className="text-sm text-gray-500 truncate">{location.category}</p>
                  </div>
                  <button 
                    onClick={() => onRemoveLocation(location.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Remove from day"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No activities added yet</p>
              <p className="text-sm">Add locations from the map or list</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}