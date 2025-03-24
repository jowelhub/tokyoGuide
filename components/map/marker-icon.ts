import L from "leaflet"
import { MARKER_ICON_CONFIG } from "@/lib/constants"

export const markerIcon = new L.Icon(MARKER_ICON_CONFIG)

// Create a highlighted version of the marker icon using the same base icon
// but with increased size for emphasis rather than a separate image file
export const highlightedMarkerIcon = new L.Icon({
  ...MARKER_ICON_CONFIG,
  iconSize: [35, 57], // Larger size than the default
  iconAnchor: [17, 57], // Adjusted anchor point
})