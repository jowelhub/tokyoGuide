// components/map-view.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MAP_CONFIG, MARKER_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { createMarkerSvg } from "@/lib/marker-icon";
import type { LocationData } from "@/lib/types";

// --- Popup Styles ---
const customPopupStyles = `
  .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: white; }
  .leaflet-popup-content { margin: 0; padding: 0; width: 280px !important; }
  .leaflet-popup-tip-container { display: none; }
  .airbnb-popup-content { overflow: hidden; border-radius: 8px; }
  .airbnb-popup-close { transition: background-color 0.2s; }
  .airbnb-popup-close:hover { background-color: #f0f0f0; }
  .airbnb-popup-heart { transition: background-color 0.2s; }
  .airbnb-popup-heart:hover { background-color: #f0f0f0; }
`;

// --- CustomZoomControl ---
function CustomZoomControl() {
  const map = useMap();
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col overflow-hidden rounded-md border bg-white shadow">
      <Button variant="outline" size="icon" onClick={handleZoomIn} className="hover:bg-gray-100 h-9 w-9 rounded-none border-b border-border" aria-label="Zoom in">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      </Button>
      <Button variant="outline" size="icon" onClick={handleZoomOut} className="hover:bg-gray-100 h-9 w-9 rounded-none" aria-label="Zoom out">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
      </Button>
    </div>
  );
}

// --- ViewportHandler (with Debounce) ---
function ViewportHandler({ locations, onViewportChange }: {
  locations: LocationData[],
  onViewportChange: (locations: LocationData[]) => void
}) {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY = 200;

  const map = useMapEvents({
    moveend: () => updateVisibleLocations(),
    zoomend: () => updateVisibleLocations(),
    load: () => updateVisibleLocations(),
  });

  const updateVisibleLocations = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (!map) return;
      const bounds = map.getBounds();
      const visibleLocations = locations.filter(location =>
        location.coordinates && bounds.contains(location.coordinates)
      );
      console.log(`[ViewportHandler Debounced] Updating visible locations: ${visibleLocations.length}`);
      onViewportChange(visibleLocations);
    }, DEBOUNCE_DELAY);

  }, [map, locations, onViewportChange]);

  useEffect(() => {
    updateVisibleLocations();
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [locations, updateVisibleLocations]);

  return null;
}
// --- End ViewportHandler ---


// --- MapBoundsController (RE-IMPLEMENTED) ---
function MapBoundsController({ locationsToFit, onBoundsFitted }: {
  locationsToFit: LocationData[] | null;
  onBoundsFitted: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (locationsToFit && locationsToFit.length > 0 && map) {
      console.log(`[MapBoundsController] Fitting bounds for ${locationsToFit.length} locations.`);
      const validCoordinates = locationsToFit
        .map(loc => loc.coordinates)
        .filter((coord): coord is [number, number] => Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number');

      if (validCoordinates.length > 0) {
        const bounds = L.latLngBounds(validCoordinates);
        map.fitBounds(bounds, { padding: [50, 50] }); // Add padding for better UX
        onBoundsFitted(); // Signal that fitting is done
      } else {
         console.warn('[MapBoundsController] No valid coordinates found in locationsToFit.');
         onBoundsFitted(); // Still call this to reset the trigger
      }
    }
  }, [locationsToFit, map, onBoundsFitted]); // Depend on locationsToFit and map

  return null;
}
// --- End MapBoundsController ---

// --- Interfaces ---
export interface PopupContentProps {
  location: LocationData;
  isLoggedIn: boolean;
  isFavorited: (locationId: string) => boolean;
  toggleFavorite: (locationId: string) => Promise<boolean>;
  isLoadingFavorite: Record<string, boolean>;
  onAddToDay?: (location: LocationData) => void;
  onClosePopup: () => void;
  refreshFavorites?: () => Promise<void>;
}

export interface MapViewProps {
  locations: LocationData[];
  onLocationHover: (location: LocationData | null) => void;
  hoveredLocation: LocationData | null;
  onViewportChange: (locationsInViewport: LocationData[]) => void;
  refreshFavorites?: () => Promise<void>;
  renderPopupContent: (props: PopupContentProps) => React.ReactNode;
  locationsToFit: LocationData[] | null; // Prop needed for MapBoundsController
  onBoundsFitted: () => void; // Prop needed for MapBoundsController
  locationToDayMap?: Map<string, number>;
}

