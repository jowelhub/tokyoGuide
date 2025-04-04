import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t py-4 mt-auto"> {/* Reduced padding slightly */}
      <div className="container mx-auto px-4 flex justify-between items-center text-sm text-gray-500">
        {/* Left side: Copyright */}
        <div>
          © {new Date().getFullYear()} Tokyo Guide. All rights reserved.
        </div>

        {/* Right side: Links */}
        <div>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <span className="mx-2">|</span> {/* Separator */}
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}