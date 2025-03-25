"use client"

import { useState, useEffect, useCallback } from "react"
import type { LocationData } from "@/lib/types"
import { useFavorites } from "./use-favorites"

type FilterOptions = {
  categories?: string[]
  showOnlyFavorites?: boolean
  searchTerm?: string
}

export function useLocationFilters(initialLocations: LocationData[]) {
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>(initialLocations)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { favorites } = useFavorites()

  const applyFilters = useCallback(() => {
    let result = [...initialLocations]
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      const lowerCaseSelectedCategories = selectedCategories.map(cat => cat.toLowerCase())
      result = result.filter(location => 
        lowerCaseSelectedCategories.includes(location.category.toLowerCase())
      )
    }
    
    // Apply favorites filter
    if (showOnlyFavorites && favorites.length > 0) {
      result = result.filter(location => favorites.includes(location.id))
    }
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      result = result.filter(location => 
        location.name.toLowerCase().includes(term) || 
        location.description.toLowerCase().includes(term)
      )
    }
    
    setFilteredLocations(result)
    return result
  }, [initialLocations, selectedCategories, showOnlyFavorites, favorites, searchTerm])

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const updateFilters = useCallback((options: FilterOptions) => {
    if (options.categories !== undefined) {
      setSelectedCategories(options.categories)
    }
    
    if (options.showOnlyFavorites !== undefined) {
      setShowOnlyFavorites(options.showOnlyFavorites)
    }
    
    if (options.searchTerm !== undefined) {
      setSearchTerm(options.searchTerm)
    }
  }, [])

  return {
    filteredLocations,
    selectedCategories,
    showOnlyFavorites,
    searchTerm,
    updateFilters,
    setSelectedCategories,
    setShowOnlyFavorites,
    setSearchTerm,
    applyFilters
  }
}
