"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  saveItinerary, 
  getUserItineraries, 
  getItinerary, 
  deleteItinerary, 
  updateItinerary,
  type Itinerary as SupabaseItinerary,
  type ItineraryDay
} from "@/lib/supabase/itinerary"
import type { LocationData } from "@/lib/types"
import { useAuth } from "./use-auth"

export interface Itinerary extends SupabaseItinerary {
  // No additional fields needed since we removed the name field
}

export function useItinerary() {
  const { isLoggedIn } = useAuth()
  const [days, setDays] = useState<ItineraryDay[]>([{ id: 1, locations: [] }])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch all user itineraries
  const fetchItineraries = useCallback(async (): Promise<void> => {
    if (!isLoggedIn) {
      setItineraries([])
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const userItineraries = await getUserItineraries()
      setItineraries(userItineraries as Itinerary[])
      
      // If we have itineraries but no current one is set, load the most recent one
      if (userItineraries.length > 0 && !currentItinerary) {
        await loadItinerary(userItineraries[0].id)
      }
    } catch (err) {
      console.error("Error fetching itineraries:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to fetch itineraries")
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn, currentItinerary])

  // Load a specific itinerary
  const loadItinerary = useCallback(async (itineraryId: number): Promise<void> => {
    if (!isLoggedIn) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const loadedItinerary = await getItinerary(itineraryId)
      setCurrentItinerary(loadedItinerary as Itinerary)
      setDays(loadedItinerary.days)
    } catch (err) {
      console.error("Error loading itinerary:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to load itinerary")
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn])

  // Auto-save the current itinerary whenever days change
  const autoSave = useCallback(async (): Promise<void> => {
    if (!isLoggedIn || isSaving) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      
      if (currentItinerary) {
        // Update existing itinerary
        await updateItinerary(currentItinerary.id, days)
        
        // Update the current itinerary with the new days
        setCurrentItinerary(prev => prev ? { 
          ...prev, 
          days, 
          updated_at: new Date().toISOString() 
        } : null)
      } else if (itineraries.length > 0) {
        // Update the first itinerary if it exists
        await updateItinerary(itineraries[0].id, days)
        
        // Refresh the list of itineraries
        await fetchItineraries()
      } else {
        // Create new itinerary
        const itineraryId = await saveItinerary(days)
        
        // Set as current itinerary
        const newItinerary: Itinerary = {
          id: itineraryId,
          days,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        setCurrentItinerary(newItinerary)
        
        // Refresh the list of itineraries
        await fetchItineraries()
      }
    } catch (err) {
      console.error("Error auto-saving itinerary:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to auto-save itinerary")
      setError(errorObj)
    } finally {
      setIsSaving(false)
    }
  }, [isLoggedIn, isSaving, currentItinerary, itineraries, days, fetchItineraries])

  // Save the current itinerary
  const saveCurrentItinerary = useCallback(async (): Promise<number | null> => {
    if (!isLoggedIn) {
      return null
    }

    try {
      setIsSaving(true)
      setError(null)
      
      let itineraryId: number;
      
      if (currentItinerary) {
        // Update existing itinerary
        itineraryId = await updateItinerary(currentItinerary.id, days)
      } else {
        // Create new itinerary
        itineraryId = await saveItinerary(days)
      }
      
      // Refresh the list of itineraries
      await fetchItineraries()
      
      return itineraryId
    } catch (err) {
      console.error("Error saving itinerary:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to save itinerary")
      setError(errorObj)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [isLoggedIn, currentItinerary, days, fetchItineraries])

  // Delete an itinerary
  const deleteCurrentItinerary = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn || !currentItinerary) {
      return false
    }

    try {
      setIsLoading(true)
      setError(null)
      await deleteItinerary(currentItinerary.id)
      setCurrentItinerary(null)
      setDays([{ id: 1, locations: [] }])
      
      // Refresh the list of itineraries
      await fetchItineraries()
      
      return true
    } catch (err) {
      console.error("Error deleting itinerary:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to delete itinerary")
      setError(errorObj)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn, currentItinerary, fetchItineraries])

  // Initialize by fetching itineraries
  useEffect(() => {
    if (isLoggedIn) {
      const initializeItinerary = async () => {
        try {
          setIsLoading(true);
          const userItineraries = await getUserItineraries();
          setItineraries(userItineraries as Itinerary[]);
          
          // If we have itineraries, load the most recent one
          if (userItineraries.length > 0) {
            const loadedItinerary = await getItinerary(userItineraries[0].id);
            setCurrentItinerary(loadedItinerary as Itinerary);
            setDays(loadedItinerary.days);
          }
        } catch (err) {
          console.error("Error initializing itinerary:", err);
        } finally {
          setIsLoading(false);
        }
      };
      
      initializeItinerary();
    }
  }, [isLoggedIn]);

  // Auto-save whenever days change, but only if there are actual changes
  useEffect(() => {
    // Skip if not logged in, loading, or no current itinerary
    if (!isLoggedIn || isLoading || isSaving) {
      return;
    }
    
    // Only save if we have actual changes
    const timer = setTimeout(() => {
      autoSave();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [days, isLoggedIn, isLoading, isSaving, autoSave]);

  // Custom setDays function that wraps the original one
  const setDaysAndAutoSave = useCallback((newDays: ItineraryDay[] | ((prevDays: ItineraryDay[]) => ItineraryDay[])) => {
    setDays(newDays);
    // Auto-save is handled by the useEffect
  }, []);

  // Day management functions
  const addDay = useCallback(() => {
    const newDayId = days.length > 0 ? Math.max(...days.map(day => day.id)) + 1 : 1;
    setDays(prev => [...prev, { id: newDayId, locations: [] }]);
    return newDayId;
  }, [days]);

  const removeDay = useCallback((dayId: number) => {
    setDays(prev => prev.filter(day => day.id !== dayId));
  }, []);

  const addLocationToDay = useCallback((dayId: number, location: LocationData) => {
    setDays(prev => prev.map(day => {
      if (day.id === dayId) {
        // Check if location already exists in this day
        const locationExists = day.locations.some(loc => loc.id === location.id);
        if (locationExists) {
          return day; // Don't add duplicate locations
        }
        return {
          ...day,
          locations: [...day.locations, location]
        };
      }
      return day;
    }));
  }, []);

  const removeLocationFromDay = useCallback((dayId: number, locationId: string) => {
    setDays(prev => prev.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          locations: day.locations.filter(loc => loc.id !== locationId)
        };
      }
      return day;
    }));
  }, []);

  return {
    days,
    setDays: setDaysAndAutoSave,
    itineraries,
    currentItinerary,
    isLoading,
    isSaving,
    error,
    fetchItineraries,
    loadItinerary,
    saveItinerary: saveCurrentItinerary,
    deleteItinerary: deleteCurrentItinerary,
    addDay,
    removeDay,
    addLocationToDay,
    removeLocationFromDay
  };
}
