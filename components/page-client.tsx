"use client"

import { useEffect, useState } from "react"

interface PageClientProps {
  children: React.ReactNode;
}

export default function PageClient({ children }: PageClientProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  return <>{children}</>;
}
