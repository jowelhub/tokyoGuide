// /components/planner/planner-dashboard-client.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AddItineraryCard from './add-itinerary-card';
import ItineraryCard from './itinerary-card';
import AiItineraryModal from './ai-itinerary-modal'; // Import the AI modal
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Wand2 } from 'lucide-react'; // Icon for AI button

interface ItineraryInfo {
    id: number;
    name: string;
}

interface PlannerDashboardClientProps {
    initialItineraries: ItineraryInfo[];
}

export default function PlannerDashboardClient({ initialItineraries }: PlannerDashboardClientProps) {
    const [itineraries, setItineraries] = useState<ItineraryInfo[]>(initialItineraries);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); // For manual creation
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);   // For AI generation
    const [newItineraryName, setNewItineraryName] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Loading state for manual creation modal
    const [error, setError] = useState<string | null>(null); // Error state for manual creation modal
    const router = useRouter();

    // Function to fetch the latest list of itineraries
    const fetchItinerariesList = useCallback(async () => {
        console.log("Fetching latest itineraries client-side...");
        try {
            const response = await fetch('/api/itineraries');
            if (!response.ok) {
                throw new Error('Failed to fetch itineraries');
            }
            const data: ItineraryInfo[] = await response.json();
            // Update state only if data is different
            if (JSON.stringify(data) !== JSON.stringify(itineraries)) {
                 console.log("Itinerary list updated.");
                 setItineraries(data);
            } else {
                 console.log("Itinerary list is up-to-date.");
            }
        } catch (fetchError: any) {
            console.error("Error fetching itineraries client-side:", fetchError);
            // Handle list fetch error if needed
        }
    }, [itineraries]); // Depend on current itineraries

    // Effect to fetch itineraries on mount/refresh
    useEffect(() => {
        fetchItinerariesList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Handler for opening the MANUAL add modal
    const handleAddClick = () => {
        setNewItineraryName('');
        setError(null); // Clear manual error
        setIsAddModalOpen(true);
    };

    // Handler for creating itinerary MANUALLY
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

            setIsAddModalOpen(false); // Close the manual modal
            router.push(`/planner/${result.id}`); // Redirect

        } catch (err: any) {
            console.error("Error creating itinerary manually:", err);
            setError(err.message || "An unexpected error occurred."); // Set error for manual modal
        } finally {
            setIsLoading(false);
        }
    };

    // Handler to open AI modal
    const handleAiGenerateClick = () => {
        setIsAiModalOpen(true);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Your Itineraries</h1>
            {/* Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {/* Add New Card (Manual) */}
                <AddItineraryCard onClick={handleAddClick} />

                {/* Generate with AI Card */}
                <button
                    onClick={handleAiGenerateClick}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-500 hover:text-purple-700 transition-colors aspect-video cursor-pointer h-full bg-purple-50/50 hover:bg-purple-100/70" // Added hover background
                >
                    <Wand2 className="w-12 h-12 mb-2" />
                    <span className="text-lg font-medium text-center">Generate with AI</span>
                </button>

                {/* Existing Itinerary Cards - Render based on the 'itineraries' state */}
                {itineraries.map((itinerary) => (
                    <ItineraryCard key={itinerary.id} id={itinerary.id} name={itinerary.name} />
                ))}
            </div>

            {/* Manual Create New Itinerary Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Itinerary</DialogTitle>
                        <DialogDescription>
                            Give your new trip plan a name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            id="manualName" // Ensure unique ID if both modals could theoretically be open
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
                        <Button type="button" onClick={handleCreateItinerary} disabled={isLoading || !newItineraryName.trim()}>
                            {isLoading ? "Creating..." : "Create & Plan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AI Generate Itinerary Modal */}
            <AiItineraryModal isOpen={isAiModalOpen} onOpenChange={setIsAiModalOpen} />

        </div>
    );
}