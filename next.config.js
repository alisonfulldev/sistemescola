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
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.vercel.app'],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Previne clickjacking (iframes de outros domínios)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Previne MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controla referrer em navegação
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desativa recursos sensíveis do browser
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // HSTS: força HTTPS por 1 ano
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // XSS Protection legado
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        // APIs nunca devem ser cacheadas pelo browser
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
// Trigger rebuild
