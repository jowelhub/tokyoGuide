"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import CategoryFilter from "../category-filter"
import ListView from "./explore-list-view"
import EmptyState from "../empty-state"
import { MapIcon, ListBulletIcon } from "@heroicons/react/24/outline"
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import Link from "next/link"
import Image from "next/image"
import SearchInput from "@/components/search-input"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("../map-view"), {
	ssr: false,
	loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

interface ExploreClientProps {
	initialLocations: LocationData[]
	categories: CategoryData[]
}

export default function ExploreClient({ initialLocations, categories }: ExploreClientProps) {
	const { isLoggedIn } = useAuth();
	const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites();
	const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
	const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
	const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations)
	const isMobile = useMediaQuery("(max-width: 768px)")
	const [mobileView, setMobileView] = useState<"map" | "list">("map") // Default to map view on mobile
	const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const [searchQuery, setSearchQuery] = useState(''); // <-- New state for search
	const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null) // State to trigger map bounds adjustment

	// Function to refresh favorites - will be passed to child components
	const refreshFavorites = async () => {
		await fetchFavorites();

		// If we're showing only favorites, we need to update the filtered locations immediately
		if (showOnlyFavorites) {
			// Apply both favorites and category filters
			const newFilteredLocations = initialLocations.filter(location =>
				userFavorites.includes(location.id) &&
				(selectedCategories.length === 0 || selectedCategories.includes(location.category))
			);
			setFilteredLocations(newFilteredLocations);
		}
	};

	// Apply filters whenever selectedCategories, showOnlyFavorites, or searchQuery changes
	useEffect(() => {
		let newFilteredLocations = initialLocations;

		// Apply category filter if any categories are selected
		if (selectedCategories.length > 0) {
			newFilteredLocations = newFilteredLocations.filter(location =>
				selectedCategories.includes(location.category)
			);
		}

		// Apply favorites filter if showOnlyFavorites is true
		if (showOnlyFavorites) {
			newFilteredLocations = newFilteredLocations.filter(location =>
				userFavorites.includes(location.id)
			);
		}

		// Apply search filter if searchQuery is not empty
		if (searchQuery.trim() !== '') {
			const lowerCaseQuery = searchQuery.toLowerCase();
			newFilteredLocations = newFilteredLocations.filter(location =>
				location.name.toLowerCase().includes(lowerCaseQuery) ||
				location.description.toLowerCase().includes(lowerCaseQuery) ||
				location.category.toLowerCase().includes(lowerCaseQuery)
			);
		}

		setFilteredLocations(newFilteredLocations)
		// Set locations for the map to fit, triggering the one-time adjustment
		setLocationsToFit(newFilteredLocations.length > 0 ? newFilteredLocations : null)
	}, [initialLocations, selectedCategories, showOnlyFavorites, userFavorites, searchQuery]) // <-- Added searchQuery dependency

	const handleFilterChange = (selectedCategories: string[]) => {
		setSelectedCategories(selectedCategories);
		// No need to set locationsToFit here, the useEffect will handle it
	}

	const handleFavoritesFilterChange = (showFavorites: boolean) => {
		setShowOnlyFavorites(showFavorites);
		// No need to set locationsToFit here, the useEffect will handle it
	}

	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
		// No need to set locationsToFit here, the useEffect will handle it
	}

	const handleClearSearch = () => {
		setSearchQuery('');
		// No need to set locationsToFit here, the useEffect will handle it
	}

	const handleLocationHover = (location: LocationData | null) => {
		setHoveredLocation(location)
	}

	const handleViewportChange = (locationsInViewport: LocationData[]) => {
		setVisibleLocations(locationsInViewport)
	}

	// Callback to reset locationsToFit after map adjusts
	const handleBoundsFitted = useCallback(() => {
		console.log('[ExploreClient] Map bounds fitted, resetting trigger.');
		setLocationsToFit(null);
	}, []);

	const toggleMobileView = () => {
		setMobileView(mobileView === "map" ? "list" : "map")
	}

	// Filter visible locations based on favorites if needed
	// This remains unchanged, list view depends on this OR filteredLocations based on search
	const getVisibleLocations = () => {
		if (showOnlyFavorites && userFavorites.length > 0) {
			return visibleLocations.filter(location =>
				userFavorites.includes(location.id),
			);
		}
		return visibleLocations;
	}

	// Function to render popup content for the Explore view (Unchanged)
	const renderExplorePopupContent = ({
		location,
		isLoggedIn,
		isFavorited,
		toggleFavorite,
		isLoadingFavorite,
		onClosePopup,
		refreshFavorites,
	}: import("../map-view").PopupContentProps) => {
		return (
			<Link
				href={`/location/${location.id}`}
				target="_blank"
				className="block relative"
			>
				<div
					className="airbnb-popup-close absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onClosePopup();
					}}
				>
					<XMarkIcon className="w-5 h-5 text-gray-700" />
				</div>
				<div className="airbnb-popup-content">
					<div className="relative w-full h-0 pb-[56.25%]">
						<Image
							src={location.images[0] || "/placeholder.svg"}
							alt={location.name}
							fill
							className="object-cover"
						/>
						<div
							className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
							onClick={async (e) => {
								e.preventDefault();
								e.stopPropagation();

								if (!isLoggedIn) {
									window.open('/login', '_blank');
									return;
								}

								if (isLoadingFavorite?.[location.id]) return;

								const success = await toggleFavorite(location.id);
								if (success && refreshFavorites) {
									await refreshFavorites();
								}
								if (success && !isFavorited(location.id) && document.querySelector('[data-favorites-filter="true"]')) {
									onClosePopup();
								}
							}}
							title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
						>
							{isFavorited(location.id) ?
								<HeartSolid className="w-5 h-5 text-red-500" /> :
								<HeartOutline className="w-5 h-5 text-gray-700" />
							}
						</div>
					</div>
					<div className="p-3">
						<h3 className="font-medium text-lg truncate text-gray-900">{location.name}</h3>
						<p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
						<div className="mt-2">
							<span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
								{location.category}
							</span>
						</div>
					</div>
				</div>
			</Link>
		);
	};

	// Determine which locations to show in the list
	const listLocations = searchQuery.trim() !== '' ? filteredLocations : getVisibleLocations();

	return (
		<div className="flex-1 flex flex-col h-full">
			{/* Mobile: Toggle between map and list views */}
			{isMobile ? (
				<div className="h-full relative flex flex-col">
					{/* Mobile Search and Filters */}
					<div className="p-2 bg-white border-b flex gap-2 items-center">
						<SearchInput
							value={searchQuery}
							onChange={handleSearchChange}
							onClear={handleClearSearch}
							className="flex-grow"
						/>
						<CategoryFilter
							categories={categories.map(cat => cat.name)}
							onFilterChange={handleFilterChange}
							onFavoritesFilterChange={handleFavoritesFilterChange}
							refreshFavorites={refreshFavorites}
						/>
					</div>

					{/* Map View */}
					{mobileView === "map" && (
						<>
							<div className="flex-1 relative">
								{/* Filters are now above */}
								<MapView
									locations={filteredLocations} // Pass all filtered locations for map markers
									onLocationHover={handleLocationHover}
									hoveredLocation={hoveredLocation}
									onViewportChange={handleViewportChange}
									refreshFavorites={refreshFavorites}
									renderPopupContent={(props) => renderExplorePopupContent({
										...props,
										isLoggedIn,
										isFavorited,
										toggleFavorite,
										isLoadingFavorite
									})}
									locationsToFit={locationsToFit} // Pass locations to fit bounds
									onBoundsFitted={handleBoundsFitted} // Pass callback
								/>
							</div>

							{/* Button to switch to list view at the bottom */}
							<div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-10">
								<button
									onClick={() => setMobileView("list")}
									className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border"
								>
									<ListBulletIcon className="h-5 w-5" />
									<span>Show list ({listLocations.length} places)</span>
								</button>
							</div>
						</>
					)}

					{/* List View */}
					{mobileView === "list" && (
						<>
							<div className="flex-1 overflow-hidden flex flex-col">
								{/* Button to switch to map view at the top */}
								<div className="sticky top-0 z-10 p-2 bg-white border-b flex justify-center">
									<button
										onClick={() => setMobileView("map")}
										className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border"
									>
										<MapIcon className="h-5 w-5" />
										<span>Show map</span>
									</button>
								</div>

								<div className="flex-1 overflow-y-auto">
									{listLocations.length > 0 ? (
										<ListView
											locations={listLocations} // Use conditional list locations
											onLocationHover={handleLocationHover}
											hoveredLocation={hoveredLocation}
											refreshFavorites={refreshFavorites}
											userFavorites={userFavorites}
										/>
									) : (
										<EmptyState message="No locations found matching your criteria." />
									)}
								</div>
							</div>
						</>
					)}
				</div>
			) : (
				/* Desktop: Side by side layout (60% list, 40% map) */
				<div className="flex-1 flex flex-row overflow-hidden h-full">
					{/* Left side: Scrollable list of locations (60% on desktop) */}
					<div className="w-[60%] h-full flex flex-col overflow-hidden border-r">
						<div className="flex-1 overflow-y-auto h-screen">
							{listLocations.length > 0 ? (
								<ListView
									locations={listLocations} // Use conditional list locations
									onLocationHover={handleLocationHover}
									hoveredLocation={hoveredLocation}
									refreshFavorites={refreshFavorites}
									userFavorites={userFavorites}
								/>
							) : (
								<EmptyState message="No locations found matching your criteria." />
							)}
						</div>
					</div>

					{/* Right side: Fixed map (40% on desktop) with filters at the top-left */}
					<div className="w-[40%] h-full relative">
						{/* Filters Overlay */}
						<div className="absolute top-2 left-2 z-10 flex gap-2 items-center bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow">
							<SearchInput
								value={searchQuery}
								onChange={handleSearchChange}
								onClear={handleClearSearch}
								className="w-48" // Adjust width as needed
							/>
							<CategoryFilter
								categories={categories.map(cat => cat.name)}
								onFilterChange={handleFilterChange}
								onFavoritesFilterChange={handleFavoritesFilterChange}
								refreshFavorites={refreshFavorites}
							/>
						</div>
						<MapView
							locations={filteredLocations} // Pass all filtered locations for map markers
							onLocationHover={handleLocationHover}
							hoveredLocation={hoveredLocation}
							onViewportChange={handleViewportChange}
							refreshFavorites={refreshFavorites}
							renderPopupContent={(props) => renderExplorePopupContent({
								...props,
								isLoggedIn,
								isFavorited,
								toggleFavorite,
								isLoadingFavorite
							})}
							locationsToFit={locationsToFit} // Pass locations to fit bounds
							onBoundsFitted={handleBoundsFitted} // Pass callback
						/>
					</div>
				</div>
			)}
		</div>
	)
}