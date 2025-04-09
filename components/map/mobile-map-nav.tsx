// components/map/mobile-map-nav.tsx
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { MapIcon, ListBulletIcon, CalendarIcon } from '@heroicons/react/24/outline';

type MobileView = 'map' | 'list' | 'plan';

interface MobileMapNavProps {
  currentView: MobileView;
  availableViews: MobileView[];
  onViewChange: (view: MobileView) => void;
}

const viewIcons: Record<MobileView, React.ElementType> = {
  map: MapIcon,
  list: ListBulletIcon,
  plan: CalendarIcon,
};

const viewLabels: Record<MobileView, string> = {
  map: 'Map',
  list: 'List',
  plan: 'Plan',
};

export default function MobileMapNav({ currentView, availableViews, onViewChange }: MobileMapNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t p-1 flex justify-around items-center h-[60px] flex-shrink-0">
      {availableViews.map((view) => {
        const Icon = viewIcons[view];
        const label = viewLabels[view];
        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={cn(
              "flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full",
              currentView === view ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}