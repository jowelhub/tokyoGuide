"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CategoryData } from "@/lib/supabase/categories"

type UseCategoriesOptions = {
  initialData?: CategoryData[]
}

export function useCategories({
  initialData
}: UseCategoriesOptions = {}) {
  const [categories, setCategories] = useState<CategoryData[]>(initialData || [])
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchCategories = useCallback(async () => {
    // Skip fetching if we already have initial data
    if (initialData) {
      setCategories(initialData)
      return initialData
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name")

      if (error) throw new Error(error.message)

      setCategories(data)
      return data
    } catch (err) {
      console.error("Error fetching categories:", err)
      const errorObj = err instanceof Error ? err : new Error("Failed to fetch categories")
      setError(errorObj)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [initialData, supabase])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories
  }
}
