// components/location/location-client.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { LocationData } from "@/lib/types";
import { Info, Images } from "lucide-react"; // Using Lucide icons

interface LocationClientProps {
  location: LocationData;
}

export default function LocationClient({ location }: LocationClientProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mobileView, setMobileView] = useState<"info" | "images">("info"); // Default to info view

  const images = location.images || [];
  const hasImages = images.length > 0;
  const hasMarkdown = !!location.details_markdown;

  // Calculate bottom padding needed for mobile views to avoid nav overlap
  const mobileBottomPadding = "pb-[60px]";

  // Reusable component for the content sections
  const InfoSection = () => (
    <div className={cn("h-full overflow-y-auto", isMobile ? mobileBottomPadding : "border-r border-gray-200")}>
      <div className="p-4 sm:p-6 lg:p-8">
        {hasMarkdown ? (
          <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {location.details_markdown!}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No details available for this location.
          </div>
        )}
      </div>
    </div>
  );

  const ImageSection = () => (
    <div className={cn("h-full overflow-y-auto bg-gray-50", isMobile ? mobileBottomPadding : "")}>
      <div>
        {hasImages ? (
          <div className="grid grid-cols-1"> {/* Simple single column grid for images */}
            {images.map((image, index) => (
              <div key={index} className="relative w-full aspect-video">
                <Image
                  src={image}
                  alt={`${location.name} - Image ${index + 1}`}
                  fill
                  className="object-cover w-full h-full"
                  sizes={isMobile ? "100vw" : "50vw"} // Adjust sizes based on view
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 p-8">
            No images available.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {isMobile ? (
        /* --- Mobile Layout --- */
        <div className="h-full relative flex flex-col">
          {/* Mobile content area */}
          <div className="flex-1 overflow-hidden">
            {mobileView === "info" && <InfoSection />}
            {mobileView === "images" && <ImageSection />}
          </div>

          {/* Mobile bottom navigation */}
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t p-1 flex justify-around items-center h-[60px]">
            <button
              onClick={() => setMobileView("info")}
              className={cn(
                "flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full",
                mobileView === "info" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Info className="w-5 h-5" />
              <span>Information</span>
            </button>
            <button
              onClick={() => setMobileView("images")}
              className={cn(
                "flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1.5 text-xs h-full",
                mobileView === "images" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Images className="w-5 h-5" />
              <span>Images</span>
            </button>
          </div>
        </div>
      ) : (
        /* --- Desktop Layout (2 Columns) --- */
        <div className="flex flex-row h-full">
          {/* Left Column (Info) */}
          <div className="w-1/2 h-full">
            <InfoSection />
          </div>

          {/* Right Column (Images) */}
          <div className="w-1/2 h-full">
            <ImageSection />
          </div>
        </div>
      )}
    </div>
  );
}