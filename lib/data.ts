import { LocationData } from "./types"

export const locations: LocationData[] = [
  {
    id: "meiji-shrine",
    name: "Meiji Shrine",
    description: "A Shinto shrine dedicated to Emperor Meiji and Empress Shoken, set in a peaceful forest in the heart of Tokyo.",
    category: "Shrine",
    coordinates: [35.6764, 139.6993],
    images: ["https://images.unsplash.com/photo-1624253321171-1be53e12f5f4"]
  },
  {
    id: "shibuya-crossing",
    name: "Shibuya Crossing",
    description: "The world's busiest pedestrian crossing, surrounded by giant video screens and neon signs.",
    category: "Activity",
    coordinates: [35.6595, 139.7004],
    images: ["https://images.unsplash.com/photo-1542931287-023b922fa89b"]
  },
  {
    id: "ueno-park",
    name: "Ueno Park",
    description: "A spacious public park known for its museums, temples, and seasonal cherry blossoms.",
    category: "Nature",
    coordinates: [35.7155, 139.7737],
    images: ["https://images.unsplash.com/photo-1557862921-37829c7c0956"]
  }
]