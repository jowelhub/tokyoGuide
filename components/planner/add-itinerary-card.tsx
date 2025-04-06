// /components/planner/add-itinerary-card.tsx
import { PlusIcon } from '@heroicons/react/24/solid';

interface AddItineraryCardProps {
    onClick: () => void;
}

export default function AddItineraryCard({ onClick }: AddItineraryCardProps) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors aspect-video cursor-pointer h-full" // Use aspect-video for consistent shape
        >
            <PlusIcon className="w-12 h-12 mb-2" />
            <span className="text-lg font-medium">Add New Itinerary</span>
        </button>
    );
}