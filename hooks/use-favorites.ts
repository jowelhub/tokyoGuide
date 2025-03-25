"use client"

import { useState, useEffect, useCallback } from "react"
import { toggleFavorite as toggleFavoriteApi, getUserFavorites } from "@/lib/supabase/favorites"
import { useAuth } from "./use-auth"

export function useFavorites() {
  const { isLoggedIn } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [isFetching, setIsFetching] = useState(false)

  const fetchFavorites = useCallback(async (): Promise<void> => {
    if (!isLoggedIn) {
      setFavorites([])
      return
    }

    try {
      setIsFetching(true)
      const userFavorites = await getUserFavorites()
      setFavorites(userFavorites)
    } catch (error) {
      console.error("Error fetching favorites:", error)
    } finally {
      setIsFetching(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites, isLoggedIn])

  const toggleFavorite = useCallback(async (locationId: string) => {
    if (!isLoggedIn) {
      window.open('/login', '_blank')
      return false
    }

    if (isLoading[locationId]) return false

    setIsLoading(prev => ({ ...prev, [locationId]: true }))
    
    try {
      // First update local state for immediate feedback
      const isFavorited = favorites.includes(locationId)
      
      if (isFavorited) {
        setFavorites(prev => prev.filter(id => id !== locationId))
      } else {
        setFavorites(prev => [...prev, locationId])
      }
      
      // Then update the database
      await toggleFavoriteApi(locationId)
      
      // Refresh the favorites list
      await fetchFavorites()
      
      return true
    } catch (error) {
      console.error("Error toggling favorite:", error)
      return false
    } finally {
      setIsLoading(prev => ({ ...prev, [locationId]: false }))
    }
  }, [isLoggedIn, isLoading, favorites, fetchFavorites])

  const isFavorited = useCallback((locationId: string) => {
    return favorites.includes(locationId)
  }, [favorites])

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    refreshFavorites: fetchFavorites,
    isLoading,
    isFetching
  }
}
