"use client"

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { XIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search locations...",
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 h-9" // Add padding for icons
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full"
          onClick={onClear}
          aria-label="Clear search"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}