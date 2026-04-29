/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for Cloudflare Pages
  output: 'export',
  // No image optimization for static export
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
