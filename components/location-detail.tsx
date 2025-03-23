"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LocationData } from "@/lib/types"

interface LocationDetailProps {
  location: LocationData
  onClose?: () => void
  isMobile?: boolean
}

export default function LocationDetail({ location, onClose, isMobile }: LocationDetailProps) {
  return (
    <div className="h-full overflow-auto">
      {isMobile && onClose && (
        <div className="sticky top-0 z-10 bg-white border-b p-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-2">{location.name}</h1>
        <div className="mb-6">
          <p className="text-gray-600">{location.description}</p>
        </div>
        {location.images.map((image, index) => (
          <div key={index} className="relative h-64 mb-4 rounded-lg overflow-hidden">
            <Image
              src={image}
              alt={`${location.name} - Image ${index + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}