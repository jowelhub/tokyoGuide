// /hooks/use-itinerary.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
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
    // Loading is true only if no initial data is provided AND we haven't fetched yet.
    const [isLoading, setIsLoading] = useState(() => !initialDays || initialDays.length === 0);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // References
    const isInitialized = useRef(!!initialDays && initialDays.length > 0);
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hasPendingChanges = useRef(false);

    // Auth state
    const { user, isLoggedIn, isLoading: isAuthLoading } = useAuth();

    // --- Fetching Logic (Primarily for fallback/refresh) ---
    const fetchItinerary = useCallback(async (idToFetch: number, showLoadingIndicator = true) => {
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
            isInitialized.current = true;

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
        // 1. Wait for authentication status to be determined
        if (isAuthLoading) {
            console.log('[useItinerary Init] Waiting for auth...');
            // Keep isLoading true if we don't have initial data yet
            if (!isInitialized.current) {
                setIsLoading(true);
            }
            return;
        }

        // 2. Handle cases based on auth status and itineraryId AFTER auth check
        if (isLoggedIn && itineraryId) {
            // Logged in and have an ID
            if (!isInitialized.current) {
                // No initial data was successfully passed or processed, fetch now
                console.log(`[useItinerary Init] Auth ready, no initial data for ${itineraryId}, fetching...`);
                fetchItinerary(itineraryId, true); // Show loading indicator
            } else {
                // Already initialized with data from props, ensure loading is false
                console.log(`[useItinerary Init] Auth ready, already initialized for ${itineraryId}.`);
                setIsLoading(false);
                setError(null); // Clear any potential previous errors
            }
        } else if (!isLoggedIn && itineraryId) {
            // Logged out, but trying to access a specific itinerary page
            console.log(`[useItinerary Init] Auth ready, but user is logged out while accessing ${itineraryId}.`);
            setError("You have been logged out. Please log in again to manage this itinerary.");
            setIsLoading(false); // Stop loading, show error
            // setDays([]); // Optionally clear data
        } else if (!itineraryId) {
            // No itinerary ID provided (shouldn't happen in this page structure, but good safeguard)
            console.log(`[useItinerary Init] Auth ready, but no itineraryId provided.`);
            setError("No itinerary selected.");
            setIsLoading(false);
        } else {
             // Catch-all for logged out on dashboard (no itineraryId) - do nothing, isLoading false
             setIsLoading(false);
        }

    }, [isLoggedIn, isAuthLoading, itineraryId, fetchItinerary]); // Dependencies


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
            const renumberedDays = daysWithoutRemoved.map(day => {
                if (day.id > dayIdToRemove) {
                    return { ...day, id: day.id - 1 };
                }
                return day;
            }).sort((a, b) => a.id - b.id); // Ensure sorted order
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
        if (!itineraryId || !isLoggedIn || isAuthLoading || !isInitialized.current) {
            return;
        }

        if (hasPendingChanges.current) {
            console.log('[useItinerary Save Effect] Pending changes detected. Setting save timer.');
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }

            saveTimerRef.current = setTimeout(async () => {
                // Re-check conditions before making the API call
                if (!itineraryId || !isLoggedIn) {
                    console.log('[useItinerary Save] Skipping save: Conditions not met after debounce.');
                    setIsSaving(false);
                    hasPendingChanges.current = false; // Reset flag even if skipped
                    return;
                }

                console.log('[useItinerary Save] Debounce complete, saving changes to itinerary ID:', itineraryId);
                setIsSaving(true);
                setError(null);
                hasPendingChanges.current = false; // Reset flag before async call

                try {
                    const response = await fetch(`/api/itineraries/${itineraryId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ days }), // Send the current state of 'days'
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
                    // Consider re-marking as pending on error?
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
    }, [days, itineraryId, isLoggedIn, isAuthLoading]); // Depend on 'days' to trigger save


    // --- Return Values ---
    return {
        days,
        isLoading: isLoading || isAuthLoading, // Combine loading states
        isSaving,
        error,
        addDay,
        removeDay,
        addLocationToDay,
        removeLocationFromDay,
        // fetchItinerary // Expose if manual refresh is needed
    };
}