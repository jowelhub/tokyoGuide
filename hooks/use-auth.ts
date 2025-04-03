"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import type { User, Session } from "@supabase/supabase-js"

// Initialize Supabase client only once using useRef to avoid re-creation on re-renders
const getSupabaseBrowserClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start loading until initial check is done
  const [isInitialized, setIsInitialized] = useState(false); // Track if the initial check is complete
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  if (!supabaseRef.current) {
    supabaseRef.current = getSupabaseBrowserClient();
  }
  const supabase = supabaseRef.current;


  useEffect(() => {
    console.log('[useAuth] useEffect running - checking initial session');
    let isMounted = true;

    async function getInitialSession() {
      try {
        // getSession reads from storage/cookies, doesn't necessarily hit the network
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return; // Prevent state update if component unmounted

        if (error) {
          console.error("[useAuth] Error getting initial session:", error.message);
          setUser(null);
        } else {
          console.log('[useAuth] Initial session fetched:', session ? 'Exists' : 'None');
          setUser(session?.user ?? null);
        }
      } catch (err) {
        if (isMounted) {
           console.error("[useAuth] Unexpected error fetching initial session:", err);
           setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
          console.log('[useAuth] Initial check complete. Loading:', false);
        }
      }
    }

    getInitialSession();

    // --- Listener for Auth Changes ---
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return; // Prevent state update if component unmounted

        console.log(`[useAuth] onAuthStateChange event: ${_event}`, session ? 'Session exists' : 'No session');
        setUser(session?.user ?? null);
        // We might briefly set loading to true during transitions like SIGNED_IN/SIGNED_OUT
        // but the main loading state is for the *initial* check.
        // For subsequent changes, the UI should ideally react to the user state change directly.
        if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'USER_UPDATED') {
          setIsLoading(false); // Ensure loading is false after definite events
        }
      }
    );

    // --- Cleanup ---
    return () => {
      isMounted = false;
      console.log('[useAuth] Cleaning up auth listener.');
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [supabase]); // Depend only on the supabase client instance

  const signOut = useCallback(async () => {
    console.log('[useAuth] Signing out...');
    setIsLoading(true); // Indicate loading during sign out process
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        throw error;
      }
      // setUser(null) will be handled by onAuthStateChange listener
      console.log('[useAuth] Sign out successful via Supabase client.');
      router.push('/'); // Redirect to home page after sign out
      router.refresh(); // Refresh server components
      return { success: true };
    } catch (error) {
      console.error("Error during sign out process:", error);
      return { success: false, error };
    }
  }, [supabase, router]);

  return {
    user,
    // Check if initialization is complete AND user exists
    isLoggedIn: isInitialized && !!user,
    // Only true during the very first session check on mount
    isLoading: isLoading,
    // Can be used to wait for the initial check if needed elsewhere
    isInitialized,
    signOut,
    // Expose Supabase client for direct use if needed (e.g., for OAuth in forms)
    supabase 
  }
}
