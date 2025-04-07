// /app/location/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getLocationBySlug } from "@/lib/supabase/locations";
import Header from "@/components/layout/header";
import PageClient from "@/components/page-client"; // Import PageClient
import LocationClient from "@/components/location/location-client"; // Import the new client component

// Metadata generation remains the same
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const location = await getLocationBySlug(params.slug);

  if (!location) {
    return {
      title: "Location Not Found",
      description: "The requested location could not be found."
    };
  }

  return {
    title: `${location.name} - Tokyo Guide`,
    description: location.description, // Use short description for metadata
    openGraph: {
      images: location.images && location.images.length > 0 ? [location.images[0]] : [],
    },
  };
}

// Default export for the page component
export default async function LocationPage({ params }: { params: { slug: string } }) {
  // Fetch location data
  const location = await getLocationBySlug(params.slug);

  // Handle not found case
  if (!location) {
    notFound();
  }

  // Return the structure using PageClient and LocationClient
  return (
    <div className="flex flex-col h-screen bg-white">
      <Header /> {/* Keep the main site header */}
      <div className="flex-1 overflow-hidden">
        <PageClient> {/* Wrap client component to prevent hydration errors */}
          <LocationClient location={location} />
        </PageClient>
      </div>
    </div>
  );
}