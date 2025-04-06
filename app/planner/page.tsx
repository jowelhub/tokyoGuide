// /app/planner/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/header';
import PlannerDashboardClient from '@/components/planner/planner-dashboard-client'; // New component
import PageClient from '@/components/page-client'; // To prevent hydration errors

// Helper function to fetch itineraries (can be moved to lib/supabase/itineraries.ts later)
async function getItinerariesForUser(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('user_itineraries')
        .select('id, name')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching itineraries in server component:", error.message);
        return []; // Return empty array on error
    }
    return data || [];
}

export default async function PlannerDashboardPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Redirect to login if not authenticated
        redirect('/login?message=Please log in to access the planner');
    }

    // Fetch the list of itineraries for the logged-in user
    const itineraries = await getItinerariesForUser(user.id);

    return (
        <div className="flex flex-col min-h-screen"> {/* Use min-h-screen for dashboard */}
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8">
                <PageClient> {/* Wrap client component */}
                    <PlannerDashboardClient initialItineraries={itineraries} />
                </PageClient>
            </main>
            {/* Optional: Add Footer if desired for the dashboard */}
        </div>
    );
}