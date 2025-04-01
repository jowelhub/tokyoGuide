import { MARKER_CONFIG } from "@/lib/constants"

/**
 * Creates a marker SVG string with the specified parameters
 * This function has no dependencies on browser APIs or Leaflet
 */
export function createMarkerSvg(
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
