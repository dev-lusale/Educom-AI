import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Google (for OAuth profile pictures) and Supabase Storage
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Supabase Storage — profile images and uploaded assets
      { protocol: "https", hostname: "fjjpcbmtmrgiqnwgyfow.supabase.co" },
    ],
  },

  // Silence the "Critical dependency" warning from chromadb in dev
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
