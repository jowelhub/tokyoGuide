// Map configuration
export const MAP_CONFIG = {
  defaultCenter: [35.6762, 139.6503] as [number, number],
  defaultZoom: 12,
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;

// Marker icon configuration
export const MARKER_ICON_CONFIG = {
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  tooltipAnchor: [0, -46] as [number, number],
  shadowSize: [41, 41] as [number, number],
};
