"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { LocationData } from "@/lib/types"
import { useAuth } from "./use-auth"

export type ItineraryDay = {
  id: string
  date: string
  locations: LocationData[]
}

export function useItinerary() {
  const { user, isLoggedIn } = useAuth()
  const [days, setDays] = useState<ItineraryDay[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchItinerary = useCallback(async (): Promise<void> => {
    if (!isLoggedIn || !user) {
      setDays([])
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch days
      const { data: daysData, error: daysError } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("user_id", user.id)
        .order("date")

      if (daysError) throw new Error(daysError.message)

      // Fetch locations for each day
      const daysWithLocations = await Promise.all(
        daysData.map(async (day) => {
          const { data: locationsData, error: locationsError } = await supabase
            .from("itinerary_locations")
            .select("*, location:locations(*)")
            .eq("day_id", day.id)
            .order("order")

          if (locationsError) throw new Error(locationsError.message)

          // Transform location data
          const locations = locationsData.map((item) => ({
            id: item.location.id,
            name: item.location.name,
            description: item.location.description,
            coordinates: [item.location.latitude, item.location.longitude] as [number, number],
            category: item.location.category,
            images: [] as string[], // We could fetch images if needed
          }))

          return {
            id: day.id,
            date: day.date,
            locations,
          }
        })
      )

      setDays(daysWithLocations as ItineraryDay[])
    } catch (err) {
      console.error("Error fetching itinerary:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to fetch itinerary")
      setError(errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn, user, supabase])

  useEffect(() => {
    fetchItinerary()
  }, [fetchItinerary])

  const addDay = useCallback(async (date: string) => {
    if (!isLoggedIn || !user) {
      return { success: false, error: new Error("User not logged in") }
    }

    try {
      const { data, error } = await supabase
        .from("itinerary_days")
        .insert([{ user_id: user.id, date }])
        .select()
        .single()

      if (error) throw error

      // Add the new day to state
      setDays(prev => [...prev, { id: data.id, date: data.date, locations: [] }])

      return { success: true, data }
    } catch (err) {
      console.error("Error adding day:", err)
      return { success: false, error: err }
    }
  }, [isLoggedIn, user, supabase])

  const removeDay = useCallback(async (dayId: string) => {
    if (!isLoggedIn) {
      return { success: false, error: new Error("User not logged in") }
    }

    try {
      // First delete all locations for this day
      await supabase
        .from("itinerary_locations")
        .delete()
        .eq("day_id", dayId)

      // Then delete the day
      const { error } = await supabase
        .from("itinerary_days")
        .delete()
        .eq("id", dayId)

      if (error) throw error

      // Update state
      setDays(prev => prev.filter(day => day.id !== dayId))

      return { success: true }
    } catch (err) {
      console.error("Error removing day:", err)
      return { success: false, error: err }
    }
  }, [isLoggedIn, supabase])

  const addLocationToDay = useCallback(async (dayId: string, location: LocationData) => {
    if (!isLoggedIn) {
      return { success: false, error: new Error("User not logged in") }
    }

    try {
      // Get the current max order for this day
      const { data: orderData } = await supabase
        .from("itinerary_locations")
        .select("order")
        .eq("day_id", dayId)
        .order("order", { ascending: false })
        .limit(1)

      const nextOrder = orderData && orderData.length > 0 ? orderData[0].order + 1 : 0

      // Add the location
      const { error } = await supabase
        .from("itinerary_locations")
        .insert([{
          day_id: dayId,
          location_id: location.id,
          order: nextOrder
        }])

      if (error) throw error

      // Update state
      setDays(prev => prev.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            locations: [...day.locations, location]
          }
        }
        return day
      }))

      return { success: true }
    } catch (err) {
      console.error("Error adding location to day:", err)
      return { success: false, error: err }
    }
  }, [isLoggedIn, supabase])

  const removeLocationFromDay = useCallback(async (dayId: string, locationId: string) => {
    if (!isLoggedIn) {
      return { success: false, error: new Error("User not logged in") }
    }

    try {
      const { error } = await supabase
        .from("itinerary_locations")
        .delete()
        .eq("day_id", dayId)
        .eq("location_id", locationId)

      if (error) throw error

      // Update state
      setDays(prev => prev.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            locations: day.locations.filter(loc => loc.id !== locationId)
          }
        }
        return day
      }))

      return { success: true }
    } catch (err) {
      console.error("Error removing location from day:", err)
      return { success: false, error: err }
    }
  }, [isLoggedIn, supabase])

  const reorderLocations = useCallback(async (dayId: string, newOrder: LocationData[]) => {
    if (!isLoggedIn) {
      return { success: false, error: new Error("User not logged in") }
    }

    try {
      // Update the order in the database
      const updates = newOrder.map((location, index) => ({
        day_id: dayId,
        location_id: location.id,
        order: index
      }))

      // First delete all existing entries
      await supabase
        .from("itinerary_locations")
        .delete()
        .eq("day_id", dayId)

      // Then insert the new order
      const { error } = await supabase
        .from("itinerary_locations")
        .insert(updates)

      if (error) throw error

      // Update state
      setDays(prev => prev.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            locations: newOrder
          }
        }
        return day
      }))

      return { success: true }
    } catch (err) {
      console.error("Error reordering locations:", err)
      return { success: false, error: err }
    }
  }, [isLoggedIn, supabase])

  return {
    days,
    isLoading,
    error,
    fetchItinerary,
    addDay,
    removeDay,
    addLocationToDay,
    removeLocationFromDay,
    reorderLocations
  }
}
