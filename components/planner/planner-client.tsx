// components/planner/planner-client.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { LocationData, ItineraryDay } from "@/lib/types"
import type { CategoryData } from "@/lib/supabase/categories"
import FilterModal from "../filter-modal"
import ListView from "@/components/planner/planner-list-view"
import EmptyState from "@/components/empty-state"
import { MapIcon, ListBulletIcon, CalendarIcon } from "@heroicons/react/24/outline"
import { Filter } from "lucide-react" // Use lucide-react Filter
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline"
import { HeartIcon as HeartSolid, PlusIcon } from "@heroicons/react/24/solid"
import DayItinerary from "@/components/planner/planner-day-itinerary"
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
import { useItinerary } from "@/hooks/use-itinerary"
import Image from "next/image"
import SearchInput from "@/components/search-input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map-view"), {
	ssr: false,
	loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
})

interface PlannerClientProps {
	initialLocations: LocationData[]
	categories: CategoryData[]
}

// Helper function to get location IDs from selected days
const getLocationsFromSelectedDays = (days: ItineraryDay[], selectedDayIds: number[]): Set<string> => {
	const locationIds = new Set<string>();
	days.forEach(day => {
		if (selectedDayIds.includes(day.id)) {
			day.locations.forEach(loc => locationIds.add(loc.id));
		}
	});
	return locationIds;
};

