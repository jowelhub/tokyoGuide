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

  // Get auth state
  const { user, isLoggedIn, isLoading: isAuthLoading } = useAuth();

  // Fetch itinerary from API
  const fetchItinerary = useCallback(async (showLoading = true) => {
    if (!isLoggedIn) {
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
        throw new Error(errorData.error || 'Failed to load itinerary');
      }
      
      const itinerary = await response.json();
      console.log('[useItinerary] Successfully loaded itinerary:', itinerary.id);
      
      // Update state and localStorage
      setDays(itinerary.days);
      setItineraryId(itinerary.id);
      isInitialized.current = true;
      
      // Cache in localStorage
      localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify({
        id: itinerary.id,
        days: itinerary.days
      }));
    } catch (err) {
      console.error('[useItinerary] Error loading itinerary:', err);
      setError('Failed to load itinerary. Please refresh and try again.');
      isInitialized.current = true; // Still mark as initialized to prevent loops
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [isLoggedIn]);

  // Initialize itinerary when user logs in
  useEffect(() => {
    // Skip if still loading auth, or no user
    if (isAuthLoading || !isLoggedIn) {
      return;
    }
    
    // Try to get itinerary from localStorage first
    try {
      const storedItinerary = localStorage.getItem(ITINERARY_STORAGE_KEY);
      
      if (storedItinerary) {
        const parsedItinerary = JSON.parse(storedItinerary);
        setDays(parsedItinerary.days);
        setItineraryId(parsedItinerary.id);
        isInitialized.current = true;
        setIsLoading(false);
        
        // Still fetch from API in the background to ensure data is fresh
        fetchItinerary(false);
      } else {
        // If no cached data, fetch from API with loading indicator
        fetchItinerary(true);
      }
    } catch (error) {
      console.error('[useItinerary] Error initializing from localStorage:', error);
      // If localStorage fails, fall back to API
      fetchItinerary(true);
    }
  }, [isLoggedIn, isAuthLoading, fetchItinerary]);

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
    // Log the effect run and current state for diagnosis
    console.log('[useItinerary Save Effect] Running. Conditions:', { 
      isInitialized: isInitialized.current, 
      isLoading, 
      isSaving, 
      isLoggedIn, 
      hasItineraryId: !!itineraryId 
    });

    // Don't save if not initialized, still loading, already saving, or no user
    if (!isInitialized.current || isLoading || isSaving || !isLoggedIn || !itineraryId) {
      console.log('[useItinerary Save Effect] Skipping save due to conditions not met.', {
        notInitialized: !isInitialized.current,
        isLoading,
        isSaving,
        notLoggedIn: !isLoggedIn,
        noItineraryId: !itineraryId
      });
      return;
    }

    // Clear any existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    console.log('[useItinerary] Planning to save changes after debounce');
    
    // Set a new timer for saving
    saveTimerRef.current = setTimeout(async () => {
      console.log('[useItinerary] Debounce complete, saving changes');
      setIsSaving(true);
      setError(null);
      
      try {
        const response = await fetch('/api/itinerary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ itineraryId, days })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save itinerary');
        }
        
        console.log('[useItinerary] Successfully saved itinerary changes');
        
        // Update localStorage with latest data
        localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify({
          id: itineraryId,
          days: days
        }));
      } catch (err) {
        console.error('[useItinerary] Error saving itinerary:', err);
        setError('An error occurred while saving your itinerary.');
      } finally {
        setIsSaving(false);
      }
    }, SAVE_DELAY_MS);

    // Cleanup function to clear the timer if component unmounts
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [days, itineraryId, isLoggedIn]); // Removed isSaving and isLoading from dependencies

  return {
    days,
    isLoading,
    isSaving,
    error,
    addDay,
    removeDay,
    addLocationToDay,
    removeLocationFromDay,
    fetchItinerary
  };
}
