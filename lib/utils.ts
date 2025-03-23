import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Category } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCategoryColor(category: Category): string {
  const lowerCaseCategory = category.toLowerCase() as Lowercase<Category>
  
  switch (lowerCaseCategory) {
    case "shrine":
      return "bg-blue-100 text-blue-800"
    case "nature":
      return "bg-green-100 text-green-800"
    case "activity":
      return "bg-purple-100 text-purple-800"
    case "food":
      return "bg-orange-100 text-orange-800"
    case "shopping":
      return "bg-pink-100 text-pink-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}