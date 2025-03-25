"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const checkUser = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      return user
    } catch (error) {
      console.error("Error checking authentication:", error)
      setUser(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // Check user on mount
    checkUser()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    // Clean up subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, checkUser])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (error) {
      console.error("Error signing in:", error)
      return { success: false, error }
    }
  }, [supabase])

  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (error) {
      console.error("Error signing in with Google:", error)
      return { success: false, error }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error("Error signing out:", error)
      return { success: false, error }
    }
  }, [supabase])

  return {
    user,
    isLoggedIn: !!user,
    isLoading,
    checkUser,
    signIn,
    signInWithGoogle,
    signOut
  }
}
