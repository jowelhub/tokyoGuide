export interface LocationData {
  id: string
  name: string
  description: string
  category: string
  coordinates: [number, number]
  images: string[]
}

export interface ViewToggleProps {
  view: "map" | "list"
  onViewChange: (view: "map" | "list") => void
}

export interface CategoryFilterProps {
  categories: string[]
  onFilterChange: (selectedCategories: string[]) => void
}

export interface ListViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
}

export interface MapViewProps {
  locations: LocationData[]
  onLocationHover: (location: LocationData | null) => void
  hoveredLocation: LocationData | null
  onViewportChange: (locationsInViewport: LocationData[]) => void
}