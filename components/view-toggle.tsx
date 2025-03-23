"use client"

import { Button } from "@/components/ui/button"
import { Map, List } from "lucide-react"

interface ViewToggleProps {
  view: "map" | "list"
  onViewChange: (view: "map" | "list") => void
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-white rounded-full overflow-hidden border">
      <Button
        variant={view === "map" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("map")}
        className="rounded-l-full rounded-r-none"
      >
        <Map className="w-4 h-4 mr-1" />
        <span>Map</span>
      </Button>
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className="rounded-r-full rounded-l-none"
      >
        <List className="w-4 h-4 mr-1" />
        <span>List</span>
      </Button>
    </div>
  )
}