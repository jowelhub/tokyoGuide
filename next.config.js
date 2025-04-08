// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // If using Supabase Storage, add its pattern:
      {
         protocol: 'https', // Or http if needed
         // Replace YOUR_PROJECT_ID and YOUR_REGION if applicable
         hostname: '*.supabase.co', // Or be more specific like 'YOUR_PROJECT_ID.supabase.co'
      },
      // Add any other domains you load images from
    ],
  },
};

module.exports = nextConfig;