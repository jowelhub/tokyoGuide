"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./use-auth"

// Key for storing favorites in localStorage
const FAVORITES_STORAGE_KEY = 'tokyo_guide_favorites'

export function useFavorites() {
  const { isLoggedIn, isInitialized, user } = useAuth()
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [isFetching, setIsFetching] = useState(false)
  const hasFetchedInitially = useRef(false)

  // Initialize favorites when auth is initialized or when user changes
  useEffect(() => {
    if (isInitialized && (!hasFetchedInitially.current || user?.id !== localStorage.getItem('last_fetched_user'))) {
      console.log('[useFavorites] Auth initialized or user changed, fetching favorites...')
      fetchFavorites(true)
      hasFetchedInitially.current = true
      localStorage.setItem('last_fetched_user', user?.id || 'logged_out')
    } else if (!isInitialized) {
      console.log('[useFavorites] Waiting for auth to initialize...')
      // Try to load from localStorage for faster initial render
      try {
        const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY)
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites))
        }
      } catch (e) { 
        console.error("Error reading favorites cache", e)
      }
    }

    // Clear favorites when logged out
    if (isInitialized && !isLoggedIn) {
      setFavorites([])
      localStorage.removeItem(FAVORITES_STORAGE_KEY)
      localStorage.removeItem('last_fetched_user')
    }
  }, [isInitialized, isLoggedIn, user])

  const fetchFavorites = useCallback(async (showLoading = true): Promise<void> => {
    // No need to check isLoggedIn - API handles auth check and returns empty array if not logged in
    try {
      if (showLoading) {
        setIsFetching(true)
      }
      
      console.log('[useFavorites] Fetching favorites from API')
      const response = await fetch('/api/favorites')
      const data = await response.json()
      const newFavorites = data.favorites || []
      
      console.log(`[useFavorites] Fetched ${newFavorites.length} favorites`)
      
      // Update state and localStorage
      setFavorites(newFavorites)
      if (isLoggedIn) {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites))
      }
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
      // Optimistic update for better UX
      const isFavorited = favorites.includes(locationId)
      const originalFavorites = [...favorites]
      
      if (isFavorited) {
        setFavorites(prev => prev.filter(id => id !== locationId))
      } else {
        setFavorites(prev => [...prev, locationId])
      }
      
      // Then update via API
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ locationId })
      })
      
      if (!response.ok) {
        // Revert optimistic update on failure
        setFavorites(originalFavorites)
        throw new Error('Failed to toggle favorite')
      }
      
      const data = await response.json()
      
      // Update localStorage after successful API call
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(
        isFavorited 
          ? originalFavorites.filter(id => id !== locationId)
          : [...originalFavorites, locationId]
      ))
      
      return true
    } catch (error) {
      console.error("Error toggling favorite:", error)
      return false
    } finally {
      setIsLoading(prev => ({ ...prev, [locationId]: false }))
    }
  }, [isLoggedIn, isLoading, favorites])

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
