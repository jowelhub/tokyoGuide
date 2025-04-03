import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // First attempt to sign up the user
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error("Registration error:", signUpError.message);
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    // If signup is successful, immediately sign in the user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Auto-login after registration error:", signInError.message);
      // Return 200 with a warning since signup was successful but auto-login failed
      return NextResponse.json(
        { 
          success: true, 
          warning: "Account created, but automatic login failed. Please try logging in manually." 
        }, 
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
