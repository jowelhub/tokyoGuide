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

// SVG markup for the highlighted pin icon (slightly larger and darker blue)
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

// Create a custom marker icon using DivIcon
export const markerIcon = new L.DivIcon({
  html: iconHTML,
  className: 'custom-marker-icon',
  iconSize: [55, 55],
  iconAnchor: [27.5, 45], // Center of the pin
  popupAnchor: [0, -5], // Position popup closer to the pin
  tooltipAnchor: [0, -40] // Position tooltip closer to the pin
});

// Create a highlighted version of the marker icon
export const highlightedMarkerIcon = new L.DivIcon({
  html: highlightedIconHTML,
  className: 'custom-marker-icon-highlighted',
  iconSize: [55, 55],
  iconAnchor: [27.5, 45], // Center of the pin
  popupAnchor: [0, -5], // Position popup closer to the pin
  tooltipAnchor: [0, -40] // Position tooltip closer to the pin
});
