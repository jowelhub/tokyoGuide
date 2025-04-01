// Map configuration
export const MAP_CONFIG = {
  defaultCenter: [35.6762, 139.6503] as [number, number],
  defaultZoom: 12,
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;

// Enhanced marker configuration for SVG markers
export const MARKER_CONFIG = {
  defaultSize: 45, // Base size in pixels
  highlightScale: 1.1, // Scale factor for highlighted markers (~10% bigger)
  defaultColor: '#3b82f6', // Default blue color (Tailwind blue-500)
  defaultHighlightColor: '#1D4ED8', // Darker blue (Tailwind blue-700)
  plannerColor: '#f97316', // Orange color (Tailwind orange-500)
  plannerHighlightColor: '#ea580c', // Darker orange (Tailwind orange-700)
  textColor: '#ffffff', // Color for text/circle inside the pin
};
