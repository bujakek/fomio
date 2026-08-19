import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a blog post be an .mdx file that *is* the page, rather than a
  // markdown string parsed at runtime by a loader we would have to write.
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: {
    // Optimization is ON so the landing page's local assets get responsive
    // srcsets — a 1024px source has no business being downloaded into a 140px
    // tile. A global `unoptimized: true` silently voids every `sizes` prop.
    //
    // Guest photos are a different case: they are already compressed to spec
    // client-side (4096px / q92, see .cursor/skills/fomio-upload) and served
    // straight from Supabase Storage, so re-optimizing them buys nothing and
    // costs per-image quota. Put `unoptimized` on those <Image> tags
    // individually when the gallery lands, not here.
    formats: ['image/avif', 'image/webp'],
  },
}

const withMDX = createMDX()

export default withMDX(nextConfig)
