"use client"

import Link from "next/link"
import Image from "next/image" // Import Image component
import { Home, Map, LogIn, User, Menu, X, Calendar, LogOut } from "lucide-react" // Added User and LogOut icons
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button" // Import Button

// Default User Icon Component
const DefaultUserIcon = ({ className }: { className?: string }) => (
  <User className={cn("w-6 h-6 rounded-full bg-gray-200 text-gray-500 p-0.5", className)} />
);

export default function Header() {
  const { user, isLoading, signOut, isInitialized } = useAuth() // Get user, loading state, signOut function, and initialization status
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false) // Close mobile menu on sign out
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Reusable navigation link component
  const NavLink = ({ href, icon, label, onClick }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
  }) => (
    <Link
      href={href}
      className="flex items-center gap-2 hover:text-gray-600 text-sm" // Consistent text size
      onClick={onClick}
    >
      {icon}
      {label}
    </Link>
  );

  // Reusable Mobile navigation link component
  const MobileNavLink = ({ href, icon, label, onClick }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
  }) => (
    <Link
      href={href}
      className="flex items-center gap-3 py-3 text-lg hover:text-gray-600 w-full justify-center" // Mobile specific styling
      onClick={onClick}
    >
      {icon}
      {label}
    </Link>
  );

  // Auth section component for Desktop
  const AuthSectionDesktop = () => {
    // Wait for initialization before deciding what to render
    if (!isInitialized) return <div className="h-9 w-20 animate-pulse bg-gray-200 rounded-md"></div>; // Placeholder while loading

    if (user) {
      const avatarUrl = user.user_metadata?.avatar_url;
      const userName = user.user_metadata?.full_name || user.email || "User"; // Fallback name

      return (
        // Button styled like the example, triggers sign out
        <Button
          variant="outline"
          className="flex items-center gap-2 px-3 py-1.5 h-9 border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
          onClick={handleSignOut}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <DefaultUserIcon className="w-6 h-6" />
          )}
          <span className="text-sm font-medium truncate max-w-[100px]">{userName}</span>
        </Button>
      );
    }

    // Logged out state: Single "Log In" button
    return (
      <Button
        asChild // Use asChild to make the Button act as a Link
        variant="outline"
        className="px-4 py-2 h-9 border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
      >
        <Link href="/login">
          Log In
        </Link>
      </Button>
    );
  };

  // Auth section component for Mobile Menu
  const AuthSectionMobile = () => {
    if (!isInitialized) return null; // Don't show anything in mobile menu until initialized

    if (user) {
      const userName = user.user_metadata?.full_name || user.email || "User";
      return (
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 py-3 text-lg hover:text-gray-600 w-full justify-center text-red-600" // Sign out styling
        >
          <LogOut className="w-5 h-5" />
          Sign Out ({userName})
        </button>
      );
    }

    // Logged out state for mobile
    return (
      <MobileNavLink
        href="/login"
        icon={<LogIn className="w-5 h-5" />}
        label="Log In / Sign Up"
        onClick={() => setMobileMenuOpen(false)}
      />
    );
  };

  return (
    <header className="border-b sticky top-0 bg-white z-50"> {/* Make header sticky */}
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
        <Link href="/" className="text-xl font-bold flex items-center gap-2">
          Tokyo Guide
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <NavLink href="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavLink href="/explore" icon={<Map className="w-5 h-5" />} label="Explore" />
          {/* Show Planner only if logged in, or always show? Adjust based on your logic */}
          {isInitialized && user && (
             <NavLink href="/planner" icon={<Calendar className="w-5 h-5" />} label="Planner" />
          )}
          <div className="ml-2"> {/* Add some spacing */}
            <AuthSectionDesktop />
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden z-60 focus:outline-none p-1" // Ensure button is above overlay when closed
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-white z-50 md:hidden flex flex-col items-center pt-16 px-4"> {/* Start content below header */}
            {/* Close button is now part of the toggle button above */}
            <nav className="flex flex-col items-center gap-4 text-lg w-full mt-4"> {/* Add gap and top margin */}
              <MobileNavLink
                href="/"
                icon={<Home className="w-5 h-5" />}
                label="Home"
                onClick={() => setMobileMenuOpen(false)}
              />
              <MobileNavLink
                href="/explore"
                icon={<Map className="w-5 h-5" />}
                label="Explore"
                onClick={() => setMobileMenuOpen(false)}
              />
              {/* Show Planner only if logged in */}
               {isInitialized && user && (
                  <MobileNavLink
                    href="/planner"
                    icon={<Calendar className="w-5 h-5" />}
                    label="Planner"
                    onClick={() => setMobileMenuOpen(false)}
                  />
               )}
              <div className="border-t w-full my-4"></div> {/* Separator */}
              <AuthSectionMobile />
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}