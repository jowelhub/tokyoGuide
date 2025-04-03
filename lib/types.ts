export interface LocationData {
  id: string
  name: string
  description: string
  category: string
  coordinates: [number, number]
  images: string[]
}

export interface ItineraryDay {
  id: number; // Represents the day number (1, 2, 3...)
  locations: LocationData[];
}

export interface CategoryFilterProps {
  categories: string[]
  onFilterChange: (selectedCategories: string[]) => void
}

export interface ListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
  refreshFavorites?: () => Promise<void>
}

export interface MapViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
  onViewportChange: (locationsInViewport: LocationData[]) => void
  refreshFavorites?: () => Promise<void>
}