// --- MapView Component ---
export default function MapView({
  locations,
  onLocationHover,
  hoveredLocation,
  onViewportChange,
  refreshFavorites,
  renderPopupContent,
  locationsToFit, // Prop is received here
  onBoundsFitted, // Prop is received here
  locationToDayMap,
}: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const popupRef = useRef<L.Popup | null>(null);

  // --- Re-added icon generator ---
  const generateInternalMarkerIcon = (isHovered: boolean, dayNumber?: number): L.DivIcon => {
    const isPlanner = dayNumber !== undefined;
    const baseSize = MARKER_CONFIG.defaultSize;
    const size = isHovered ? Math.floor(baseSize * MARKER_CONFIG.highlightScale) : baseSize;

    let color: string;
    if (isPlanner) {
      color = isHovered ? MARKER_CONFIG.plannerHighlightColor : MARKER_CONFIG.plannerColor;
    } else {
      color = isHovered ? MARKER_CONFIG.defaultHighlightColor : MARKER_CONFIG.defaultColor;
    }

    const svgMarkup = createMarkerSvg(size, color, dayNumber);

    const iconAnchor: [number, number] = [size / 2, size * MARKER_CONFIG.anchorRatioY];
    const popupAnchor: [number, number] = [0, -size * 0.09];
    const tooltipAnchor: [number, number] = [0, -size * 0.73];

    return new L.DivIcon({
      html: svgMarkup,
      className: isHovered ? 'custom-marker-icon-highlighted' : 'custom-marker-icon',
      iconSize: [size, size],
      iconAnchor,
      popupAnchor,
      tooltipAnchor
    });
  };
  // --- End icon generator ---

  useEffect(() => {
    setIsMounted(true);
    const styleEl = document.createElement('style');
    styleEl.textContent = customPopupStyles;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }, []);

  // --- Re-added popup close handler ---
  const handleClosePopup = () => {
    if (popupRef.current) {
      popupRef.current.close(); // Use the public 'close' method
    }
  };
  // --- End popup close handler ---

  if (!isMounted) {
    return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={MAP_CONFIG.defaultCenter}
        zoom={MAP_CONFIG.defaultZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        // Interactions re-enabled
        dragging={true}
        touchZoom={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
        // tap={true} // REMOVED this line
      >
        <TileLayer
          attribution={MAP_CONFIG.attribution}
          url={MAP_CONFIG.tileLayerUrl}
        />

        {/* --- Marker Loop is active --- */}
        {locations.filter(loc => loc.coordinates && loc.coordinates.length === 2).map((location) => {
          const isHovered = hoveredLocation?.id === location.id;
          const dayNumber = locationToDayMap?.get(location.id);
          const icon = generateInternalMarkerIcon(isHovered, dayNumber);

          return (
            <Marker
              key={location.id}
              position={location.coordinates}
              icon={icon}
              eventHandlers={{
                mouseover: () => onLocationHover(location),
                mouseout: () => { if (hoveredLocation?.id === location.id) onLocationHover(null); },
                popupopen: (e) => { popupRef.current = e.popup; },
                popupclose: () => { popupRef.current = null; },
              }}
            >
              {/* --- Popup is active --- */}
              <Popup closeButton={false} autoPan={false} offset={[0, -23]}>
                {renderPopupContent({
                  location,
                  isLoggedIn: false, // These will be overridden by the parent's render function
                  isFavorited: () => false,
                  toggleFavorite: async () => false,
                  isLoadingFavorite: {},
                  onClosePopup: handleClosePopup,
                  refreshFavorites
                })}
              </Popup>
            </Marker>
          );
        })}
        {/* --- End Marker Loop --- */}

        {/* --- ViewportHandler is active (with debounce) --- */}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
        {/* ------------------------------------------------- */}

        {/* MapBoundsController is NOW ACTIVE */}
        <MapBoundsController locationsToFit={locationsToFit} onBoundsFitted={onBoundsFitted} />

        {/* CustomZoomControl is active */}
        <CustomZoomControl />

      </MapContainer>
    </div>
  );
}