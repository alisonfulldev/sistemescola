/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  generateBuildId: async () => {
    return 'build-' + new Date().getTime().toString()
  },
}

module.exports = nextConfig
