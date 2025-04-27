"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MAP_CONFIG, MARKER_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { createMarkerSvg } from "@/lib/marker-icon";
import type { LocationData } from "@/lib/types";

// --- Popup Styles ---
const customPopupStyles = `
  .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: white; min-width: 340px !important; max-width: 340px !important; }
  .leaflet-popup-content { margin: 0; padding: 0; width: 340px !important; }
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
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      if (!map) return;
      const bounds = map.getBounds();
      const visibleLocations = locations.filter(location =>
        location.coordinates && bounds.contains(L.latLng(location.coordinates))
      );
      onViewportChange(visibleLocations);
    }, DEBOUNCE_DELAY);
  }, [map, locations, onViewportChange]);

  useEffect(() => {
    updateVisibleLocations();
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, map]);

  return null;
}

// --- MapBoundsController ---
function MapBoundsController({ locationsToFit, onBoundsFitted }: {
  locationsToFit: LocationData[] | null;
  onBoundsFitted: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (locationsToFit && locationsToFit.length > 0 && map) {
      const validCoordinates = locationsToFit
        .map(loc => loc.coordinates)
        .filter((coord): coord is [number, number] => Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number');
      if (validCoordinates.length > 0) {
        const bounds = L.latLngBounds(validCoordinates);
        if (map.getBoundsZoom(bounds) <= map.getZoom()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
        onBoundsFitted();
      } else {
         onBoundsFitted();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsToFit, map]);
  return null;
}

// --- Interfaces ---
export interface PopupContentProps {
  location: LocationData;
  isLoggedIn: boolean;
  isFavorited: (locationId: string) => boolean;
  toggleFavorite: (locationId: string) => Promise<boolean | void>;
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
  locationsToFit: LocationData[] | null;
  onBoundsFitted: () => void;
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
  locationsToFit,
  onBoundsFitted,
  locationToDayMap,
}: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const popupRef = useRef<L.Popup | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const generateInternalMarkerIcon = useCallback((isHovered: boolean, dayNumber?: number): L.DivIcon => {
    const isPlanner = dayNumber !== undefined;
    const baseSize = MARKER_CONFIG.defaultSize;
    const size = isHovered ? Math.floor(baseSize * MARKER_CONFIG.highlightScale) : baseSize;
    let color: string;
    if (isPlanner) color = isHovered ? MARKER_CONFIG.plannerHighlightColor : MARKER_CONFIG.plannerColor;
    else color = isHovered ? MARKER_CONFIG.defaultHighlightColor : MARKER_CONFIG.defaultColor;
    const svgMarkup = createMarkerSvg(size, color, dayNumber);
    const iconAnchor: [number, number] = [size / 2, size * MARKER_CONFIG.anchorRatioY];
    const popupAnchor: [number, number] = [0, -size * 0.09];
    const tooltipAnchor: [number, number] = [0, -size * 0.73];
    return new L.DivIcon({ html: svgMarkup, className: isHovered ? 'custom-marker-icon-highlighted' : 'custom-marker-icon', iconSize: [size, size], iconAnchor, popupAnchor, tooltipAnchor });
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const styleEl = document.createElement('style');
    styleEl.textContent = customPopupStyles;
    document.head.appendChild(styleEl);
    return () => { styleEl.remove(); };
  }, []);

  const handleClosePopup = useCallback(() => {
    if (popupRef.current) {
        const map = mapRef.current;
        if (map && map.hasLayer(popupRef.current)) {
            map.closePopup(popupRef.current);
        }
        popupRef.current = null;
    }
  }, []);

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
        dragging={true}
        touchZoom={true}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        boxZoom={true}
        keyboard={true}
        ref={mapRef}
      >
        <TileLayer
          attribution={MAP_CONFIG.attribution}
          url={MAP_CONFIG.tileLayerUrl}
        />

        {/* --- Marker Loop --- */}
        {locations.filter(loc => loc.coordinates && loc.coordinates.length === 2).map((location) => {
          const isHovered = hoveredLocation?.id === location.id;
          const dayNumber = locationToDayMap?.get(location.id);
          const icon = generateInternalMarkerIcon(isHovered, dayNumber); // Call directly

          return (
            <Marker
              key={location.id} // Key is crucial
              position={location.coordinates}
              icon={icon}
              eventHandlers={{
                mouseover: (e) => {
                    onLocationHover(location); // Set hover state on mouseover
                },
                mouseout: (e) => {
                    // *** Always clear hover state when mouse leaves THIS marker ***
                    onLocationHover(null);
                },
                popupopen: (e) => {
                    popupRef.current = e.popup;
                },
                popupclose: (e) => {
                    // *** Clear hover state if the closed popup matches the hovered location ***
                    if (hoveredLocation?.id === location.id) {
                        onLocationHover(null);
                    }
                    if (popupRef.current && e.popup && popupRef.current === e.popup) {
                        popupRef.current = null;
                    }
                },
              }}
            >
              <Popup closeButton={false} autoPan={false} offset={[0, -23]}>
                {renderPopupContent({
                  location,
                  isLoggedIn: false, // Placeholder, overridden by parent
                  isFavorited: () => false, // Placeholder
                  toggleFavorite: async () => {}, // Placeholder
                  isLoadingFavorite: {}, // Placeholder
                  onClosePopup: handleClosePopup, // Pass memoized handler
                  refreshFavorites
                })}
              </Popup>
            </Marker>
          );
        })}
        {/* --- End Marker Loop --- */}

        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
        <MapBoundsController locationsToFit={locationsToFit} onBoundsFitted={onBoundsFitted} />
        <CustomZoomControl />
      </MapContainer>
    </div>
  );
}