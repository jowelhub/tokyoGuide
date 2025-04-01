// Since we're using PageClient, we can safely import Leaflet
import L from "leaflet"

// SVG markup for the custom pin icon
const iconHTML = `
<svg
  width="55"
  height="55"
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  style="color: #3b82f6; overflow: visible;"
  class="custom-svg-icon"
>
  <path
    d="M12 22s8-5.5 8-12c0-4.4-3.6-8-8-8S4 5.6 4 10c0 6.5 8 12 8 12z"
    fill="currentColor"
    stroke="white"
    stroke-width="1.5"
    vector-effect="non-scaling-stroke"
  />
  <circle cx="12" cy="10" r="3.5" fill="white" />
</svg>
`;

// SVG markup for the highlighted pin icon
const highlightedIconHTML = `
<svg
  width="55"
  height="55"
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  style="color: #1D4ED8; overflow: visible;"
  class="custom-svg-icon"
>
  <path
    d="M12 22s8-5.5 8-12c0-4.4-3.6-8-8-8S4 5.6 4 10c0 6.5 8 12 8 12z"
    fill="currentColor"
    stroke="white"
    stroke-width="1.5"
    vector-effect="non-scaling-stroke"
  />
  <circle cx="12" cy="10" r="3.5" fill="white" />
</svg>
`;

// Default marker icon configuration
const markerIconOptions = {
  html: iconHTML,
  className: 'custom-marker-icon',
  iconSize: [55, 55],
  iconAnchor: [27.5, 45],
  popupAnchor: [0, -5],
  tooltipAnchor: [0, -40]
};

// Highlighted marker icon configuration
const highlightedMarkerIconOptions = {
  html: highlightedIconHTML,
  className: 'custom-marker-icon-highlighted',
  iconSize: [55, 55],
  iconAnchor: [27.5, 45],
  popupAnchor: [0, -5],
  tooltipAnchor: [0, -40]
};

// Simple function to create marker icons safely
function createIcon(options) {
  // Since we're in a module that might be imported during SSR,
  // we need to ensure we only create L.DivIcon in the browser
  if (typeof window === 'undefined') {
    return null;
  }
  
  return new L.DivIcon(options);
}

// Export marker icons - these will be null during SSR but created on the client
export const markerIcon = createIcon(markerIconOptions);
export const highlightedMarkerIcon = createIcon(highlightedMarkerIconOptions);

// Function to get the standard marker icon
export function getMarkerIcon() {
  return markerIcon || createIcon(markerIconOptions);
}

// Function to get the highlighted marker icon
export function getHighlightedMarkerIcon() {
  return highlightedMarkerIcon || createIcon(highlightedMarkerIconOptions);
}

// Create a numbered marker icon for itinerary days
export function createNumberedMarkerIcon(dayNumber: number, highlighted: boolean = false) {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const svgMarkup = `
  <svg
    width="55"
    height="55"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style="color: ${highlighted ? '#1D4ED8' : '#3b82f6'}; overflow: visible;"
    class="custom-svg-icon"
  >
    <path
      d="M12 22s8-5.5 8-12c0-4.4-3.6-8-8-8S4 5.6 4 10c0 6.5 8 12 8 12z"
      fill="currentColor"
      stroke="white"
      stroke-width="1.5"
      vector-effect="non-scaling-stroke"
    />
    <text
      x="12"
      y="10"
      fill="white"
      font-size="${dayNumber > 9 ? '9px' : '10px'}"
      font-weight="bold"
      text-anchor="middle"
      dominant-baseline="central"
      pointer-events="none"
    >${dayNumber}</text>
  </svg>
  `;

  return new L.DivIcon({
    html: svgMarkup,
    className: highlighted ? 'custom-marker-icon-highlighted' : 'custom-marker-icon',
    iconSize: [55, 55],
    iconAnchor: [27.5, 45],
    popupAnchor: [0, -5],
    tooltipAnchor: [0, -40]
  });
}
