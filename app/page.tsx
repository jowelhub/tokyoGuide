import Link from "next/link"
import { MapPin } from "lucide-react"
import Header from "@/components/layout/header"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Discover Tokyo Like Never Before</h1>
            <p className="text-gray-600 mb-8">
              Your complete guide to exploring Tokyo. From hidden gems to must-see attractions, we've got everything you
              need to make your Tokyo adventure unforgettable.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              Start Exploring
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}