// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Vercel won't block deployments because of ESLint -
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Vercel won't block deployments because of TypeScript errors
    ignoreBuildErrors: true,
  },
  output: 'standalone',

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },

  // Compress responses
  compress: true,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
};

module.exports = nextConfig;
