// components/explore/explore-client.tsx
"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import FilterModal from "../filter-modal"
import ListView from "./explore-list-view"
import EmptyState from "../empty-state"
import { MapIcon, ListBulletIcon, XMarkIcon as CloseIcon } from "@heroicons/react/24/outline"
import { Filter, Wand2, Loader2, XCircleIcon, SearchIcon } from "lucide-react"
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
	const [searchQuery, setSearchQuery] = useState(''); // Current value in the input
	const [activeSearchQuery, setActiveSearchQuery] = useState(''); // The query that was last searched (normal search)
	const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null)
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
	// AI Search State
	const [isAiSearchLoading, setIsAiSearchLoading] = useState(false);
	const [aiSearchResultIds, setAiSearchResultIds] = useState<string[] | null>(null);
	const [aiSearchError, setAiSearchError] = useState<string | null>(null);

	// Ref to store previous dependency values for useEffect comparison
    const prevDepsRef = useRef<{
        selectedCategories: string[];
        showOnlyFavorites: boolean;
        activeSearchQuery: string;
        aiSearchResultIds: string[] | null;
    } | null>(null);

	// --- Derived State ---
	const isAiSearchActive = useMemo(() => aiSearchResultIds !== null, [aiSearchResultIds]);
	const isNormalSearchActive = useMemo(() => activeSearchQuery.trim() !== '', [activeSearchQuery]);
    const isSearchActive = isAiSearchActive || isNormalSearchActive;

	// --- Handlers ---
	const refreshFavorites = async () => {
		await fetchFavorites();
	};

	// Apply filters (including AI search results or active normal search)
	useEffect(() => {
		let newFilteredLocations = initialLocations;
        let fitTriggeredBySearchOrFilter = false;

		// --- AI Search Filter (Overrides others if active) ---
		if (isAiSearchActive) {
			console.log('[ExploreClient] AI Search is active. Filtering by AI results:', aiSearchResultIds);
			newFilteredLocations = initialLocations.filter(location =>
				(aiSearchResultIds ?? []).includes(location.id)
			);
            // Check if AI results actually changed
            if (JSON.stringify(prevDepsRef.current?.aiSearchResultIds) !== JSON.stringify(aiSearchResultIds)) {
                fitTriggeredBySearchOrFilter = true;
            }
		} else {
			// --- Regular Filters (Apply if AI search is NOT active) ---
			console.log('[ExploreClient] AI Search inactive. Applying regular filters.');

			// Apply category filter
			if (selectedCategories.length > 0) {
				newFilteredLocations = newFilteredLocations.filter(location =>
					selectedCategories.includes(location.category)
				);
			}
			// Apply favorite filter
			if (showOnlyFavorites) {
				const currentFavorites = userFavorites; // Use latest favorites
				newFilteredLocations = newFilteredLocations.filter(location =>
					currentFavorites.includes(location.id)
				);
			}
			// Apply ACTIVE search query filter (only if normal search is active)
			if (isNormalSearchActive) {
				console.log('[ExploreClient] Normal Search is active. Filtering by:', activeSearchQuery);
				const lowerCaseQuery = activeSearchQuery.toLowerCase();
				newFilteredLocations = newFilteredLocations.filter(location =>
					location.name.toLowerCase().includes(lowerCaseQuery) ||
					location.description.toLowerCase().includes(lowerCaseQuery) ||
					location.category.toLowerCase().includes(lowerCaseQuery)
				);
                // Check if the active search query actually changed
                if (prevDepsRef.current?.activeSearchQuery !== activeSearchQuery) {
                    fitTriggeredBySearchOrFilter = true;
                }
			}

            // Check if filters changed when no search is active
            if (!isNormalSearchActive && prevDepsRef.current && (
                JSON.stringify(prevDepsRef.current.selectedCategories) !== JSON.stringify(selectedCategories) ||
                prevDepsRef.current.showOnlyFavorites !== showOnlyFavorites
            )) {
                fitTriggeredBySearchOrFilter = true;
            }
		}

		setFilteredLocations(newFilteredLocations);

        // --- Map Fitting Logic ---
        if (newFilteredLocations.length > 0 && fitTriggeredBySearchOrFilter) {
            console.log('[ExploreClient] Fitting map bounds due to search/filter change.');
            setLocationsToFit(newFilteredLocations);
        } else if (newFilteredLocations.length === 0 && fitTriggeredBySearchOrFilter) {
             // If filters result in no locations, maybe reset view or keep current? Resetting for now.
             setLocationsToFit(null);
        }
        // Don't fit if the effect ran for other reasons (e.g., userFavorites update without filter change)

        // Update previous deps ref *after* using it for comparison
        prevDepsRef.current = { selectedCategories, showOnlyFavorites, activeSearchQuery, aiSearchResultIds };

	}, [
		initialLocations,
		selectedCategories,
		showOnlyFavorites,
		userFavorites, // Re-run if favorites change (for the filter)
		activeSearchQuery, // Use active query for filtering
		isAiSearchActive, // Add dependency
		aiSearchResultIds, // Add dependency
        isNormalSearchActive // Add dependency
	]);


	// Filter Handlers for Modal
	const handleCategoryToggle = (category: string) => {
		setAiSearchResultIds(null); // Clear AI search when changing filters
		setActiveSearchQuery(''); // Clear normal search when changing filters
		setSelectedCategories(prev =>
			prev.includes(category)
				? prev.filter(c => c !== category)
				: [...prev, category]
		);
	};
	const handleFavoriteToggle = async () => {
		setAiSearchResultIds(null); // Clear AI search when changing filters
		setActiveSearchQuery(''); // Clear normal search when changing filters
		const newShowOnlyFavorites = !showOnlyFavorites;
		setShowOnlyFavorites(newShowOnlyFavorites);
		if (newShowOnlyFavorites) {
			await refreshFavorites();
		}
	};

	// Update only the input field value
	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
        // If input is cleared, also clear active searches
        if (value.trim() === '') {
            setActiveSearchQuery('');
            setAiSearchResultIds(null);
        }
	}
	// Clear input and active searches
	const handleClearSearch = () => {
		setSearchQuery('');
		setActiveSearchQuery(''); // Clear active normal search
		setAiSearchResultIds(null); // Clear active AI search
		setAiSearchError(null);
        // Reset map view to show all initial locations when search is cleared
        setLocationsToFit(initialLocations);
	}

	// --- Normal Search Handler ---
	const handleNormalSearch = () => {
		if (!searchQuery.trim() || isAiSearchLoading) return; // Prevent search if input empty or AI is loading

		console.log('[ExploreClient] Starting Normal Search for:', searchQuery);
		setActiveSearchQuery(searchQuery); // Set the active search query
		setAiSearchResultIds(null); // Clear any previous AI results
		setAiSearchError(null);
        // Fitting is handled by the useEffect hook reacting to activeSearchQuery change
	};

	// --- AI Search Handler ---
	const handleAiSearch = async () => {
		if (!searchQuery.trim() || isAiSearchLoading) return;

		console.log('[ExploreClient] Starting AI Search for:', searchQuery);
		setIsAiSearchLoading(true);
		setAiSearchError(null);
		setAiSearchResultIds(null); // Clear previous results
		setActiveSearchQuery(''); // Clear normal search state

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
			setAiSearchResultIds(result.matchingLocationIds || []); // This triggers useEffect

            // Fitting is handled by the useEffect hook reacting to aiSearchResultIds change

		} catch (err: any) {
			console.error("[ExploreClient] AI Search Error:", err);
			setAiSearchError(err.message || "An unexpected error occurred during AI search.");
			setAiSearchResultIds(null); // Ensure results are cleared on error
		} finally {
			setIsAiSearchLoading(false);
		}
	};

	// --- Clear Search Handler (used by Clear button) ---
	const handleClearActiveSearch = () => {
		console.log('[ExploreClient] Clearing Active Search results.');
		setAiSearchResultIds(null);
		setAiSearchError(null);
		setActiveSearchQuery(''); // Ensure normal search is also inactive
        // Optionally clear the input field as well
        // setSearchQuery('');
        setLocationsToFit(initialLocations); // Reset map view
	};

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


	// Filter visible locations based on map bounds AND current filters
	const getVisibleLocations = () => {
		// `filteredLocations` already incorporates AI/Normal search results if active
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
		// If AI or Normal search is active, list shows only those results
		if (isSearchActive) {
			return filteredLocations;
		}
		// Otherwise, show locations based on viewport + other filters
		const hasCategoryOrFavoriteFilters = selectedCategories.length > 0 || showOnlyFavorites;
		// If filters are applied, show all matching locations. If no filters, show only visible ones.
		const baseList = hasCategoryOrFavoriteFilters ? filteredLocations : getVisibleLocations();
		return baseList;
	}, [isSearchActive, filteredLocations, selectedCategories, showOnlyFavorites, visibleLocations]); // Removed getVisibleLocations from deps

	// Calculate filter count for badge (excluding search)
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
                // --- Mobile Layout ---
				<div className="h-full relative flex flex-col">
					{/* Mobile Search and Filters */}
					<div className="p-2 bg-white border-b flex gap-2 items-center sticky top-0 z-10 flex-shrink-0">
						<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="flex-grow" placeholder="Search or ask AI..." />
						{/* Normal Search Trigger Button */}
                        <Button
                            variant="outline"
                            size="icon" // Use icon size for mobile
                            className="h-9 w-9" // Explicit size
                            onClick={handleNormalSearch}
                            disabled={!searchQuery.trim()} // Disable if input empty
                            title="Search"
                        >
                            <SearchIcon className="h-4 w-4" />
                            <span className="sr-only">Search</span>
                        </Button>
						{/* AI Search Trigger Button */}
						<Button
							variant="outline"
                            size="icon" // Use icon size for mobile
                            className="h-9 w-9" // Explicit size
							onClick={handleAiSearch}
							disabled={isAiSearchLoading || !searchQuery.trim()} // Disable if loading or input empty
							title="Search with AI"
						>
							{isAiSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
							<span className="sr-only">AI Search</span>
						</Button>
						{/* Filter Button */}
						<Button
                            variant="outline"
                            size="icon" // Use icon size for mobile
                            className="h-9 w-9 relative" // Explicit size
                            onClick={() => setIsFilterModalOpen(true)}
                        >
							<Filter className="h-4 w-4" />
							<span className="sr-only">Filters</span>
							{filterCount > 0 && !isSearchActive && ( // Hide badge if any search is active
								<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
									{filterCount}
								</span>
							)}
						</Button>
					</div>

					{/* Search Active Indicator / Clear Button */}
					{isSearchActive && (
						<div className="p-2 bg-blue-50 border-b text-center text-sm text-blue-700 flex justify-between items-center flex-shrink-0">
							<span>Showing {isAiSearchActive ? 'AI' : ''} search results for "{isAiSearchActive ? searchQuery : activeSearchQuery}"</span>
							<Button variant="ghost" size="sm" onClick={handleClearActiveSearch} className="text-blue-700 hover:bg-blue-100 h-7 px-2">
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
									<EmptyState message={isSearchActive ? "No matching locations found." : "No locations found."} description="Try adjusting your search or filters." />
								)}
							</div>
						)}
					</div>

					{/* Mobile bottom navigation */}
					<div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t p-1 flex justify-around items-center h-[60px] flex-shrink-0">
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
					<div className="w-[60%] h-full flex flex-col overflow-hidden border-r">
						{/* Search Active Indicator / Clear Button */}
						{isSearchActive && (
							<div className="p-2 bg-blue-50 border-b text-center text-sm text-blue-700 flex justify-between items-center flex-shrink-0">
                                <span>Showing {isAiSearchActive ? 'AI' : ''} search results for "{isAiSearchActive ? searchQuery : activeSearchQuery}"</span>
								<Button variant="ghost" size="sm" onClick={handleClearActiveSearch} className="text-blue-700 hover:bg-blue-100 h-7 px-2">
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
								<EmptyState message={isSearchActive ? "No matching locations found." : "No locations found."} description="Try adjusting your search or filters." />
							)}
						</div>
					</div>
					{/* Right Column: Map View with Fixed Controls */}
					<div className="w-[40%] h-full flex flex-col"> {/* Changed to flex-col */}
						{/* Fixed Search and Filters Bar */}
						<div className="p-2 bg-white border-b flex gap-2 items-center flex-shrink-0"> {/* Added flex-shrink-0 */}
							<SearchInput value={searchQuery} onChange={handleSearchChange} onClear={handleClearSearch} className="flex-grow" placeholder="Search or ask AI..." />
							{/* Normal Search Trigger Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={handleNormalSearch}
                                disabled={!searchQuery.trim()} // Disable if input empty
                                title="Search"
                            >
                                <SearchIcon className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only">Search</span> {/* Show text on larger screens */}
                            </Button>
							{/* AI Search Trigger Button */}
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={handleAiSearch}
								disabled={isAiSearchLoading || !searchQuery.trim()} // Disable if loading or input empty
								title="Search with AI"
							>
								{isAiSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
								<span className="sr-only sm:not-sr-only">AI</span> {/* Show text on larger screens */}
							</Button>
							{/* Filter Button */}
							<Button variant="outline" size="sm" className="gap-1.5 relative" onClick={() => setIsFilterModalOpen(true)}>
								<Filter className="h-4 w-4" />
								<span>Filters</span>
								{filterCount > 0 && !isSearchActive && ( // Hide badge if any search is active
									<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
										{filterCount}
									</span>
								)}
							</Button>
						</div>
                        {/* Map Container - Takes remaining space */}
                        <div className="flex-1 overflow-hidden relative"> {/* Added relative for MapView positioning */}
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
				</div>
			)}
		</div>
	)
}