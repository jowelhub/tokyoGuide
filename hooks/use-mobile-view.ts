"use client"

import { useState, useEffect } from "react"
import { useMediaQuery } from "./use-media-query"

type ViewType = "map" | "list"

export function useMobileView(defaultView: ViewType = "map") {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [mobileView, setMobileView] = useState<ViewType>(defaultView)

  const toggleMobileView = () => {
    setMobileView(mobileView === "map" ? "list" : "map")
  }

  return {
    isMobile,
    mobileView,
    setMobileView,
    toggleMobileView,
    isMapView: mobileView === "map",
    isListView: mobileView === "list"
  }
}
