"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth"; // Keep useAuth if needed elsewhere, or remove if not

// Google Icon SVG (or use an icon library if preferred)
const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="w-5 h-5 mr-2"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);


export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const { supabase } = useAuth(); // Get supabase client from useAuth if needed

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Dynamically import the browser client only when needed
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false); // Stop loading on error
      }
      // No redirect needed here, Supabase handles it.
      // setLoading(false) might not run if redirect happens quickly.
    } catch (err) {
      setError("An unexpected error occurred during Google sign-in.");
      console.error("Google sign-in error:", err);
      setLoading(false); // Stop loading on unexpected error
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        {/* Updated Title */}
        <h1 className="text-2xl font-bold">Log in or sign up</h1>
        {/* Removed descriptive text */}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Google Sign-In Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center" // Ensure flex alignment
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <GoogleIcon />
        {loading ? "Redirecting..." : "Continue with Google"}
      </Button>

      {/* Removed email/password form and register link */}
    </div>
  );
}