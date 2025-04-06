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
import { cn } from "@/lib/utils"

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
	const [searchQuery, setSearchQuery] = useState('');
	const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null)

	// Function to refresh favorites
	const refreshFavorites = async () => {
		await fetchFavorites();
		if (showOnlyFavorites) {
			const newFilteredLocations = initialLocations.filter(location =>
				userFavorites.includes(location.id) &&
				(selectedCategories.length === 0 || selectedCategories.includes(location.category))
			);
			setFilteredLocations(newFilteredLocations);
		}
	};

	// Apply filters
	useEffect(() => {
		let newFilteredLocations = initialLocations;
		if (selectedCategories.length > 0) {
			newFilteredLocations = newFilteredLocations.filter(location =>
				selectedCategories.includes(location.category)
			);
		}
		if (showOnlyFavorites) {
			newFilteredLocations = newFilteredLocations.filter(location =>
				userFavorites.includes(location.id)
			);
		}
		if (searchQuery.trim() !== '') {
			const lowerCaseQuery = searchQuery.toLowerCase();
			newFilteredLocations = newFilteredLocations.filter(location =>
				location.name.toLowerCase().includes(lowerCaseQuery) ||
				location.description.toLowerCase().includes(lowerCaseQuery) ||
				location.category.toLowerCase().includes(lowerCaseQuery)
			);
		}
		setFilteredLocations(newFilteredLocations)
		setLocationsToFit(newFilteredLocations.length > 0 ? newFilteredLocations : null)
	}, [initialLocations, selectedCategories, showOnlyFavorites, userFavorites, searchQuery])

	const handleFilterChange = (selectedCategories: string[]) => {
		setSelectedCategories(selectedCategories);
	}
	const handleFavoritesFilterChange = (showFavorites: boolean) => {
		setShowOnlyFavorites(showFavorites);
	}
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
	}
	const handleClearSearch = () => {
		setSearchQuery('');
	}
	const handleLocationHover = (location: LocationData | null) => {
		setHoveredLocation(location)
	}
	const handleViewportChange = (locationsInViewport: LocationData[]) => {
		setVisibleLocations(locationsInViewport)
	}
	const handleBoundsFitted = useCallback(() => {
		console.log('[ExploreClient] Map bounds fitted, resetting trigger.');
		setLocationsToFit(null);
	}, []);

	// Filter visible locations
	const getVisibleLocations = () => {
		if (showOnlyFavorites && userFavorites.length > 0) {
			return visibleLocations.filter(location =>
				userFavorites.includes(location.id),
			);
		}
		return visibleLocations;
	}

	// Function to render popup content for the Explore view
	const renderExplorePopupContent = ({
		location,
		isLoggedIn,
		isFavorited,
		toggleFavorite,
		isLoadingFavorite,
		onClosePopup,
		refreshFavorites,
	}: import("../map-view").PopupContentProps) => {
		// (Popup content remains the same as previous version)
		return (
			<Link href={`/location/${location.id}`} target="_blank" className="block relative">
				<div className="airbnb-popup-close absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); }}>
					<XMarkIcon className="w-5 h-5 text-gray-700" />
				</div>
				<div className="airbnb-popup-content">
					<div className="relative w-full h-0 pb-[56.25%]">
						<Image src={location.images[0] || "/placeholder.svg"} alt={location.name} fill className="object-cover" />
						<div className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (!isLoggedIn) { window.open('/login', '_blank'); return; } if (isLoadingFavorite?.[location.id]) return; const success = await toggleFavorite(location.id); if (success && refreshFavorites) { await refreshFavorites(); } if (success && !isFavorited(location.id) && document.querySelector('[data-favorites-filter="true"]')) { onClosePopup(); } }} title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}>
							{isFavorited(location.id) ? <HeartSolid className="w-5 h-5 text-red-500" /> : <HeartOutline className="w-5 h-5 text-gray-700" />}
						</div>
					</div>
					<div className="p-3">
						<h3 className="font-medium text-lg truncate text-gray-900">{location.name}</h3>
						<p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
						<div className="mt-2"><span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{location.category}</span></div>
					</div>
				</div>
			</Link>
		);
	};

	// Determine which locations to show in the list
	const listLocations = searchQuery.trim() !== '' ? filteredLocations : getVisibleLocations();

	// Calculate bottom padding needed for mobile views
	const mobileBottomPadding = "pb-[60px]"; // Adjust this value based on the final height of the bottom nav

	return (
		<div className="flex-1 flex flex-col h-full">
			{/* Mobile: Toggle between map and list views */}
			{isMobile ? (
				<div className="h-full relative flex flex-col">
					{/* Mobile Search and Filters */}
					<div className="p-2 bg-white border-b flex gap-2 items-center">
						<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="flex-grow" />
						<CategoryFilter categories={categories.map(cat => cat.name)} onFilterChange={handleFilterChange} onFavoritesFilterChange={handleFavoritesFilterChange} refreshFavorites={refreshFavorites} />
					</div>

					{/* Mobile content area */}
					<div className="flex-1 overflow-hidden"> {/* Removed pb-16 here */}
						{/* Map View */}
						{mobileView === "map" && (
							<div className={cn("relative h-full", mobileBottomPadding)}> {/* Added padding here */}
								<MapView
									locations={filteredLocations}
									onLocationHover={handleLocationHover}
									hoveredLocation={hoveredLocation}
									onViewportChange={handleViewportChange}
									refreshFavorites={refreshFavorites}
									renderPopupContent={(props) => renderExplorePopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite })}
									locationsToFit={locationsToFit}
									onBoundsFitted={handleBoundsFitted}
								/>
							</div>
						)}

						{/* List View */}
						{mobileView === "list" && (
							<div className={cn("h-full overflow-y-auto", mobileBottomPadding)}> {/* Added padding here */}
								{listLocations.length > 0 ? (
									<ListView locations={listLocations} onLocationHover={handleLocationHover} hoveredLocation={hoveredLocation} refreshFavorites={refreshFavorites} userFavorites={userFavorites} />
								) : (
									<EmptyState message="No locations found matching your criteria." />
								)}
							</div>
						)}
					</div>

					{/* Mobile bottom navigation - Adjusted layout */}
					<div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t p-1 flex justify-around items-center h-[60px]"> {/* Use mobile-nav level */}
						<button
							onClick={() => setMobileView("map")}
							className={cn(
								"flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full", // Use h-full
								mobileView === "map" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
							)}
						>
							<MapIcon className="w-5 h-5" />
							<span>Map</span>
						</button>
						<button
							onClick={() => setMobileView("list")}
							className={cn(
								"flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full", // Use h-full
								mobileView === "list" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
							)}
						>
							<ListBulletIcon className="w-5 h-5" />
							<span>List</span>
						</button>
					</div>
				</div>
			) : (
				/* Desktop: Side by side layout (60% list, 40% map) - Remains unchanged */
				<div className="flex-1 flex flex-row overflow-hidden h-full">
					{/* Left side: Scrollable list of locations (60% on desktop) */}
					<div className="w-[60%] h-full flex flex-col overflow-hidden border-r">
						<div className="flex-1 overflow-y-auto h-screen">
							{listLocations.length > 0 ? (
								<ListView locations={listLocations} onLocationHover={handleLocationHover} hoveredLocation={hoveredLocation} refreshFavorites={refreshFavorites} userFavorites={userFavorites} />
							) : (
								<EmptyState message="No locations found matching your criteria." />
							)}
						</div>
					</div>

					{/* Right side: Fixed map (40% on desktop) with filters at the top-left */}
					<div className="w-[40%] h-full relative">
						{/* Filters Overlay */}
						<div className="absolute top-2 left-2 z-10 flex gap-2 items-center bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow"> {/* Use map-ui level */}
							<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="w-48" />
							<CategoryFilter categories={categories.map(cat => cat.name)} onFilterChange={handleFilterChange} onFavoritesFilterChange={handleFavoritesFilterChange} refreshFavorites={refreshFavorites} />
						</div>
						<MapView locations={filteredLocations} onLocationHover={handleLocationHover} hoveredLocation={hoveredLocation} onViewportChange={handleViewportChange} refreshFavorites={refreshFavorites} renderPopupContent={(props) => renderExplorePopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite })} locationsToFit={locationsToFit} onBoundsFitted={handleBoundsFitted} />
					</div>
				</div>
			)}
		</div>
	)
}