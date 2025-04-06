// /components/planner/planner-dashboard-client.tsx
"use client";

import { useState, useEffect, useCallback } from 'react'; // Import useEffect and useCallback
import { useRouter } from 'next/navigation';
import AddItineraryCard from './add-itinerary-card';
import ItineraryCard from './itinerary-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface ItineraryInfo {
    id: number;
    name: string;
}

interface PlannerDashboardClientProps {
    initialItineraries: ItineraryInfo[];
}

export default function PlannerDashboardClient({ initialItineraries }: PlannerDashboardClientProps) {
    const [itineraries, setItineraries] = useState<ItineraryInfo[]>(initialItineraries);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItineraryName, setNewItineraryName] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Loading state for creation modal
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // --- Function to fetch the latest list of itineraries ---
    const fetchItinerariesList = useCallback(async () => {
        console.log("Fetching latest itineraries client-side...");
        // Optional: Add a loading state specifically for the list if needed
        try {
            const response = await fetch('/api/itineraries'); // Use the GET endpoint
            if (!response.ok) {
                throw new Error('Failed to fetch itineraries');
            }
            const data: ItineraryInfo[] = await response.json();
            // Update state only if data is different to avoid unnecessary re-renders
            if (JSON.stringify(data) !== JSON.stringify(itineraries)) {
                 console.log("Itinerary list updated.");
                 setItineraries(data);
            } else {
                 console.log("Itinerary list is up-to-date.");
            }
        } catch (fetchError: any) {
            console.error("Error fetching itineraries client-side:", fetchError);
            // Optionally set an error state for the list fetching
            // setListError(fetchError.message);
        }
    }, [itineraries]); // Depend on current itineraries to compare in check

    // --- Effect to fetch itineraries on mount ---
    useEffect(() => {
        // Fetch the latest list when the component mounts on the client.
        // This ensures freshness when navigating back to the page.
        fetchItinerariesList();
        // We only want this to run once on mount to potentially refresh
        // the server-provided initial data.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures it runs once on mount


    const handleAddClick = () => {
        setNewItineraryName('');
        setError(null);
        setIsModalOpen(true);
    };

    const handleCreateItinerary = async () => {
        if (!newItineraryName.trim()) {
            setError("Please enter a name for your itinerary.");
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/itineraries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newItineraryName.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to create itinerary (status ${response.status})`);
            }

            // --- No need to update state here anymore, redirect will handle it ---
            // setItineraries(prev => [...prev, result]); // Remove or comment out this line

            // Close modal and redirect
            setIsModalOpen(false);
            router.push(`/planner/${result.id}`); // Redirect to the new itinerary's planner page

        } catch (err: any) {
            console.error("Error creating itinerary:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Your Itineraries</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Add New Card */}
                <AddItineraryCard onClick={handleAddClick} />

                {/* Existing Itinerary Cards - Render based on the 'itineraries' state */}
                {itineraries.map((itinerary) => (
                    <ItineraryCard key={itinerary.id} id={itinerary.id} name={itinerary.name} />
                ))}
            </div>

            {/* Create New Itinerary Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Itinerary</DialogTitle>
                        <DialogDescription>
                            Give your new trip plan a name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            id="name"
                            placeholder="e.g., Summer Trip 2024, Tokyo Weekend"
                            value={newItineraryName}
                            onChange={(e) => setNewItineraryName(e.target.value)}
                            disabled={isLoading}
                            className="col-span-3"
                        />
                        {error && <p className="text-red-500 text-sm col-span-3">{error}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isLoading}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="button" onClick={handleCreateItinerary} disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create & Plan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}