export default function PlannerClient({ initialLocations, categories }: PlannerClientProps) {
	const { isLoggedIn } = useAuth();
	const { favorites: userFavorites, refreshFavorites: fetchFavorites, toggleFavorite, isFavorited, isLoading: isLoadingFavorite } = useFavorites();

	const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
	const [hoveredLocation, setHoveredLocation] = useState<LocationData | null>(null)
	const [visibleLocations, setVisibleLocations] = useState<LocationData[]>(initialLocations)
	const isMobile = useMediaQuery("(max-width: 768px)")
	const [mobileView, setMobileView] = useState<"map" | "list" | "plan">("map")
	const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const [selectedDayIds, setSelectedDayIds] = useState<number[]>([])
	const [searchQuery, setSearchQuery] = useState('');
	const [locationsToFit, setLocationsToFit] = useState<LocationData[] | null>(null)
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false); // State for modal

	const {
		days,
		addDay,
		removeDay,
		addLocationToDay,
		removeLocationFromDay,
		isLoading: isItineraryLoading,
		isSaving
	} = useItinerary();

	// Itinerary state
	const [selectedDay, setSelectedDay] = useState<number>(1)
	const [showDaySelector, setShowDaySelector] = useState<boolean>(false)
	const [locationToAdd, setLocationToAdd] = useState<LocationData | null>(null)

	// Create a map of location IDs to day numbers
	const locationToDayMap = useMemo(() => {
		const map = new Map<string, number>();
		days.forEach(day => {
			day.locations.forEach(loc => {
				map.set(loc.id, day.id);
			});
		});
		return map;
	}, [days]);

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
		if (selectedDayIds.length > 0) {
			const allowedLocationIds = getLocationsFromSelectedDays(days, selectedDayIds);
			newFilteredLocations = newFilteredLocations.filter(location =>
				allowedLocationIds.has(location.id)
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
		setFilteredLocations(newFilteredLocations);
		setLocationsToFit(newFilteredLocations.length > 0 ? newFilteredLocations : null);
	}, [initialLocations, selectedCategories, showOnlyFavorites, userFavorites, selectedDayIds, days, searchQuery]);

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
	const handleDayToggle = (dayId: number) => {
		setSelectedDayIds(prev =>
			prev.includes(dayId)
				? prev.filter(id => id !== dayId)
				: [...prev, dayId]
		);
	};

	const handleSearchChange = (value: string) => {
		setSearchQuery(value);
	}
	const handleClearSearch = () => {
		setSearchQuery('');
	}
	const handleBoundsFitted = useCallback(() => {
		setLocationsToFit(null);
	}, []);
	const handleLocationHover = (location: LocationData | null) => {
		setHoveredLocation(location)
	}
	const handleViewportChange = (locationsInViewport: LocationData[]) => {
		setVisibleLocations(locationsInViewport)
	}
	const toggleMobileView = (view: "map" | "list" | "plan") => {
		setMobileView(view)
	}
	const getVisibleLocations = () => {
		const boundsFiltered = filteredLocations;
		return visibleLocations.filter(visLoc => boundsFiltered.some(filtLoc => filtLoc.id === visLoc.id));
	}
	const selectDay = (dayId: number) => {
		setSelectedDay(dayId);
	}
	const showAddToDay = (location: LocationData) => {
		setLocationToAdd(location);
		setShowDaySelector(true);
	}
	const hideAddToDay = () => {
		setShowDaySelector(false);
		setLocationToAdd(null);
	}

	// Function to render popup content for the Planner view
	const renderPlannerPopupContent = ({
		location,
		isLoggedIn,
		isFavorited,
		toggleFavorite,
		isLoadingFavorite,
		onClosePopup,
		refreshFavorites,
		onAddToDay
	}: import("@/components/map-view").PopupContentProps) => {
		return (
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
							if (!isLoggedIn) { window.open('/login', '_blank'); return; }
							if (isLoadingFavorite?.[location.id]) return;
							const success = await toggleFavorite(location.id);
							if (success && refreshFavorites) { await refreshFavorites(); }
						}}
						title={isLoggedIn ? (isFavorited(location.id) ? "Remove from favorites" : "Add to favorites") : "Login to favorite"}
					>
						{isFavorited(location.id) ? <HeartSolid className="w-5 h-5 text-red-500" /> : <HeartOutline className="w-5 h-5 text-gray-700" />}
					</div>
					<div
						className="absolute right-2 top-2 bg-white rounded-full w-8 h-8 flex items-center justify-center z-10 cursor-pointer shadow-sm"
						onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); }}
						title="Close"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
					</div>
				</div>
				<Link href={`/location/${location.id}`} target="_blank" className="block" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) { e.stopPropagation(); } }}>
					<div className="p-4">
						<h3 className="font-medium text-xl text-gray-900">{location.name}</h3>
						<p className="text-sm text-gray-600 line-clamp-2 mt-1">{location.description}</p>
						<div className="mt-2"><span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{location.category}</span></div>
					</div>
				</Link>
				{onAddToDay && (
					<div className="px-4 pb-4">
						<button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClosePopup(); onAddToDay(location); }} className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
							<PlusIcon className="w-5 h-5" /><span>Add to itinerary</span>
						</button>
					</div>
				)}
			</div>
		);
	};

	// Determine which locations to show in the list
	const listLocations = searchQuery.trim() !== '' || selectedCategories.length > 0 || showOnlyFavorites || selectedDayIds.length > 0
		? filteredLocations
		: getVisibleLocations();

	// Calculate filter count for badge
	const filterCount = selectedCategories.length + (showOnlyFavorites ? 1 : 0) + selectedDayIds.length;

	// Calculate bottom padding needed for mobile views
	const mobileBottomPadding = "pb-[60px]";

	return (
		<div className="h-full flex flex-col">
			{/* Add to day selector */}
			{showDaySelector && locationToAdd && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg p-6 max-w-sm w-full z-50">
						<h3 className="text-lg font-medium mb-4">Add to Day</h3>
						<div className="space-y-2 max-h-60 overflow-y-auto">
							{days.map((day) => (
								<button key={day.id} onClick={() => { addLocationToDay(day.id, locationToAdd); hideAddToDay(); }} className="w-full text-left p-2 hover:bg-gray-100 rounded flex justify-between items-center">
									<span>Day {day.id}</span><span className="text-gray-500 text-sm">{day.locations.length} locations</span>
								</button>
							))}
						</div>
						<div className="mt-4 flex justify-end">
							<button onClick={hideAddToDay} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
						</div>
					</div>
					<div className="fixed inset-0 z-40" onClick={hideAddToDay}></div>
				</div>
			)}

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
				showDayFilter={true}
				days={days}
				selectedDayIds={selectedDayIds}
				onDayToggle={handleDayToggle}
			/>

			{/* Mobile: Toggle between map, list, and plan views */}
			{isMobile ? (
				<div className="h-full relative flex flex-col">
					{(mobileView === 'map' || mobileView === 'list') && (
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
					)}

					<div className="flex-1 overflow-hidden">
						{mobileView === "map" && (
							<div className={cn("relative h-full", mobileBottomPadding)}>
								<MapView
									locations={filteredLocations}
									onLocationHover={handleLocationHover}
									hoveredLocation={hoveredLocation}
									onViewportChange={handleViewportChange}
									refreshFavorites={refreshFavorites}
									renderPopupContent={(props) => renderPlannerPopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite, onAddToDay: showAddToDay })}
									locationToDayMap={locationToDayMap}
									locationsToFit={locationsToFit}
									onBoundsFitted={handleBoundsFitted}
								/>
							</div>
						)}
						{mobileView === "list" && (
							<div className={cn("h-full overflow-y-auto", mobileBottomPadding)}>
								<ListView
									locations={listLocations}
									onLocationHover={handleLocationHover}
									hoveredLocation={hoveredLocation}
									refreshFavorites={refreshFavorites}
									userFavorites={userFavorites}
									onAddToDay={showAddToDay}
								/>
							</div>
						)}
						{mobileView === "plan" && (
							<div className={cn("h-full flex flex-col", mobileBottomPadding)}>
								<div className="p-3 bg-white border-b flex justify-between items-center sticky top-0 z-10">
									<h2 className="text-lg font-medium">Your Plan</h2>
									<div className="flex space-x-2">
										<button onClick={addDay} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">Add Day</button>
									</div>
								</div>
								<div className="flex-1 overflow-y-auto p-4">
									{days.length === 0 ? (
										<EmptyState message="No days planned yet" description="Add a day to start planning your trip" />
									) : (
										<div className="space-y-6">
											{days.map((day) => (
												<DayItinerary key={day.id} day={day} isSelected={day.id === selectedDay} onSelect={() => selectDay(day.id)} onRemove={() => removeDay(day.id)} onRemoveLocation={(locationId) => removeLocationFromDay(day.id, locationId)} />
											))}
										</div>
									)}
								</div>
							</div>
						)}
					</div>

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
						<button
							onClick={() => setMobileView("plan")}
							className={cn(
								"flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full",
								mobileView === "plan" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
							)}
						>
							<CalendarIcon className="w-5 h-5" />
							<span>Plan</span>
						</button>
					</div>
				</div>
			) : (
				// Desktop: Three-column layout
				<div className="h-full flex">
					<div className="w-[30%] h-full flex flex-col border-r">
						<div className="p-3 bg-white border-b flex justify-between items-center">
							<h2 className="text-lg font-medium">Your Plan</h2>
							<div className="flex space-x-2">
								<button onClick={addDay} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Add Day</button>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-4">
							{days.length === 0 ? (
								<EmptyState message="No days planned yet" description="Add a day to start planning your trip" />
							) : (
								<div className="space-y-6">
									{days.map((day) => (
										<DayItinerary key={day.id} day={day} isSelected={day.id === selectedDay} onSelect={() => selectDay(day.id)} onRemove={() => removeDay(day.id)} onRemoveLocation={(locationId) => removeLocationFromDay(day.id, locationId)} />
									))}
								</div>
							)}
						</div>
					</div>
					<div className="w-[30%] h-full flex flex-col border-r">
						<div className="flex-1 overflow-y-auto">
							<ListView locations={listLocations} onLocationHover={handleLocationHover} hoveredLocation={hoveredLocation} refreshFavorites={refreshFavorites} userFavorites={userFavorites} onAddToDay={showAddToDay} />
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
							renderPopupContent={(props) => renderPlannerPopupContent({ ...props, isLoggedIn, isFavorited, toggleFavorite, isLoadingFavorite, onAddToDay: showAddToDay })}
							locationToDayMap={locationToDayMap}
							locationsToFit={locationsToFit}
							onBoundsFitted={handleBoundsFitted}
						/>
					</div>
				</div>
			)}
		</div>
	)
}