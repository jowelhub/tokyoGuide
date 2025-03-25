import { MapPin } from "lucide-react"

interface EmptyStateProps {
  message?: string
  description?: string
}

export default function EmptyState({ message, description }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 relative mb-6">
        <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
          <MapPin className="w-10 h-10 text-gray-400" />
        </div>
      </div>
      <h3 className="text-xl font-medium mb-2">{message || "Select a location"}</h3>
      <p className="text-gray-500 max-w-md">
        {description || "Click on a pin on the map or an item from the list to view details about Tokyo's attractions."}
      </p>
    </div>
  )
}
