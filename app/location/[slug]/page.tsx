// /app/location/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getLocationBySlug } from "@/lib/supabase/locations";
import Header from "@/components/layout/header";

// Metadata generation still uses fetched data
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const location = await getLocationBySlug(params.slug);

  if (!location) {
    return {
      title: "Location Not Found",
      description: "The requested location could not be found."
    };
  }

  // Metadata uses the name and description fetched from DB
  return {
    title: `${location.name} - Tokyo Guide`,
    description: location.description,
    openGraph: {
      images: location.images && location.images.length > 0 ? [location.images[0]] : [],
    },
  };
}

// Default export for the page component
export default async function LocationPage({ params }: { params: { slug: string } }) {
  // Fetch location data
  const location = await getLocationBySlug(params.slug);

  // Handle not found case - execution stops here if location is null
  if (!location) {
    notFound();
    // Note: notFound() throws an error, so technically nothing below this line in the if block runs.
    // It's good practice to ensure no code follows notFound() within the same block.
  }

  // If we reach here, location is guaranteed to exist.
  const images = location.images || [];
  const hasImages = images.length > 0;

  // Return the JSX structure
  return (
    <div className="flex flex-col h-screen bg-white">
      <Header /> {/* Keep the main site header */}

      <div className="flex-1 overflow-hidden">
        <div className="flex flex-row h-full">

          {/* Left Column (Scrollable Markdown ONLY - 50% width on md+) */}
          <div className="w-full md:w-1/2 h-full overflow-y-auto border-r border-gray-200">
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Markdown Content */}
              {location.details_markdown ? (
                <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {location.details_markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No details available for this location.
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Scrollable Images - 50% width on md+, hidden on small) */}
          <div className="hidden md:block md:w-1/2 h-full overflow-y-auto bg-gray-100">
            <div>
              {hasImages ? (
                <div className="grid grid-cols-1">
                  {images.map((image, index) => (
                    <div key={index} className="relative w-full aspect-video">
                      <Image
                        src={image}
                        alt={`${location.name} - Image ${index + 1}`}
                        fill
                        className="object-cover w-full h-full"
                        sizes="50vw"
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

        </div>
      </div>
    </div>
  );
}