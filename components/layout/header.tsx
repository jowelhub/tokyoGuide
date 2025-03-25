"use client"

import Link from "next/link"
import { Home, Map, LogIn, UserPlus, Menu, X, Calendar } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"

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
          className={`flex items-center gap-2 hover:text-gray-600 bg-transparent border-none cursor-pointer ${isMobile ? 'text-lg' : 'text-sm'}`}
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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold flex items-center gap-2 z-10">
          Tokyo Guide
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <NavLink href="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavLink href="/explore" icon={<Map className="w-5 h-5" />} label="Explore" />
          <NavLink href="/planner" icon={<Calendar className="w-5 h-5" />} label="Planner" />
          <AuthSection />
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden z-10 focus:outline-none"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[5] md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-x-0 top-0 bg-white/95 z-[5] md:hidden flex flex-col pt-20 px-4 h-[100vh] animate-in slide-in-from-top duration-300">
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
          </>
        )}
      </div>
    </header>
  )
}