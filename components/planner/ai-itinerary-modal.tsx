// /components/planner/ai-itinerary-modal.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Import the Textarea component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, Wand2 } from 'lucide-react'; // Added Wand2

interface AiItineraryModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AiItineraryModal({ isOpen, onOpenChange }: AiItineraryModalProps) {
    const [numDays, setNumDays] = useState<number>(3); // Default to 3 days
    const [userPrompt, setUserPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleGenerate = async () => {
        // Frontend validation
        if (numDays <= 0 || numDays > 14) { // Match API limit
             setError("Please enter a number of days between 1 and 14.");
             return;
        }
        if (!userPrompt.trim()) {
            setError("Please describe your desired trip.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/itineraries/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numDays, userPrompt }),
            });

            const result = await response.json();

            if (!response.ok) {
                // Use the error message from the API response if available
                throw new Error(result.error || `Failed to generate itinerary (status ${response.status})`);
            }

            // Close modal and redirect to the new itinerary page
            onOpenChange(false);
            router.push(`/planner/${result.itineraryId}`);
            // Optional: Add a small delay before redirect if needed for modal closing animation
            // await new Promise(resolve => setTimeout(resolve, 300));

        } catch (err: any) {
            console.error("Error generating itinerary:", err);
            setError(err.message || "An unexpected error occurred. Please check the console or try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Reset form state when modal is closed
    const handleModalChange = (open: boolean) => {
        if (!open) {
            // Reset state when closing
            setNumDays(3);
            setUserPrompt('');
            setIsLoading(false);
            setError(null);
        }
        onOpenChange(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleModalChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-600" />
                        Generate Itinerary with AI
                    </DialogTitle>
                    <DialogDescription>
                        Tell us about your trip, and we'll create a starting plan for you! You can edit it afterwards.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="numDays" className="text-right">
                            Days
                        </Label>
                        <Input
                            id="numDays"
                            type="number"
                            min="1"
                            max="14" // Add max limit matching API
                            value={numDays}
                            onChange={(e) => setNumDays(Math.max(1, parseInt(e.target.value, 10) || 1))} // Ensure positive number
                            className="col-span-3"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="userPrompt" className="text-right pt-2">
                            Prompt
                        </Label>
                        <Textarea
                            id="userPrompt"
                            placeholder="e.g., Focus on nature and temples, maybe 3-4 activities per day. Include some good photo spots and places good for kids."
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            className="col-span-3 min-h-[100px]"
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-red-600 text-sm col-span-4 text-center px-2 py-1 bg-red-50 border border-red-200 rounded">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isLoading}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isLoading || !userPrompt.trim() || numDays <= 0} // Disable if loading or invalid input
                        className="bg-purple-600 hover:bg-purple-700 text-white" // Style the generate button
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Generate Itinerary"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}