// components/explore/explore-client.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import FilterModal from "../filter-modal"
import ListView from "./explore-list-view"
import EmptyState from "../empty-state"
import { MapIcon, ListBulletIcon } from "@heroicons/react/24/outline"
import { Filter } from "lucide-react" // Use lucide-react Filter
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid"
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import Link from "next/link"
import Image from "next/image"
import SearchInput from "@/components/search-input"
import { Button } from "@/components/ui/button"
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
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false); // State for modal

	// Function to refresh favorites
	const refreshFavorites = async () => {
		await fetchFavorites();
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
			const currentFavorites = userFavorites;
			newFilteredLocations = newFilteredLocations.filter(location =>
				currentFavorites.includes(location.id)
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

	// Filter Handlers for Modal
	const handleCategoryToggle = (category: string) => {
		setSelectedCategories(prev =>
			prev.includes(category)
				? prev.filter(c => c !== category)
				: [...prev, category]
		);
	};
	const handleFavoriteToggle = async () => {
		const newShowOnlyFavorites = !showOnlyFavorites;
		setShowOnlyFavorites(newShowOnlyFavorites);
		if (newShowOnlyFavorites) {
			await refreshFavorites();
		}
	};

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
		const boundsFiltered = filteredLocations;
		return visibleLocations.filter(visLoc => boundsFiltered.some(filtLoc => filtLoc.id === visLoc.id));
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
		return (
			<Link href={`/location/${location.id}`} target="_blank" className="block relative">
				<div className="airbnb-popup-close absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); }}>
					<XMarkIcon className="w-5 h-5 text-gray-700" />
				</div>
				<div className="airbnb-popup-content">
					<div className="relative w-full h-0 pb-[56.25%]">
						<Image src={location.images[0] || "/placeholder.svg"} alt={location.name} fill className="object-cover" />
						<div className="airbnb-popup-heart absolute left-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (!isLoggedIn) { window.open('/login', '_blank'); return; } if (isLoadingFavorite?.[location.id]) return; const success = await toggleFavorite(location.id); if (success && refreshFavorites) { await refreshFavorites(); } if (success && !isFavorited(location.id) && showOnlyFavorites) { onClosePopup(); } }} title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}>
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
	const listLocations = searchQuery.trim() !== '' || selectedCategories.length > 0 || showOnlyFavorites
		? filteredLocations
		: getVisibleLocations();

	// Calculate filter count for badge
	const filterCount = selectedCategories.length + (showOnlyFavorites ? 1 : 0);

	// Calculate bottom padding needed for mobile views
	const mobileBottomPadding = "pb-[60px]";

	return (
		<div className="flex-1 flex flex-col h-full">
			{/* Filter Modal */}
			<FilterModal
				isOpen={isFilterModalOpen}
				onClose={() => setIsFilterModalOpen(false)}
				categories={categories.map(cat => cat.name)}
				selectedCategories={selectedCategories}
				onCategoryToggle={handleCategoryToggle}
				showFavoritesFilter={isLoggedIn}
				isFavoriteSelected={showOnlyFavorites}
				onFavoriteToggle={handleFavoriteToggle}
				showDayFilter={false}
			/>

			{/* Mobile: Toggle between map and list views */}
			{isMobile ? (
				<div className="h-full relative flex flex-col">
					{/* Mobile Search and Filters */}
					<div className="p-2 bg-white border-b flex gap-2 items-center">
						<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="flex-grow" />
						<Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsFilterModalOpen(true)}>
							<Filter className="h-4 w-4" /> {/* Use lucide-react Filter */}
							<span>Filters</span>
							{filterCount > 0 && (
								<span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
									{filterCount}
								</span>
							)}
						</Button>
					</div>

					{/* Mobile content area */}
					<div className="flex-1 overflow-hidden">
						{mobileView === "map" && (
							<div className={cn("relative h-full", mobileBottomPadding)}>
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
						{mobileView === "list" && (
							<div className={cn("h-full overflow-y-auto", mobileBottomPadding)}>
								{listLocations.length > 0 ? (
									<ListView locations={listLocations} onLocationHover={handleLocationHover} hoveredLocation={hoveredLocation} refreshFavorites={refreshFavorites} userFavorites={userFavorites} />
								) : (
									<EmptyState message="No locations found matching your criteria." />
								)}
							</div>
						)}
					</div>

					{/* Mobile bottom navigation */}
					<div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t p-1 flex justify-around items-center h-[60px]">
						<button
							onClick={() => setMobileView("map")}
							className={cn(
								"flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full",
								mobileView === "map" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
							)}
						>
							<MapIcon className="w-5 h-5" />
							<span>Map</span>
						</button>
						<button
							onClick={() => setMobileView("list")}
							className={cn(
								"flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full",
								mobileView === "list" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
							)}
						>
							<ListBulletIcon className="w-5 h-5" />
							<span>List</span>
						</button>
					</div>
				</div>
			) : (
				/* Desktop: Side by side layout */
				<div className="flex-1 flex flex-row overflow-hidden h-full">
					<div className="w-[60%] h-full flex flex-col overflow-hidden border-r">
						<div className="flex-1 overflow-y-auto h-screen">
							{listLocations.length > 0 ? (
								<ListView locations={listLocations} onLocationHover={handleLocationHover} hoveredLocation={hoveredLocation} refreshFavorites={refreshFavorites} userFavorites={userFavorites} />
							) : (
								<EmptyState message="No locations found matching your criteria." />
							)}
						</div>
					</div>
					<div className="w-[40%] h-full relative">
						<div className="absolute top-2 left-2 z-10 flex gap-2 items-center bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow">
							<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="w-48" />
							<Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsFilterModalOpen(true)}>
								<Filter className="h-4 w-4" /> {/* Use lucide-react Filter */}
								<span>Filters</span>
								{filterCount > 0 && (
									<span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
										{filterCount}
									</span>
								)}
							</Button>
						</div>
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
				</div>
			)}
		</div>
	)
}