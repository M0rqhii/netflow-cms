/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/sdk', '@repo/schemas'],
  output: 'standalone', // Required for Docker deployment
}

module.exports = nextConfig

