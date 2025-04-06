"use client"

import React from 'react'
import { XMarkIcon, HeartIcon, CalendarDaysIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { LocationData, ItineraryDay } from '@/lib/types' // Assuming ItineraryDay is defined here

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  // Category Filters
  categories: string[]
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
  // Favorites Filter
  showFavoritesFilter: boolean
  isFavoriteSelected: boolean
  onFavoriteToggle: () => void
  // Day Filter (Planner only)
  showDayFilter: boolean
  days?: ItineraryDay[]
  selectedDayIds?: number[]
  onDayToggle?: (dayId: number) => void
}

export default function FilterModal({
  isOpen,
  onClose,
  categories,
  selectedCategories,
  onCategoryToggle,
  showFavoritesFilter,
  isFavoriteSelected,
  onFavoriteToggle,
  showDayFilter,
  days = [],
  selectedDayIds = [],
  onDayToggle,
}: FilterModalProps) {
  if (!isOpen) return null

  const sortedDays = [...days].sort((a, b) => a.id - b.id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-medium">Filters</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Close filters"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Scrollable Filter Sections */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Favorites Section */}
            {showFavoritesFilter && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Show</h3>
                <div
                  className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={onFavoriteToggle}
                  role="checkbox"
                  aria-checked={isFavoriteSelected}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onFavoriteToggle() }}
                >
                  <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded-sm ${
                    isFavoriteSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'
                  }`}>
                    {isFavoriteSelected && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                  <HeartIcon className="w-5 h-5 mr-2 text-red-500" />
                  <span className="text-sm">Favorites Only</span>
                </div>
              </div>
            )}

            {/* Categories Section */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Categories</h3>
              {categories.map((category) => (
                <div
                  key={category}
                  className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => onCategoryToggle(category)}
                  role="checkbox"
                  aria-checked={selectedCategories.includes(category)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCategoryToggle(category) }}
                >
                  <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded-sm ${
                    selectedCategories.includes(category) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {selectedCategories.includes(category) && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm">{category}</span>
                </div>
              ))}
            </div>

            {/* Days Section (Planner only) */}
            {showDayFilter && onDayToggle && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Days</h3>
                {sortedDays.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No days in itinerary</div>
                ) : (
                  sortedDays.map((day) => (
                    <div
                      key={day.id}
                      className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => onDayToggle(day.id)}
                      role="checkbox"
                      aria-checked={selectedDayIds.includes(day.id)}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDayToggle(day.id) }}
                    >
                      <div className={`w-4 h-4 mr-3 flex items-center justify-center border rounded-sm ${
                        selectedDayIds.includes(day.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {selectedDayIds.includes(day.id) && <CheckIcon className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm">Day {day.id}</span>
                      <span className="ml-auto text-xs text-gray-400">({day.locations.length})</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer (Optional - e.g., Apply/Clear buttons if needed, but direct toggle is fine) */}
          {/* <div className="p-4 border-t flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Done
            </button>
          </div> */}
        </div>
      </div>
    </>
  )
}