"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./use-auth"

// Key for storing favorites in localStorage
const FAVORITES_STORAGE_KEY = 'tokyo_guide_favorites'

export function useFavorites() {
  const { isLoggedIn } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [isFetching, setIsFetching] = useState(false)

  // Initialize favorites from localStorage and then fetch from API if needed
  useEffect(() => {
    const initializeFavorites = () => {
      if (!isLoggedIn) {
        setFavorites([])
        return
      }

      try {
        // Try to get favorites from localStorage first
        const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY)
        
        if (storedFavorites) {
          const parsedFavorites = JSON.parse(storedFavorites)
          setFavorites(parsedFavorites)
          // Still fetch from API in the background to ensure data is fresh
          fetchFavorites(false)
        } else {
          // If no cached data, fetch from API with loading indicator
          fetchFavorites(true)
        }
      } catch (error) {
        console.error("Error initializing favorites:", error)
        fetchFavorites(true)
      }
    }

    initializeFavorites()
  }, [isLoggedIn])

  const fetchFavorites = useCallback(async (showLoading = true): Promise<void> => {
    if (!isLoggedIn) {
      setFavorites([])
      localStorage.removeItem(FAVORITES_STORAGE_KEY)
      return
    }

    try {
      if (showLoading) {
        setIsFetching(true)
      }
      
      const response = await fetch('/api/favorites')
      const data = await response.json()
      const newFavorites = data.favorites || []
      
      // Update state and localStorage
      setFavorites(newFavorites)
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites))
    } catch (error) {
      console.error("Error fetching favorites:", error)
    } finally {
      if (showLoading) {
        setIsFetching(false)
      }
    }
  }, [isLoggedIn])

  const toggleFavorite = useCallback(async (locationId: string) => {
    if (!isLoggedIn) {
      window.open('/login', '_blank')
      return false
    }

    if (isLoading[locationId]) return false

    setIsLoading(prev => ({ ...prev, [locationId]: true }))
    
    try {
      // First update local state for immediate feedback (optimistic update)
      const isFavorited = favorites.includes(locationId)
      
      if (isFavorited) {
        setFavorites(prev => prev.filter(id => id !== locationId))
      } else {
        setFavorites(prev => [...prev, locationId])
      }
      
      // Then update via the API
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ locationId })
      })
      
      if (!response.ok) {
        // If the API call fails, revert the optimistic update
        if (isFavorited) {
          const updatedFavorites = [...favorites, locationId]
          setFavorites(updatedFavorites)
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites))
        } else {
          const updatedFavorites = favorites.filter(id => id !== locationId)
          setFavorites(updatedFavorites)
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites))
        }
        throw new Error('Failed to toggle favorite')
      }
      
      const data = await response.json()
      
      // If the server response indicates a different state than our optimistic update,
      // sync with the server state (this is rare but could happen)
      if (data.isFavorited !== !isFavorited) {
        await fetchFavorites(false) // Don't show loading indicator for this refresh
      }
      
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
