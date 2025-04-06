// /components/planner/itinerary-card.tsx
import Link from 'next/link';
import { CalendarDaysIcon } from '@heroicons/react/24/outline'; // Or another relevant icon

interface ItineraryCardProps {
    id: number;
    name: string;
}

export default function ItineraryCard({ id, name }: ItineraryCardProps) {
    return (
        <Link href={`/planner/${id}`} legacyBehavior>
            <a className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow aspect-video cursor-pointer bg-white h-full text-center">
                <CalendarDaysIcon className="w-12 h-12 mb-3 text-blue-500" />
                <span className="text-lg font-semibold text-gray-800 break-words">{name}</span>
                {/* Optional: Add more info like date created or number of days */}
            </a>
        </Link>
    );
}