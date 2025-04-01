import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getOrCreateUserItinerary, updateUserItinerary, ItineraryDay } from '@/lib/supabase/itinerary';
import type { LocationData } from '@/lib/types';

// Debounce delay for saving changes (1.5 seconds)
const SAVE_DELAY_MS = 1500;

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

  // Get auth state
  const { user, isLoggedIn } = useAuth();

  // Initialize itinerary when user logs in
  useEffect(() => {
    // Skip if already initialized or no user
    if (isInitialized.current || !isLoggedIn || !user) {
      return;
    }
    
    console.log('[useItinerary] Initializing itinerary for user:', user.id);
    setIsLoading(true);
    setError(null);

    getOrCreateUserItinerary(user.id)
      .then((itinerary) => {
        console.log('[useItinerary] Successfully loaded itinerary:', itinerary.id);
        setDays(itinerary.days);
        setItineraryId(itinerary.id);
        isInitialized.current = true;
      })
      .catch((err) => {
        console.error('[useItinerary] Error loading itinerary:', err);
        setError('Failed to load itinerary. Please refresh and try again.');
        isInitialized.current = true; // Still mark as initialized to prevent loops
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isLoggedIn, user]);

  // Add a new day
  const addDay = useCallback(() => {
    console.log('[useItinerary] Adding new day');
    setDays((currentDays) => {
      // Find the highest day number and add 1
      const nextDayNumber = currentDays.length > 0 
        ? Math.max(...currentDays.map(d => d.id)) + 1 
        : 1;
      
      console.log(`[useItinerary] Creating day with number: ${nextDayNumber}`);
      return [...currentDays, { id: nextDayNumber, locations: [] }];
    });
  }, []);

  // Remove a day
  const removeDay = useCallback((dayId: number) => {
    console.log(`[useItinerary] Removing day: ${dayId}`);
    setDays((currentDays) => {
      console.log(`[useItinerary] Filtering out day ${dayId} from ${currentDays.length} days`);
      return currentDays.filter(day => day.id !== dayId);
    });
  }, []);

  // Add a location to a specific day
  const addLocationToDay = useCallback((dayId: number, location: LocationData) => {
    console.log(`[useItinerary] Adding location ${location.id} to day ${dayId}`);
    setDays((currentDays) => {
      console.log(`[useItinerary] Updating day ${dayId} with new location ${location.id}`);
      return currentDays.map(day => {
        if (day.id === dayId) {
          // Check if location is already in this day to avoid duplicates
          if (day.locations.some(loc => loc.id === location.id)) {
            return day;
          }
          return {
            ...day,
            locations: [...day.locations, location]
          };
        }
        return day;
      });
    });
  }, []);

  // Remove a location from a day
  const removeLocationFromDay = useCallback((dayId: number, locationId: string) => {
    console.log(`[useItinerary] Removing location ${locationId} from day ${dayId}`);
    setDays((currentDays) => {
      console.log(`[useItinerary] Filtering location ${locationId} from day ${dayId}`);
      return currentDays.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            locations: day.locations.filter(loc => loc.id !== locationId)
          };
        }
        return day;
      });
    });
  }, []);

  // Save changes with debouncing
  useEffect(() => {
    // Don't save if not initialized, still loading, already saving, or no user
    if (!isInitialized.current || isLoading || isSaving || !isLoggedIn || !itineraryId) {
      return;
    }

    // Clear any existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    console.log('[useItinerary] Planning to save changes after debounce');
    
    // Set a new timer for saving
    saveTimerRef.current = setTimeout(() => {
      console.log('[useItinerary] Debounce complete, saving changes');
      setIsSaving(true);
      
      updateUserItinerary(itineraryId, days)
        .then((success) => {
          if (success) {
            console.log('[useItinerary] Successfully saved itinerary changes');
          } else {
            console.error('[useItinerary] Failed to save itinerary changes');
            setError('Failed to save itinerary. Changes may not be saved.');
          }
        })
        .catch((err) => {
          console.error('[useItinerary] Error saving itinerary:', err);
          setError('An error occurred while saving your itinerary.');
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, SAVE_DELAY_MS);

    // Cleanup function to clear the timer if component unmounts
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [days, itineraryId, isSaving, isLoading, isLoggedIn]);

  return {
    days,
    isLoading,
    isSaving,
    error,
    addDay,
    removeDay,
    addLocationToDay,
    removeLocationFromDay,
  };
}
