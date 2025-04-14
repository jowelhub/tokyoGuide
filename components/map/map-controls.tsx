// components/map/map-controls.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import SearchInput from '@/components/ui/search-input';
import { Filter, Wand2, Loader2, XCircleIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void; // Clears the input field AND active searches
  onNormalSearch: () => void; // Triggers normal text search
  onAiSearch?: () => void; // Optional AI search trigger
  onOpenFilterModal: () => void;
  isAiSearchLoading?: boolean;
  isSearchActive: boolean; // Is either normal or AI search active?
  isAiSearchActive?: boolean; // Is AI search specifically active?
  activeSearchTerm: string; // The term being actively searched (normal or AI)
  filterCount: number;
  showAiSearchButton?: boolean;
  isMobile: boolean;
  aiSearchError?: string | null;
}

export default function MapControls({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onNormalSearch,
  onAiSearch,
  onOpenFilterModal,
  isAiSearchLoading = false,
  isSearchActive,
  isAiSearchActive = false,
  activeSearchTerm,
  filterCount,
  showAiSearchButton = false,
  isMobile,
  aiSearchError,
}: MapControlsProps) {

  const handleClearActiveSearch = () => {
    // This function should clear the *active* search state in the parent,
    // potentially leaving the input field as is, or clearing it too via onClearSearch.
    // For simplicity now, let's assume onClearSearch handles everything.
    onClearSearch();
  };

  const searchPlaceholder = showAiSearchButton ? "Search or ask AI..." : "Search locations...";
  const normalSearchDisabled = !searchQuery.trim() || isAiSearchLoading;
  const aiSearchDisabled = !showAiSearchButton || !onAiSearch || !searchQuery.trim() || isAiSearchLoading;

  return (
    <>
      {/* Search and Filter Bar */}
      <div className={cn(
        "p-2 bg-white border-b flex gap-2 items-center",
        isMobile ? "sticky top-0 z-10 flex-shrink-0" : "" // Mobile specific styles
      )}>
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          onClear={onClearSearch} // Use the combined clear function
          className="flex-grow"
          placeholder={searchPlaceholder}
        />

        {/* Normal Search Trigger Button */}
        <Button
          variant="outline"
          size={isMobile ? "icon" : "sm"}
          className={cn(isMobile ? "h-9 w-9" : "gap-1.5")}
          onClick={onNormalSearch}
          disabled={normalSearchDisabled}
          title="Search"
        >
          <SearchIcon className="h-4 w-4" />
          {!isMobile && <span className="sr-only sm:not-sr-only">Search</span>}
          {isMobile && <span className="sr-only">Search</span>}
        </Button>

        {/* AI Search Trigger Button (Conditional) */}
        {showAiSearchButton && onAiSearch && (
          <Button
            variant="outline"
            size={isMobile ? "icon" : "sm"}
            className={cn(isMobile ? "h-9 w-9" : "gap-1.5")}
            onClick={onAiSearch}
            disabled={aiSearchDisabled}
            title="Search with AI"
          >
            {isAiSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {!isMobile && <span className="sr-only sm:not-sr-only">AI</span>}
            {isMobile && <span className="sr-only">AI Search</span>}
          </Button>
        )}

        {/* Filter Button */}
        <Button
          variant="outline"
          size={isMobile ? "icon" : "sm"}
          className={cn("relative", isMobile ? "h-9 w-9" : "gap-1.5")}
          onClick={onOpenFilterModal}
        >
          <Filter className="h-4 w-4" />
          {!isMobile && <span>Filters</span>}
          {isMobile && <span className="sr-only">Filters</span>}
          {filterCount > 0 && !isSearchActive && ( // Hide badge if any search is active
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
              {filterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Search Active Indicator / Clear Button */}
      {isSearchActive && (
        <div className="p-2 bg-blue-50 border-b text-center text-sm text-blue-700 flex justify-between items-center flex-shrink-0">
          <span>Showing {isAiSearchActive ? 'AI ' : ''}search results for "{activeSearchTerm}"</span>
          <Button variant="ghost" size="sm" onClick={handleClearActiveSearch} className="text-blue-700 hover:bg-blue-100 h-7 px-2">
            <XCircleIcon className="w-4 h-4 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* AI Search Error Message */}
      {aiSearchError && (
        <div className="p-2 bg-red-50 border-b text-center text-sm text-red-700 flex-shrink-0">
          AI Search Error: {aiSearchError}
        </div>
      )}
    </>
  );
}