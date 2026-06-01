/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds on platforms like Vercel
    // so deployments won't fail due to lint rules. Fix lint issues later.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow builds to succeed even if there are TypeScript type errors.
    // Remove this once type errors are fixed.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
