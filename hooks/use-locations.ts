"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { LocationData } from "@/lib/types"

type UseLocationsOptions = {
  initialData?: LocationData[]
  categoryId?: string
  limit?: number
  withImages?: boolean
  searchTerm?: string
}

export function useLocations({
  initialData,
  categoryId,
  limit,
  withImages = true,
  searchTerm
}: UseLocationsOptions = {}) {
  const [locations, setLocations] = useState<LocationData[]>(initialData || [])
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchLocations = useCallback(async () => {
    // Skip fetching if we already have initial data and no filters are applied
    if (initialData && !categoryId && !searchTerm) {
      setLocations(initialData)
      return initialData
    }

    try {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from("locations")
        .select(withImages ? "*, images(*), category(*)" : "*, category(*)")

      if (categoryId) {
        query = query.eq("category_id", categoryId)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)

      // Transform data
      const transformedData = data.map((location: any) => ({
        id: location.id,
        name: location.name,
        description: location.description,
        coordinates: [location.latitude, location.longitude] as [number, number],
        category: location.category?.name || location.category_id,
        images: withImages ? location.images?.map((img: any) => img.url) || [] : [],
        // Add any other fields needed
      }))

      // Apply search filter if provided
      let filteredData = transformedData
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filteredData = transformedData.filter(location => 
          location.name.toLowerCase().includes(term) || 
          location.description.toLowerCase().includes(term)
        )
      }

      setLocations(filteredData)
      return filteredData
    } catch (err) {
      console.error("Error fetching locations:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to fetch locations")
      setError(errorObj)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [initialData, categoryId, limit, withImages, searchTerm, supabase])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  return {
    locations,
    isLoading,
    error,
    refetch: fetchLocations
  }
}
