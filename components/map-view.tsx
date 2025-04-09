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

// --- Popup Styles (Keep as is) ---
const customPopupStyles = `
  .leaflet-popup-content-wrapper { /* ... */ }
  .leaflet-popup-content { /* ... */ }
  /* ... other popup styles ... */
`;

// --- CustomZoomControl (Keep as is) ---
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

// --- ViewportHandler (Keep as is) ---
function ViewportHandler({ locations, onViewportChange }: {
  locations: LocationData[],
  onViewportChange: (locations: LocationData[]) => void
}) {
  const map = useMapEvents({
    moveend: () => updateVisibleLocations(),
    zoomend: () => updateVisibleLocations(),
  });

  const updateVisibleLocations = useCallback(() => {
    if (!map) return;
    const bounds = map.getBounds();
    const visibleLocations = locations.filter(location =>
      location.coordinates && bounds.contains(location.coordinates)
    );
    onViewportChange(visibleLocations);
  }, [map, locations, onViewportChange]); // Added dependencies

  useEffect(() => {
    updateVisibleLocations();
  }, [locations, updateVisibleLocations]); // Re-run if locations or handler changes

  return null;
}


// --- MapBoundsController (Keep as is) ---
function MapBoundsController({ locationsToFit, onBoundsFitted }: {
  locationsToFit: LocationData[] | null;
  onBoundsFitted: () => void;
}) {
  const map = useMap();
  const prevLocationsToFitRef = useRef<LocationData[] | null>(null);

  useEffect(() => {
    if (locationsToFit && locationsToFit !== prevLocationsToFitRef.current) {
      console.log('[MapBoundsController] Fitting bounds to locations:', locationsToFit.length);
      const validLocations = locationsToFit.filter(loc => loc.coordinates && loc.coordinates.length === 2);

      if (validLocations.length === 1) {
        map.flyTo(validLocations[0].coordinates, 15, { animate: true, duration: 0.8 });
      } else if (validLocations.length > 1) {
        const bounds = L.latLngBounds(validLocations.map(loc => loc.coordinates));
        map.flyToBounds(bounds, { padding: [50, 50], animate: true, duration: 0.8 });
      }

      const timer = setTimeout(() => {
        console.log('[MapBoundsController] Bounds fitted, calling callback.');
        onBoundsFitted();
      }, 1000);

      prevLocationsToFitRef.current = locationsToFit;
      return () => clearTimeout(timer);
    } else if (!locationsToFit) {
      prevLocationsToFitRef.current = null;
    }
  }, [locationsToFit, map, onBoundsFitted]);

  return null;
}

// --- Interfaces ---
export interface PopupContentProps {
  location: LocationData;
  isLoggedIn: boolean;
  isFavorited: (locationId: string) => boolean;
  toggleFavorite: (locationId: string) => Promise<boolean>;
  isLoadingFavorite: Record<string, boolean>;
  onAddToDay?: (location: LocationData) => void; // Make optional for Explore
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
  locationToDayMap?: Map<string, number>; // Optional map for day numbers
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
  locationToDayMap, // Destructure the new prop
}: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const popupRef = useRef<L.Popup | null>(null); // Ref to manage the popup instance

  // Internal helper function to generate icons
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

    const svgMarkup = createMarkerSvg(size, color, dayNumber); // Pass dayNumber

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

  useEffect(() => {
    setIsMounted(true);
    const styleEl = document.createElement('style');
    styleEl.textContent = customPopupStyles;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }, []);

  const handleClosePopup = () => {
    if (popupRef.current) {
      popupRef.current._close(); // Use Leaflet's internal close method
    }
  };

  if (!isMounted) {
    return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={MAP_CONFIG.defaultCenter}
        zoom={MAP_CONFIG.defaultZoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution={MAP_CONFIG.attribution}
          url={MAP_CONFIG.tileLayerUrl}
        />
        {locations.filter(loc => loc.coordinates && loc.coordinates.length === 2).map((location) => { // Filter out invalid locations
          const isHovered = hoveredLocation?.id === location.id;
          const dayNumber = locationToDayMap?.get(location.id); // Get day number from map
          const icon = generateInternalMarkerIcon(isHovered, dayNumber); // Pass dayNumber to icon generator

          return (
            <Marker
              key={location.id}
              position={location.coordinates}
              icon={icon}
              eventHandlers={{
                mouseover: () => onLocationHover(location),
                mouseout: () => { if (hoveredLocation?.id === location.id) onLocationHover(null); },
                popupopen: (e) => { popupRef.current = e.popup; }, // Store popup instance on open
                popupclose: () => { popupRef.current = null; }, // Clear ref on close
              }}
            >
              <Popup closeButton={false} autoPan={false} offset={[0, -23]}>
                {/* Pass necessary props to the custom renderer */}
                {renderPopupContent({
                  location,
                  isLoggedIn: false, // These will be overridden by the actual implementation passed in props
                  isFavorited: () => false,
                  toggleFavorite: async () => false,
                  isLoadingFavorite: {},
                  onClosePopup: handleClosePopup,
                  refreshFavorites
                  // onAddToDay is implicitly handled by the specific renderPlannerPopupContent
                })}
              </Popup>
            </Marker>
          );
        })}
        <ViewportHandler locations={locations} onViewportChange={onViewportChange} />
        <MapBoundsController locationsToFit={locationsToFit} onBoundsFitted={onBoundsFitted} />
        <CustomZoomControl />
      </MapContainer>
    </div>
  );
}