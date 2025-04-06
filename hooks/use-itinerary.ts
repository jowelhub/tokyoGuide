// hooks/use-itinerary.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { LocationData, ItineraryDay } from '@/lib/types';

// Debounce delay for saving changes (1.5 seconds)
const SAVE_DELAY_MS = 1500;

// Key for storing itinerary in localStorage
const ITINERARY_STORAGE_KEY = 'tokyo_guide_itinerary';

export function useItinerary() {
  // State
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [itineraryId, setItineraryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // References
  const isInitialized = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPendingChanges = useRef(false); // Track if changes occurred since last save attempt

  // Get auth state
  const { user, isLoggedIn, isLoading: isAuthLoading } = useAuth();

  // Fetch itinerary from API
  const fetchItinerary = useCallback(async (showLoading = true) => {
    if (!isLoggedIn) {
      // If not logged in, clear local state and storage
      setDays([]);
      setItineraryId(null);
      localStorage.removeItem(ITINERARY_STORAGE_KEY);
      isInitialized.current = true; // Mark as initialized even if logged out
      setIsLoading(false);
      return;
    }

    console.log('[useItinerary] Fetching itinerary');
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/itinerary');

      if (!response.ok) {
        const errorData = await response.json();
        // Handle specific case where user might exist but itinerary doesn't yet (401 might be misleading)
        if (response.status === 401 && errorData.error === "Authentication required") {
           console.warn('[useItinerary] Authentication required, user might be logged out or session expired.');
           // Clear local state as user is effectively logged out from itinerary perspective
           setDays([]);
           setItineraryId(null);
           localStorage.removeItem(ITINERARY_STORAGE_KEY);
        } else {
          throw new Error(errorData.error || 'Failed to load itinerary');
        }
      } else {
        const itinerary = await response.json();
        console.log('[useItinerary] Successfully loaded itinerary:', itinerary.id);

        // Update state and localStorage
        setDays(itinerary.days);
        setItineraryId(itinerary.id);

        // Cache in localStorage
        localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify({
          id: itinerary.id,
          days: itinerary.days
        }));
      }
      isInitialized.current = true;

    } catch (err: any) {
      console.error('[useItinerary] Error loading itinerary:', err);
      setError(`Failed to load itinerary: ${err.message}. Please refresh.`);
      isInitialized.current = true; // Still mark as initialized to prevent loops
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [isLoggedIn]);

  // Initialize itinerary when user logs in or auth state loads
  useEffect(() => {
    if (isAuthLoading) {
      console.log('[useItinerary Init Effect] Waiting for auth...');
      return; // Wait for auth to finish loading
    }

    if (!isLoggedIn) {
      console.log('[useItinerary Init Effect] User logged out, clearing state.');
      setDays([]);
      setItineraryId(null);
      localStorage.removeItem(ITINERARY_STORAGE_KEY);
      isInitialized.current = true;
      setIsLoading(false); // Not loading if logged out
      return;
    }

    // If logged in and not yet initialized, try loading
    if (isLoggedIn && !isInitialized.current) {
      console.log('[useItinerary Init Effect] User logged in, initializing itinerary...');
      // Try to get itinerary from localStorage first for faster UI update
      try {
        const storedItinerary = localStorage.getItem(ITINERARY_STORAGE_KEY);
        if (storedItinerary) {
          console.log('[useItinerary Init Effect] Found cached itinerary.');
          const parsedItinerary = JSON.parse(storedItinerary);
          setDays(parsedItinerary.days);
          setItineraryId(parsedItinerary.id);
          setIsLoading(false); // We have cached data, so UI isn't "loading"

          // Fetch from API in the background to ensure data is fresh, don't show loading indicator
          fetchItinerary(false);
        } else {
          // If no cached data, fetch from API with loading indicator
          console.log('[useItinerary Init Effect] No cache found, fetching from API.');
          fetchItinerary(true);
        }
      } catch (error) {
        console.error('[useItinerary Init Effect] Error initializing from localStorage:', error);
        // If localStorage fails, fall back to API with loading indicator
        fetchItinerary(true);
      }
    }
  }, [isLoggedIn, isAuthLoading, fetchItinerary]);


  // --- Modification Functions ---

  const modifyDays = useCallback((modificationFn: (currentDays: ItineraryDay[]) => ItineraryDay[]) => {
    setDays(currentDays => {
      const newDays = modificationFn(currentDays);
      // Only mark as pending if the days actually changed
      // Simple JSON stringify comparison works for this structure
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
        ? Math.max(0, ...currentDays.map(d => d.id)) + 1 // Ensure it's at least 1
        : 1;
      console.log(`[useItinerary] Creating day with number: ${nextDayNumber}`);
      return [...currentDays, { id: nextDayNumber, locations: [] }];
    });
  }, [modifyDays]);

  // Remove a day and renumber subsequent days
  const removeDay = useCallback((dayIdToRemove: number) => {
    console.log(`[useItinerary] Removing day: ${dayIdToRemove}`);
    modifyDays((currentDays) => {
      const daysWithoutRemoved = currentDays.filter(day => day.id !== dayIdToRemove);

      // Renumber days that came after the removed day
      const renumberedDays = daysWithoutRemoved.map(day => {
        if (day.id > dayIdToRemove) {
          // Decrement the day number (id)
          return { ...day, id: day.id - 1 };
        }
        return day; // Keep days before the removed one as is
      });

      // Sort just in case mapping changed order (though it usually doesn't)
      renumberedDays.sort((a, b) => a.id - b.id);
      console.log(`[useItinerary] Days after removing ${dayIdToRemove} and renumbering:`, renumberedDays.map(d => d.id));
      return renumberedDays;
    });
  }, [modifyDays]);

  // Add a location to a specific day
  const addLocationToDay = useCallback((dayId: number, location: LocationData) => {
    console.log(`[useItinerary] Adding location ${location.id} to day ${dayId}`);
    modifyDays((currentDays) => {
      return currentDays.map(day => {
        if (day.id === dayId) {
          if (day.locations.some(loc => loc.id === location.id)) {
            console.log(`[useItinerary] Location ${location.id} already exists in day ${dayId}.`);
            return day; // Avoid duplicates
          }
          console.log(`[useItinerary] Adding location ${location.id} to day ${dayId}.`);
          return {
            ...day,
            locations: [...day.locations, location]
          };
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
          console.log(`[useItinerary] Filtering location ${locationId} from day ${dayId}.`);
          return {
            ...day,
            locations: day.locations.filter(loc => loc.id !== locationId)
          };
        }
        return day;
      });
    });
  }, [modifyDays]);


  // --- Saving Logic ---

  // Save changes with debouncing
  useEffect(() => {
    // Don't run if not initialized or not logged in
    if (!isInitialized.current || !isLoggedIn || !itineraryId) {
      // console.log('[useItinerary Save Effect] Skipping: Not initialized, not logged in, or no itinerary ID.');
      return;
    }

    // If there are pending changes, set up the save timer
    if (hasPendingChanges.current) {
       console.log('[useItinerary Save Effect] Pending changes detected. Setting save timer.');
      // Clear any existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set a new timer for saving
      saveTimerRef.current = setTimeout(async () => {
        // Check again before saving, in case user logged out during debounce
        if (!isLoggedIn || !itineraryId) {
           console.log('[useItinerary Save Effect] Skipping save: Logged out or no itinerary ID after debounce.');
           setIsSaving(false); // Ensure saving state is reset
           hasPendingChanges.current = false; // Reset pending changes flag
           return;
        }

        console.log('[useItinerary] Debounce complete, saving changes to itinerary ID:', itineraryId);
        setIsSaving(true);
        setError(null);
        hasPendingChanges.current = false; // Reset pending changes flag *before* async call

        try {
          const response = await fetch('/api/itinerary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            // Send the current 'days' state at the time of saving
            body: JSON.stringify({ itineraryId, days })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save itinerary');
          }

          const result = await response.json();
          console.log('[useItinerary] Successfully saved itinerary changes.', result);

          // Update localStorage with latest saved data
          localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify({
            id: itineraryId,
            days: days // Use the 'days' state that was just sent
          }));

        } catch (err: any) {
          console.error('[useItinerary] Error saving itinerary:', err);
          setError(`Failed to save: ${err.message}. Changes might be lost.`);
          // Consider if you want to re-enable the pending changes flag on error
          // hasPendingChanges.current = true;
        } finally {
          setIsSaving(false);
        }
      }, SAVE_DELAY_MS);
    }

    // Cleanup function to clear the timer if component unmounts or dependencies change
    return () => {
      if (saveTimerRef.current) {
        console.log('[useItinerary Save Effect] Cleanup: Clearing save timer.');
        clearTimeout(saveTimerRef.current);
      }
    };
    // Depend on 'days' state directly to trigger the effect when it changes.
    // Also depend on itineraryId and isLoggedIn to ensure they are valid when saving.
  }, [days, itineraryId, isLoggedIn]);

  return {
    days,
    isLoading: isLoading || isAuthLoading, // Combine loading states
    isSaving,
    error,
    addDay,
    removeDay,
    addLocationToDay,
    removeLocationFromDay,
    fetchItinerary // Expose fetchItinerary if manual refresh is needed elsewhere
  };
}