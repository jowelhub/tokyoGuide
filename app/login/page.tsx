import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form"; // Ensure this path is correct

export const metadata = {
  title: "Log In or Sign Up - Tokyo Guide",
  description: "Log in or sign up for Tokyo Guide using Google",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* This container centers its direct children vertically and horizontally */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Login Box Container - This is now the only direct child being centered */}
        <div className="w-full max-w-md"> {/* Container for the box itself */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

      </div>
    </div>
  );
}