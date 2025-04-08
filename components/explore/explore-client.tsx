// components/explore/explore-client.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react" // Added useMemo
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import FilterModal from "../filter-modal"
import ListView from "./explore-list-view"
import EmptyState from "../empty-state"
import { MapIcon, ListBulletIcon, XMarkIcon as CloseIcon } from "@heroicons/react/24/outline" // Renamed XMarkIcon
import { Filter, Wand2, Loader2, XCircleIcon } from "lucide-react" // Added Wand2, Loader2, XCircleIcon
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
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

	// --- State ---
	const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
	const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
	const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations)
	const isMobile = useMediaQuery("(max-width: 768px)")
	const [mobileView, setMobileView] = useState<"map" | "list">("map")
	const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const [searchQuery, setSearchQuery] = useState('');
	const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null)
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
	// AI Search State
	const [isAiSearchLoading, setIsAiSearchLoading] = useState(false);
	const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
	const [aiSearchError, setAiSearchError] = useState<string | null>(null);

	// --- Derived State ---
	const isAiSearchActive = useMemo(() => aiSearchResultIds !== null, [aiSearchResultIds]);

	// --- Handlers ---
	const refreshFavorites = async () => {
		await fetchFavorites();
	};

	// Apply filters (including AI search results)
	useEffect(() => {
		let newFilteredLocations = initialLocations;

		// --- AI Search Filter (Overrides others if active) ---
		if (isAiSearchActive) {
			console.log('[ExploreClient] AI Search is active. Filtering by AI results:', aiSearchResultIds);
			newFilteredLocations = initialLocations.filter(location =>
				// FIX: Use nullish coalescing operator to provide default empty array
				(aiSearchResultIds ?? []).includes(location.id)
			);
		} else {
			// --- Regular Filters (Only apply if AI search is NOT active) ---
			console.log('[ExploreClient] AI Search inactive. Applying regular filters.');
			if (selectedCategories.length > 0) {
				newFilteredLocations = newFilteredLocations.filter(location =>
					selectedCategories.includes(location.category)
				);
			}
			if (showOnlyFavorites) {
				const currentFavorites = userFavorites; // Use latest favorites
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
		}

		setFilteredLocations(newFilteredLocations);

		// Trigger map fit only when filters change, not just viewport changes
		// And only if AI search is not active (AI search handles its own fitting)
		// Or if AI search just finished (aiSearchResultIds changed)
		if (newFilteredLocations.length > 0) {
			// Don't fit if only the search query changed, let user explore map
			if (!isAiSearchActive && searchQuery.trim() === '') {
				setLocationsToFit(newFilteredLocations);
			} else if (isAiSearchActive) {
				// Fit is handled by handleAiSearch completion
			} else {
				 setLocationsToFit(null); // Don't fit while typing search query
			}
		} else {
			setLocationsToFit(null); // No locations to fit
		}

	}, [
		initialLocations,
		selectedCategories,
		showOnlyFavorites,
		userFavorites, // Re-run if favorites change (for the filter)
		searchQuery,
		isAiSearchActive, // Add dependency
		aiSearchResultIds // Add dependency
	]);


	// Filter Handlers for Modal
	const handleCategoryToggle = (category: string) => {
		setAiSearchResultIds(null); // Clear AI search when changing filters
		setSelectedCategories(prev =>
			prev.includes(category)
				? prev.filter(c => c !== category)
				: [...prev, category]
		);
	};
	const handleFavoriteToggle = async () => {
		setAiSearchResultIds(null); // Clear AI search when changing filters
		const newShowOnlyFavorites = !showOnlyFavorites;
		setShowOnlyFavorites(newShowOnlyFavorites);
		if (newShowOnlyFavorites) {
			await refreshFavorites();
		}
	};

	const handleSearchChange = (value: string) => {
		setAiSearchResultIds(null); // Clear AI search when typing new query
		setSearchQuery(value);
	}
	const handleClearSearch = () => {
		setAiSearchResultIds(null); // Clear AI search when clearing text search
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

	// --- AI Search Handler ---
	const handleAiSearch = async () => {
		if (!searchQuery.trim() || isAiSearchLoading) return;

		console.log('[ExploreClient] Starting AI Search for:', searchQuery);
		setIsAiSearchLoading(true);
		setAiSearchError(null);
		setAiSearchResultIds(null); // Clear previous results

		try {
			const response = await fetch('/api/explore/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userQuery: searchQuery }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || `AI search failed (status ${response.status})`);
			}

			console.log('[ExploreClient] AI Search successful, results:', result.matchingLocationIds);
			setAiSearchResultIds(result.matchingLocationIds || []);

			// Trigger map fit after results are set
			const matchingLocations = initialLocations.filter(loc =>
				(result.matchingLocationIds || []).includes(loc.id)
			);
			setLocationsToFit(matchingLocations.length > 0 ? matchingLocations : null);


		} catch (err: any) {
			console.error("[ExploreClient] AI Search Error:", err);
			setAiSearchError(err.message || "An unexpected error occurred during AI search.");
			setAiSearchResultIds(null); // Ensure results are cleared on error
		} finally {
			setIsAiSearchLoading(false);
		}
	};

	// --- Clear AI Search Handler ---
	const handleClearAiSearch = () => {
		console.log('[ExploreClient] Clearing AI Search results.');
		setAiSearchResultIds(null);
		setAiSearchError(null);
		// Optionally clear the text search query too, or leave it for regular search
		// setSearchQuery('');

		// Re-trigger fit based on other filters
		// The main useEffect will handle this when aiSearchResultIds becomes null
	};


	// Filter visible locations based on map bounds AND current filters
	const getVisibleLocations = () => {
		// `filteredLocations` already incorporates AI search results if active
		return visibleLocations.filter(visLoc =>
			filteredLocations.some(filtLoc => filtLoc.id === visLoc.id)
		);
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
				{/* Use CloseIcon alias */}
				<div className="airbnb-popup-close absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); }}>
					<CloseIcon className="w-5 h-5 text-gray-700" />
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
	const listLocations = useMemo(() => {
		// If AI search is active, list shows only AI results
		if (isAiSearchActive) {
			return filteredLocations;
		}
		// Otherwise, show locations based on viewport + other filters
		const hasFilters = searchQuery.trim() !== '' || selectedCategories.length > 0 || showOnlyFavorites;
		const baseList = hasFilters ? filteredLocations : getVisibleLocations();
		return baseList;
	}, [isAiSearchActive, filteredLocations, searchQuery, selectedCategories, showOnlyFavorites, visibleLocations]); // Removed getVisibleLocations from deps

	// Calculate filter count for badge (excluding AI search)
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
				showDayFilter={false} // Not needed in explore
			/>

			{/* Mobile: Toggle between map and list views */}
			{isMobile ? (
				<div className="h-full relative flex flex-col">
					{/* Mobile Search and Filters */}
					<div className="p-2 bg-white border-b flex gap-2 items-center sticky top-0 z-10">
						<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="flex-grow" placeholder="Search or ask AI..." />
						{/* AI Search Trigger Button */}
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={handleAiSearch}
							disabled={isAiSearchLoading || !searchQuery.trim()}
							title="Search with AI"
						>
							{isAiSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
							<span className="sr-only">AI Search</span>
						</Button>
						{/* Filter Button */}
						<Button variant="outline" size="sm" className="gap-1.5 relative" onClick={() => setIsFilterModalOpen(true)}>
							<Filter className="h-4 w-4" />
							<span className="hidden sm:inline">Filters</span>
							{filterCount > 0 && !isAiSearchActive && ( // Hide badge if AI search is active
								<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
									{filterCount}
								</span>
							)}
						</Button>
					</div>

					{/* AI Search Active Indicator / Clear Button */}
					{isAiSearchActive && (
						<div className="p-2 bg-blue-50 border-b text-center text-sm text-blue-700 flex justify-between items-center">
							<span>Showing AI search results</span>
							<Button variant="ghost" size="sm" onClick={handleClearAiSearch} className="text-blue-700 hover:bg-blue-100 h-7 px-2">
								<XCircleIcon className="w-4 h-4 mr-1" /> Clear
							</Button>
						</div>
					)}
					{/* AI Search Error Message */}
					{aiSearchError && (
						<div className="p-2 bg-red-50 border-b text-center text-sm text-red-700">
							AI Search Error: {aiSearchError}
						</div>
					)}

					{/* Mobile content area */}
					<div className="flex-1 overflow-hidden">
						{mobileView === "map" && (
							<div className={cn("relative h-full", mobileBottomPadding)}>
								<MapView
									locations={filteredLocations} // Always show filtered locations on map
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
									<EmptyState message={isAiSearchActive ? "AI found no matching locations." : "No locations found."} description="Try adjusting your search or filters." />
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
				/* --- Desktop: Side by side layout (60% List / 40% Map) --- */
				<div className="flex-1 flex flex-row overflow-hidden h-full">
					{/* Left Column: List View */}
					<div className="w-[60%] h-full flex flex-col overflow-hidden border-r"> {/* Corrected width */}
						{/* AI Search Active Indicator / Clear Button */}
						{isAiSearchActive && (
							<div className="p-2 bg-blue-50 border-b text-center text-sm text-blue-700 flex justify-between items-center flex-shrink-0">
								<span>Showing AI search results</span>
								<Button variant="ghost" size="sm" onClick={handleClearAiSearch} className="text-blue-700 hover:bg-blue-100 h-7 px-2">
									<XCircleIcon className="w-4 h-4 mr-1" /> Clear
								</Button>
							</div>
						)}
						{/* AI Search Error Message */}
						{aiSearchError && (
							<div className="p-2 bg-red-50 border-b text-center text-sm text-red-700 flex-shrink-0">
								AI Search Error: {aiSearchError}
							</div>
						)}
						<div className="flex-1 overflow-y-auto">
							{listLocations.length > 0 ? (
								<ListView locations={listLocations} onLocationHover={handleLocationHover} hoveredLocation={hoveredLocation} refreshFavorites={refreshFavorites} userFavorites={userFavorites} />
							) : (
								<EmptyState message={isAiSearchActive ? "AI found no matching locations." : "No locations found."} description="Try adjusting your search or filters." />
							)}
						</div>
					</div>
					{/* Right Column: Map View */}
					<div className="w-[40%] h-full relative"> {/* Corrected width */}
						{/* Search and Filters Overlay */}
						<div className="absolute top-2 left-2 z-10 flex gap-2 items-center bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow">
							<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="w-60" placeholder="Search or ask AI..." />
							{/* AI Search Trigger Button */}
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={handleAiSearch}
								disabled={isAiSearchLoading || !searchQuery.trim()}
								title="Search with AI"
							>
								{isAiSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
								<span className="sr-only">AI Search</span>
							</Button>
							{/* Filter Button */}
							<Button variant="outline" size="sm" className="gap-1.5 relative" onClick={() => setIsFilterModalOpen(true)}>
								<Filter className="h-4 w-4" />
								<span>Filters</span>
								{filterCount > 0 && !isAiSearchActive && ( // Hide badge if AI search is active
									<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
										{filterCount}
									</span>
								)}
							</Button>
						</div>
						<MapView
							locations={filteredLocations} // Always show filtered locations on map
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