"use client"

import React, { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MAP_CONFIG, MARKER_CONFIG } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { useMap } from "react-leaflet"
import { createMarkerSvg } from "@/lib/marker-icon"
import type { LocationData, MapViewProps } from "@/lib/types"

// Custom styles for Leaflet popups - we'll add this to override default Leaflet styles
const customPopupStyles = `
  .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    width: 320px !important;
  }
  .leaflet-popup-content {
    margin: 0;
    width: 100% !important;
  }
  .leaflet-popup-tip {
    display: none;
  }
  .leaflet-popup-close-button {
    display: none;
  }
  .airbnb-popup-close {
    position: absolute;
    right: 8px;
    top: 8px;
    background: #FFFFFF;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .airbnb-popup-heart {
    position: absolute;
    left: 8px;
    top: 8px;
    background: #FFFFFF;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .airbnb-popup-add {
    position: absolute;
    right: 8px;
    top: 8px;
    background: #FFFFFF;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .airbnb-popup-content {
    width: 100%;
  }
  .airbnb-popup-image-container {
    position: relative;
    width: 100%;
    height: 180px;
  }
  .airbnb-popup-details {
    padding: 12px;
  }
  .airbnb-popup-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 1px;
    color: #222;
  }
  .airbnb-popup-description {
    font-size: 14px;
    color: #717171;
    margin-bottom: 2px;
    line-height: 1.2;
  }
  .airbnb-popup-category {
    display: inline-block;
    font-size: 14px;
    font-weight: 400;
    color: #717171;
  }
`;

