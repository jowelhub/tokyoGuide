import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login - Tokyo Guide",
  description: "Sign in to your Tokyo Guide account",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <a href="/" className="text-2xl font-bold">Tokyo Guide</a>
          </div>
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