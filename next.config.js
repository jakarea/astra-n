// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Vercel won’t block deployments because of ESLint -
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
