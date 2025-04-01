// Since we're using PageClient, we can safely import Leaflet
import L from "leaflet"
import { MARKER_CONFIG } from "@/lib/constants"

/**
 * Creates a marker SVG string with the specified parameters
 */
function createMarkerSvg(
  size: number,
  color: string,
  number?: number
): string {
  // Determine the content inside the marker (number or circle)
  const innerContent = number !== undefined 
    ? `<text
        x="12"
        y="10"
        fill="${MARKER_CONFIG.textColor}"
        font-size="${number > 9 ? '9px' : '10px'}"
        font-weight="bold"
        text-anchor="middle"
        dominant-baseline="central"
        pointer-events="none"
      >${number}</text>`
    : `<circle cx="12" cy="10" r="3.5" fill="${MARKER_CONFIG.textColor}" />`;

  return `
  <svg
    width="${size}"
    height="${size}"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style="color: ${color}; overflow: visible;"
    class="custom-svg-icon"
  >
    <path
      d="M12 22s8-5.5 8-12c0-4.4-3.6-8-8-8S4 5.6 4 10c0 6.5 8 12 8 12z"
      fill="currentColor"
      stroke="white"
      stroke-width="1.5"
      vector-effect="non-scaling-stroke"
    />
    ${innerContent}
  </svg>
  `;
}

/**
 * Generates a marker icon with appropriate styling based on parameters
 */
export function generateMarkerIcon(
  isHovered: boolean = false,
  dayNumber?: number
): L.DivIcon | null {
  // Server-side rendering check
  if (typeof window === 'undefined') {
    return null;
  }
  
  const isPlanner = dayNumber !== undefined;
  const baseSize = MARKER_CONFIG.defaultSize;
  const size = isHovered ? Math.floor(baseSize * MARKER_CONFIG.highlightScale) : baseSize;
  
  // Determine color based on marker type and hover state
  let color: string;
  if (isPlanner) {
    // Planner markers use orange colors
    color = isHovered ? MARKER_CONFIG.plannerHighlightColor : MARKER_CONFIG.plannerColor;
  } else {
    // Default markers use blue colors
    color = isHovered ? MARKER_CONFIG.defaultHighlightColor : MARKER_CONFIG.defaultColor;
  }

  // Generate SVG HTML
  const svgMarkup = createMarkerSvg(size, color, dayNumber);
  
  // Calculate anchors based on size
  const iconAnchor: [number, number] = [size / 2, size * 0.82]; // Position at bottom middle of the pin
  const popupAnchor: [number, number] = [0, -size * 0.09]; // Position popup above pin
  const tooltipAnchor: [number, number] = [0, -size * 0.73]; // Position tooltip above pin
  
  return new L.DivIcon({
    html: svgMarkup,
    className: isHovered ? 'custom-marker-icon-highlighted' : 'custom-marker-icon',
    iconSize: [size, size],
    iconAnchor,
    popupAnchor,
    tooltipAnchor
  });
}
