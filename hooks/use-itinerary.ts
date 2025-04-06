// /hooks/use-itinerary.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth'; // Corrected import path if needed
import type { LocationData, ItineraryDay } from '@/lib/types';

// Debounce delay for saving changes (1.5 seconds)
const SAVE_DELAY_MS = 1500;

/**
 * Hook to manage the state and persistence of a specific itinerary.
 * @param itineraryId - The ID of the itinerary to manage.
 * @param initialDays - Initial itinerary data (days and locations) passed from server component.
 */
export function useItinerary(
    itineraryId: number | null,
    initialDays: ItineraryDay[] = []
) {
    // State
    const [days, setDays] = useState<ItineraryDay[]>(initialDays);
    // Loading is true only if no initial data is provided AND we haven't fetched yet OR auth is still loading.
    const [isLoading, setIsLoading] = useState(() => !initialDays || initialDays.length === 0);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // References
    const isItineraryDataInitialized = useRef(!!initialDays && initialDays.length > 0); // Renamed for clarity
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hasPendingChanges = useRef(false);

    // Auth state
    // Destructure isInitialized from useAuth and rename it to avoid conflict
    const { user, isLoggedIn, isLoading: isAuthLoading, isInitialized: isAuthInitialized } = useAuth();

    // --- Fetching Logic (Primarily for fallback/refresh) ---
    const fetchItinerary = useCallback(async (idToFetch: number, showLoadingIndicator = true) => {
        // This check might be redundant now due to the useEffect logic, but keep for safety
        if (!isLoggedIn) {
            setError("Not logged in.");
            setIsLoading(false);
            return;
        }
        if (!idToFetch) {
             setError("Invalid Itinerary ID for fetching.");
             setIsLoading(false);
             return;
        }

        console.log(`[useItinerary] Fetching itinerary ${idToFetch}`);
        if (showLoadingIndicator) {
            setIsLoading(true);
        }
        setError(null);

        try {
            const response = await fetch(`/api/itineraries/${idToFetch}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to load itinerary (status ${response.status})`);
            }

            const itineraryData = await response.json();
            console.log(`[useItinerary] Successfully loaded itinerary: ${itineraryData.id}`);

            setDays(itineraryData.days || []); // Update state with fetched data
            isItineraryDataInitialized.current = true; // Mark as initialized with fetched data

        } catch (err: any) {
            console.error('[useItinerary] Error loading itinerary:', err);
            setError(`Failed to load itinerary: ${err.message}. Please refresh.`);
            // Keep existing state on error if we had initial data
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn]); // Keep isLoggedIn dependency

    // --- Initialization Effect (REVISED) ---
    useEffect(() => {
        // 1. Wait for authentication status AND initialization to be determined
        if (isAuthLoading || !isAuthInitialized) { // <-- Added !isAuthInitialized check
            console.log('[useItinerary Init] Waiting for auth initialization...');
            // Keep isLoading true if we don't have initial data yet
            if (!isItineraryDataInitialized.current) {
                setIsLoading(true);
            }
            return; // Exit effect until auth is fully initialized
        }

        // --- Auth is now fully initialized ---
        console.log(`[useItinerary Init] Auth initialized. isLoggedIn: ${isLoggedIn}, itineraryId: ${itineraryId}, itineraryDataInitialized: ${isItineraryDataInitialized.current}`);

        // 2. Handle cases based on auth status and itineraryId AFTER auth check
        if (isLoggedIn && itineraryId) {
            // Logged in and have an ID
            if (!isItineraryDataInitialized.current) {
                // No initial data was successfully passed or processed, fetch now
                console.log(`[useItinerary Init] Auth ready, no initial data for ${itineraryId}, fetching...`);
                fetchItinerary(itineraryId, true); // Show loading indicator
            } else {
                // Already initialized with data from props, ensure loading is false
                console.log(`[useItinerary Init] Auth ready, already initialized for ${itineraryId}.`);
                setIsLoading(false); // Ensure loading is false if we used initial data
                setError(null); // Clear any potential previous errors
            }
        } else if (!isLoggedIn && itineraryId) {
            // Logged out, but trying to access a specific itinerary page
            console.log(`[useItinerary Init] Auth ready, but user is logged out while accessing ${itineraryId}.`);
            // Don't set the error here anymore, let the page redirect handle it.
            // setError("You need to be logged in to view this itinerary."); // REMOVED/COMMENTED
            setIsLoading(false); // Stop loading
            // setDays([]); // Optionally clear data
        } else if (!itineraryId) {
            // No itinerary ID provided (e.g., on /planner dashboard)
            console.log(`[useItinerary Init] Auth ready, but no itineraryId provided.`);
            // setError("No itinerary selected."); // Not really an error state for the dashboard
            setIsLoading(false);
        } else {
             // Catch-all for logged out on dashboard (no itineraryId) - do nothing, isLoading false
             setIsLoading(false);
        }

    // Added isAuthInitialized to dependencies
    }, [isLoggedIn, isAuthLoading, isAuthInitialized, itineraryId, fetchItinerary]);


    // --- Modification Functions ---

    // Helper to update state and mark pending changes
    const modifyDays = useCallback((modificationFn: (currentDays: ItineraryDay[]) => ItineraryDay[]) => {
        setDays(currentDays => {
            const newDays = modificationFn(currentDays);
            // Simple JSON comparison to check if days actually changed
            if (JSON.stringify(newDays) !== JSON.stringify(currentDays)) {
                hasPendingChanges.current = true;
                console.log('[useItinerary] Changes detected, marking pending.');
            }
            return newDays;
        });
    }, []);

    // Add a new day
    const addDay = useCallback(() => {
        console.log('[useItinerary] Adding new day');
        modifyDays((currentDays) => {
            const nextDayNumber = currentDays.length > 0
                ? Math.max(0, ...currentDays.map(d => d.id)) + 1
                : 1;
            return [...currentDays, { id: nextDayNumber, locations: [] }];
        });
    }, [modifyDays]);

    // Remove a day and renumber subsequent days
    const removeDay = useCallback((dayIdToRemove: number) => {
        console.log(`[useItinerary] Removing day: ${dayIdToRemove}`);
        modifyDays((currentDays) => {
            const daysWithoutRemoved = currentDays.filter(day => day.id !== dayIdToRemove);
            // Renumber days sequentially starting from 1
            const renumberedDays = daysWithoutRemoved.map((day, index) => {
                 return { ...day, id: index + 1 };
            }).sort((a, b) => a.id - b.id); // Ensure sorted order just in case
            console.log(`[useItinerary] Days after removing ${dayIdToRemove}:`, renumberedDays.map(d => d.id));
            return renumberedDays;
        });
    }, [modifyDays]);

    // Add a location to a specific day
    const addLocationToDay = useCallback((dayId: number, location: LocationData) => {
        console.log(`[useItinerary] Adding location ${location.id} to day ${dayId}`);
        modifyDays((currentDays) => {
            return currentDays.map(day => {
                if (day.id === dayId && !day.locations.some(loc => loc.id === location.id)) {
                    return { ...day, locations: [...day.locations, location] };
                }
                return day;
            });
        });
    }, [modifyDays]);

    // Remove a location from a day
    const removeLocationFromDay = useCallback((dayId: number, locationId: string) => {
        console.log(`[useItinerary] Removing location ${locationId} from day ${dayId}`);
        modifyDays((currentDays) => {
            return currentDays.map(day => {
                if (day.id === dayId) {
                    return { ...day, locations: day.locations.filter(loc => loc.id !== locationId) };
                }
                return day;
            });
        });
    }, [modifyDays]);


    // --- Saving Logic ---
    useEffect(() => {
        // Conditions to prevent saving
        // Ensure auth is initialized AND user is logged in AND itinerary data is initialized
        if (!itineraryId || !isAuthInitialized || !isLoggedIn || isAuthLoading || !isItineraryDataInitialized.current) {
             console.log(`[useItinerary Save Effect] Skipping save check. Conditions: itineraryId=${itineraryId}, isAuthInitialized=${isAuthInitialized}, isLoggedIn=${isLoggedIn}, isAuthLoading=${isAuthLoading}, isItineraryDataInitialized=${isItineraryDataInitialized.current}`);
            return;
        }

        if (hasPendingChanges.current) {
            console.log('[useItinerary Save Effect] Pending changes detected. Setting save timer.');
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }

            saveTimerRef.current = setTimeout(async () => {
                // Re-check conditions before making the API call (belt-and-suspenders)
                if (!itineraryId || !isLoggedIn) {
                    console.log('[useItinerary Save] Skipping save: Conditions not met after debounce.');
                    setIsSaving(false);
                    hasPendingChanges.current = false; // Reset flag even if skipped
                    return;
                }

                console.log('[useItinerary Save] Debounce complete, saving changes to itinerary ID:', itineraryId);
                setIsSaving(true);
                setError(null);
                const currentDaysState = days; // Capture current state for the save operation
                hasPendingChanges.current = false; // Reset flag before async call

                try {
                    const response = await fetch(`/api/itineraries/${itineraryId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ days: currentDaysState }), // Send the captured state
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to save itinerary');
                    }

                    console.log('[useItinerary Save] Successfully saved itinerary changes.');
                    // Optional: Update localStorage cache if needed

                } catch (err: any) {
                    console.error('[useItinerary Save] Error saving itinerary:', err);
                    setError(`Failed to save: ${err.message}. Changes might be lost.`);
                    // Consider re-marking as pending on error? Or potentially revert state?
                    // For now, just show error. User might need to refresh.
                    // hasPendingChanges.current = true;
                } finally {
                    setIsSaving(false);
                }
            }, SAVE_DELAY_MS);
        }

        // Cleanup timer on unmount or dependency change
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    // Depend on 'days' stringified to trigger save accurately when content changes
    }, [JSON.stringify(days), itineraryId, isLoggedIn, isAuthInitialized, isAuthLoading]);


    // --- Return Values ---
    return {
        days,
        // Combine loading states: true if auth is loading OR itinerary data isn't initialized yet
        isLoading: isAuthLoading || isLoading,
        isSaving,
        error,
        addDay,
        removeDay,
        addLocationToDay,
        removeLocationFromDay,
        // fetchItinerary // Expose if manual refresh is needed
    };
}