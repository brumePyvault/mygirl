/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the existing Vercel project's configured output directory valid.
  // Next.js otherwise writes its production build to `.next`.
  distDir: 'dist',
}

export default nextConfig
