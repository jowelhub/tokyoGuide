"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

// Keys for storing auth data in localStorage
const USER_STORAGE_KEY = 'tokyo_guide_user'
const EXPIRES_AT_STORAGE_KEY = 'tokyo_guide_expires_at'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Initialize user from localStorage on mount
  useEffect(() => {
    const initializeUser = () => {
      try {
        setIsLoading(true);
        // Try to get user and expiration from localStorage first
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedExpiresAt = localStorage.getItem(EXPIRES_AT_STORAGE_KEY);
        
        if (storedUser && storedExpiresAt) {
          const parsedUser = JSON.parse(storedUser);
          const expiresAt = new Date(storedExpiresAt);
          const now = new Date();
          
          // Check if token is still valid
          if (expiresAt > now) {
            setUser(parsedUser);
            // If token expires soon (within 10 minutes), refresh in background
            const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
            if (expiresAt < tenMinutesFromNow) {
              fetchUser(false); // Silent refresh
            }
          } else {
            // Token expired, fetch new one
            console.log('Token expired, fetching new session');
            fetchUser(true);
          }
        } else {
          // Only make API call if no valid user data in localStorage
          fetchUser(true);
        }
      } catch (error) {
        console.error("Error initializing user:", error);
        // If localStorage fails, fall back to API
        fetchUser(true);
      } finally {
        setIsLoading(false);
      }
    }

    initializeUser();
  }, []);

  // Function to fetch user from API
  const fetchUser = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      const response = await fetch('/api/session');
      const data = await response.json();
      
      if (data.user) {
        // Store user and expiration in localStorage to avoid future API calls
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        
        if (data.expiresAt) {
          localStorage.setItem(EXPIRES_AT_STORAGE_KEY, data.expiresAt);
        }
        
        setUser(data.user);
      } else {
        // Clear stored auth data
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
        setUser(null);
      }
      
      return data.user;
    } catch (error) {
      console.error("Error fetching user:", error);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
      setUser(null);
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Function to update user state (called by login/register forms)
  const updateUserState = useCallback((newUser: User | null) => {
    if (newUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
    setUser(newUser)
  }, [])

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/logout', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sign out');
      }
      
      // Clear all auth data from localStorage
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
      setUser(null);
      router.push('/');
      router.refresh();
      return { success: true };
    } catch (error) {
      console.error("Error signing out:", error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    user,
    isLoggedIn: !!user,
    isLoading,
    refreshUser: fetchUser, // Renamed from checkUser to better reflect its purpose
    updateUserState,
    signOut
  }
}
