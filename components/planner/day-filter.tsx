"use client"

import { useState, useEffect, useRef } from "react"
import { CalendarDaysIcon } from "@heroicons/react/24/outline"
import { CheckIcon } from "@heroicons/react/24/solid"

interface DayFilterProps {
  days: {
    id: number
    locations: any[]
  }[]
  selectedDayIds: number[]
  onDayFilterChange: (selectedDayIds: number[]) => void
}

export default function DayFilter({
  days,
  selectedDayIds,
  onDayFilterChange,
}: DayFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Handle clicks outside of the filter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const toggleDay = (dayId: number) => {
    const newSelectedDayIds = selectedDayIds.includes(dayId)
      ? selectedDayIds.filter((id) => id !== dayId)
      : [...selectedDayIds, dayId]
    onDayFilterChange(newSelectedDayIds)
  }

  const sortedDays = [...days].sort((a, b) => a.id - b.id);

  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-white border rounded-md py-1.5 px-2.5 text-sm font-medium hover:bg-gray-50"
      >
        <CalendarDaysIcon className="h-4 w-4" />
        <span>Days</span>
        {selectedDayIds.length > 0 && (
          <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-xs">
            {selectedDayIds.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-md border bg-white shadow-lg z-[1000]">
          <div className="p-2">
            <div className="font-medium text-sm px-2 py-1.5">Filter by Day</div>
            <div className="h-px bg-gray-200 my-1 -mx-2"></div>
            {sortedDays.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">No days in itinerary</div>
            ) : (
              sortedDays.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => toggleDay(day.id)}
                >
                  <div className={`w-4 h-4 mr-2 flex items-center justify-center border rounded-sm ${
                    selectedDayIds.includes(day.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"
                  }`}>
                    {selectedDayIds.includes(day.id) && (
                      <CheckIcon className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm">Day {day.id}</span>
                  <span className="ml-auto text-xs text-gray-400">({day.locations.length})</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
