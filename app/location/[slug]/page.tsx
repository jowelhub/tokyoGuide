import { notFound } from "next/navigation"
import Image from "next/image"
import { getLocationBySlug } from "@/lib/supabase/locations"
import Header from "@/components/layout/header"

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const location = await getLocationBySlug(params.slug)
  
  if (!location) {
    return {
      title: "Location Not Found",
      description: "The requested location could not be found."
    }
  }
  
  return {
    title: `${location.name} - Tokyo Guide`,
    description: location.description,
    openGraph: {
      images: location.images[0] ? [location.images[0]] : [],
    },
  }
}

export default async function LocationPage({ params }: { params: { slug: string } }) {
  const location = await getLocationBySlug(params.slug)
  
  if (!location) {
    notFound()
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">{location.name}</h1>
          <div className="mb-6">
            <span className="inline-block px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800">
              {location.category}
            </span>
          </div>
          
          {/* Main image */}
          {location.images.length > 0 && (
            <div className="relative h-96 mb-8 rounded-xl overflow-hidden">
              <Image
                src={location.images[0]}
                alt={location.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
          
          {/* Description */}
          <div className="prose max-w-none mb-8">
            <h2 className="text-2xl font-semibold mb-4">About this place</h2>
            <p className="text-gray-700">{location.description}</p>
          </div>
          
          {/* Additional images */}
          {location.images.length > 1 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Photos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {location.images.slice(1).map((image, index) => (
                  <div key={index} className="relative h-64 rounded-lg overflow-hidden">
                    <Image
                      src={image}
                      alt={`${location.name} - Image ${index + 2}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Location on map */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Location</h2>
            <div className="relative h-80 rounded-lg overflow-hidden border">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${location.coordinates[0]},${location.coordinates[1]}`}
                allowFullScreen
              ></iframe>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Note: You'll need to replace YOUR_API_KEY with a valid Google Maps API key or use another mapping solution.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
