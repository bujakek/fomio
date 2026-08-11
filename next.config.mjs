/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Guest photos are served straight from Supabase Storage; revisit if
    // gallery payloads get too heavy on mobile data.
    unoptimized: true,
  },
}

export default nextConfig