// Component for custom zoom controls
function CustomZoomControl() {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    // Group buttons visually, add rounded corners, adjust spacing from bottom
    <div className="absolute bottom-6 right-4 z-10 flex flex-col overflow-hidden rounded-md border bg-white shadow"> {/* Use map-ui level */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomIn}
        // Make button smaller, remove individual shadow/border, adjust rounding
        className="hover:bg-gray-100 h-9 w-9 rounded-none border-b border-border"
        aria-label="Zoom in"
      >
        {/* Increase strokeWidth for bolder icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleZoomOut}
        // Make button smaller, remove individual shadow/border, adjust rounding
        className="hover:bg-gray-100 h-9 w-9 rounded-none"
        aria-label="Zoom out"
      >
        {/* Increase strokeWidth for bolder icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
      </Button>
    </div>
  );
}

// Component to handle viewport changes and update visible locations
function ViewportHandler({
	locations,
	onViewportChange
}: {
	locations: MapViewProps['locations'],
	onViewportChange: MapViewProps['onViewportChange']
}) {
	const map = useMapEvents({
		moveend: () => updateVisibleLocations(),
		zoomend: () => updateVisibleLocations(),
	})

	const updateVisibleLocations = () => {
		if (!map) return
		const bounds = map.getBounds()
		const visibleLocations = locations.filter(location =>
			bounds.contains(location.coordinates)
		)
		onViewportChange(visibleLocations)
	}

	// Initialize visible locations on mount
	useEffect(() => {
		updateVisibleLocations()
	}, [locations]) // Re-run if locations prop changes

	return null
}

// Component to handle fitting bounds when filters change
function MapBoundsController({ locationsToFit, onBoundsFitted }: {
	locationsToFit: LocationData[] | null;
	onBoundsFitted: () => void;
}) {
	const map = useMap();
	const prevLocationsToFitRef = useRef<LocationData[] | null>(null);

	useEffect(() => {
		// Check if locationsToFit has actually changed and is not null
		// Compare references to avoid re-triggering when parent resets it to null
		if (locationsToFit && locationsToFit !== prevLocationsToFitRef.current) {
			console.log('[MapBoundsController] Fitting bounds to locations:', locationsToFit.length);
			if (locationsToFit.length === 1) {
				map.flyTo(locationsToFit[0].coordinates, 15, { animate: true, duration: 0.8 });
			} else if (locationsToFit.length > 1) {
				const bounds = L.latLngBounds(locationsToFit.map(loc => loc.coordinates));
				map.flyToBounds(bounds, { padding: [50, 50], animate: true, duration: 0.8 });
			}

			// Use a timeout slightly longer than the animation to call the callback
			// This ensures the parent resets the state *after* the map starts moving.
			const timer = setTimeout(() => {
				 console.log('[MapBoundsController] Bounds fitted, calling callback.');
				 onBoundsFitted();
			}, 1000); // Adjust timeout if needed

			// Store the current locationsToFit to prevent re-triggering until it changes again
			prevLocationsToFitRef.current = locationsToFit;

			return () => clearTimeout(timer); // Cleanup timeout on effect re-run or unmount
		} else if (!locationsToFit) {
			// Reset the ref when locationsToFit becomes null (after parent calls onBoundsFitted)
			prevLocationsToFitRef.current = null;
		}
	}, [locationsToFit, map, onBoundsFitted]);

	return null;
}
// Define PopupContentProps interface
export interface PopupContentProps {
	location: LocationData
	isLoggedIn: boolean
	isFavorited: (locationId: string) => boolean
	toggleFavorite: (locationId: string) => Promise<boolean>
	isLoadingFavorite: Record<string, boolean>
	onAddToDay?: (location: LocationData) => void
	onClosePopup: () => void
	refreshFavorites?: () => Promise<void>
}

// Extended MapViewProps interface with renderPopupContent
export interface GenericMapViewProps extends Omit<MapViewProps, 'getMarkerIcon'> {
	renderPopupContent: (props: PopupContentProps) => React.ReactNode
	categories?: string[]
	onFilterChange?: (selectedCategories: string[]) => void
	onFavoritesFilterChange?: (showOnlyFavorites: boolean) => void
	onAddToDay?: (location: LocationData) => void
	locations: LocationData[]
	locationsToFit: LocationData[] | null; // Locations to fit bounds to
	onBoundsFitted: () => void; // Callback when bounds have been fitted
	hoveredLocation: LocationData | null // Removed the '?' to match the base interface
	locationToDayMap?: Map<string, number> // New prop for planner view
}

export default function MapView({
	locations,
	onLocationHover,
	hoveredLocation,
	onViewportChange,
	refreshFavorites,
	renderPopupContent,
	locationToDayMap,
	locationsToFit,
	onBoundsFitted
}: GenericMapViewProps) {
	const [isMounted, setIsMounted] = useState(false)

	// Internal helper function to generate icons (moved from lib/marker-icon.ts)
	const generateInternalMarkerIcon = (isHovered: boolean, dayNumber?: number): L.DivIcon => {
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

		// Calculate anchors based on size and configurable ratio
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
	}

	// Debug function to check for invalid locations
	useEffect(() => {
		const invalidLocations = locations.filter(loc =>
			!loc.coordinates || loc.coordinates.length !== 2
		);

		if (invalidLocations.length > 0) {
			console.warn('Found invalid locations:', invalidLocations);
		}
	}, [locations]);

	useEffect(() => {
		setIsMounted(true)

		// Add custom styles to the document head
		const styleEl = document.createElement('style');
		styleEl.textContent = customPopupStyles;
		document.head.appendChild(styleEl);

		return () => {
			styleEl.remove();
		}
	}, [])

	const handleClosePopup = () => {
		// Find and close the Leaflet popup by simulating a click on the default close button
		const closeButton = document.querySelector('.leaflet-popup-close-button') as HTMLElement;
		if (closeButton) {
			closeButton.click();
		}
	};

	if (!isMounted) {
		return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>
	}

	return (
		<div className="h-full w-full relative z-0"> {/* Base map container */}
			<MapContainer
				center={MAP_CONFIG.defaultCenter}
				zoom={MAP_CONFIG.defaultZoom}
				scrollWheelZoom={true}
				style={{ height: "100%", width: "100%" }}
				zoomControl={false} // Disable the default zoom control
			>
				<TileLayer
					attribution={MAP_CONFIG.attribution}
					url={MAP_CONFIG.tileLayerUrl}
				/>
				{locations.map((location) => {
					// Determine hover state and day number
					const isHovered = hoveredLocation?.id === location.id;
					const dayNumber = locationToDayMap?.get(location.id);

					// Generate icon internally
					const icon = generateInternalMarkerIcon(isHovered, dayNumber);

					return (
						<Marker
							key={location.id}
							position={location.coordinates}
							icon={icon}
							eventHandlers={{
								mouseover: () => {
									if (onLocationHover) {
										onLocationHover(location);
									}
								},
								mouseout: () => {
									if (onLocationHover && hoveredLocation?.id === location.id) {
										onLocationHover(null);
									}
								},
							}}
						>
							<Popup closeButton={true} autoPan={false} offset={[0, -23]}>
								{renderPopupContent({
									location,
									isLoggedIn: false, // This will be overridden by the actual implementation
									isFavorited: () => false, // This will be overridden by the actual implementation
									toggleFavorite: async () => false, // This will be overridden by the actual implementation
									isLoadingFavorite: {},
									onClosePopup: handleClosePopup,
									refreshFavorites
								})}
							</Popup>
						</Marker>
					);

				})}
				<ViewportHandler locations={locations} onViewportChange={onViewportChange} />
				<MapBoundsController locationsToFit={locationsToFit} onBoundsFitted={onBoundsFitted} />
				<CustomZoomControl /> {/* Add the custom zoom control */}
			</MapContainer>
		</div>
	)
}