"use client"

import Link from "next/link"
import { Home, Map, LogIn, UserPlus, Menu, X, Calendar } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

export default function Header() {
  const { user, isLoading, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
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
      className="flex items-center gap-2 hover:text-gray-600"
      onClick={onClick}
    >
      {icon}
      {label}
    </Link>
  );

  // Auth section component
  const AuthSection = ({ isMobile = false }: { isMobile?: boolean }) => {
    if (isLoading) return null;

    if (user) {
      return (
        <button
          onClick={() => {
            handleSignOut();
            if (isMobile) setMobileMenuOpen(false);
          }}
          className={cn(
            "flex items-center gap-2 hover:text-gray-600 bg-transparent border-none cursor-pointer",
            isMobile ? 'text-lg' : 'text-sm'
          )}
        >
          Sign Out
        </button>
      );
    }

    return (
      <>
        <NavLink
          href="/login"
          icon={<LogIn className="w-5 h-5" />}
          label="Sign In"
          onClick={isMobile ? () => setMobileMenuOpen(false) : undefined}
        />
        <NavLink
          href="/register"
          icon={<UserPlus className="w-5 h-5" />}
          label="Register"
          onClick={isMobile ? () => setMobileMenuOpen(false) : undefined}
        />
      </>
    );
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative"> {/* Added relative for positioning context */}
        <Link href="/" className="text-xl font-bold flex items-center gap-2">
          Tokyo Guide
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <NavLink href="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavLink href="/explore" icon={<Map className="w-5 h-5" />} label="Explore" />
          <NavLink href="/planner" icon={<Calendar className="w-5 h-5" />} label="Planner" />
          <AuthSection />
        </nav>

        {/* Mobile Menu OPEN Button */}
        {/* Only show the Menu button if the menu is closed */}
        {!mobileMenuOpen && (
          <button
            className="md:hidden z-20 focus:outline-none p-1"
            onClick={toggleMobileMenu}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        {/* Mobile Menu Overlay - Full Screen White */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-white z-50 md:hidden flex flex-col items-center pt-20 px-4"> {/* Full screen, white bg, z-50 */}
            {/* Mobile Menu CLOSE Button (Inside the full screen overlay) */}
            <button
              className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-900 focus:outline-none rounded-full hover:bg-gray-100"
              onClick={toggleMobileMenu}
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Links - Removed extra top margin */}
            <nav className="flex flex-col items-center gap-6 text-lg">
              <NavLink
                href="/"
                icon={<Home className="w-5 h-5" />}
                label="Home"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavLink
                href="/explore"
                icon={<Map className="w-5 h-5" />}
                label="Explore"
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavLink
                href="/planner"
                icon={<Calendar className="w-5 h-5" />}
                label="Planner"
                onClick={() => setMobileMenuOpen(false)}
              />
              <AuthSection isMobile />
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}