"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Filter, Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getUserFavorites } from "@/lib/supabase/favorites"

interface CategoryFilterProps {
  categories: string[]
  onFilterChange: (selectedCategories: string[]) => void
  onFavoritesFilterChange?: (showOnlyFavorites: boolean) => void
}

export default function CategoryFilter({ 
  categories, 
  onFilterChange,
  onFavoritesFilterChange 
}: CategoryFilterProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    
    checkAuth();
  }, []);

  // Add click outside handler to close the filter panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Add event listener when the filter is open
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleCategory = (category: string) => {
    const newSelectedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category]

    setSelectedCategories(newSelectedCategories)
    onFilterChange(newSelectedCategories)
  }

  const toggleFavorites = () => {
    const newShowOnlyFavorites = !showOnlyFavorites;
    setShowOnlyFavorites(newShowOnlyFavorites);
    
    if (onFavoritesFilterChange) {
      onFavoritesFilterChange(newShowOnlyFavorites);
    }
  }

  return (
    <div className="relative" ref={filterRef}>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsOpen(!isOpen)}>
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {(selectedCategories.length > 0 || showOnlyFavorites) && (
          <span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
            {selectedCategories.length + (showOnlyFavorites ? 1 : 0)}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-md border bg-white shadow-lg z-[1000]">
          <div className="p-2">
            {isLoggedIn && (
              <>
                <div 
                  className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={toggleFavorites}
                >
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    {showOnlyFavorites && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-sm">Favorites</span>
                  </div>
                </div>
                <div className="h-px bg-gray-200 my-1 -mx-2"></div>
              </>
            )}
            
            <div className="font-medium text-sm px-2 py-1.5">Categories</div>
            <div className="h-px bg-gray-200 my-1 -mx-2"></div>
            {categories.map((category) => (
              <div
                key={category}
                className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  {selectedCategories.includes(category) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <span className="text-sm">{category}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}