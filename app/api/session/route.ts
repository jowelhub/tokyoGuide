import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get both user and session data
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (userError || sessionError) {
      console.error("Session error:", userError?.message || sessionError?.message);
      return NextResponse.json({ user: null, expiresAt: null }, { status: 200 });
    }

    // Calculate token expiration time for client-side caching
    const expiresAt = sessionData?.session?.expires_at 
      ? new Date(sessionData.session.expires_at * 1000).toISOString() 
      : null;

    return NextResponse.json({ 
      user: userData.user,
      expiresAt: expiresAt
    }, { status: 200 });
  } catch (error) {
    console.error("Unexpected session error:", error);
    return NextResponse.json({ user: null, expiresAt: null }, { status: 200 });
  }
}
