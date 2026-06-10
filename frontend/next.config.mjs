/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost:3000', '192.168.1.173', '192.168.1.173:3000'],
  basePath: '/calrims',
  trailingSlash: true,
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: false,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com; connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com https://api.groq.com; frame-ancestors 'none'; object-src 'none';"
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/calrims/',
        permanent: false,
        basePath: false,
      },
      {
        source: '/auth/:path*',
        destination: '/calrims/auth/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/dashboard/:path*',
        destination: '/calrims/dashboard/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/jobs/:path*',
        destination: '/calrims/jobs/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/interview/:path*',
        destination: '/calrims/interview/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/support/:path*',
        destination: '/calrims/support/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/terms/:path*',
        destination: '/calrims/terms/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/privacy/:path*',
        destination: '/calrims/privacy/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/offer/:path*',
        destination: '/calrims/offer/:path*',
        permanent: false,
        basePath: false,
      },
      {
        source: '/company/:path*',
        destination: '/calrims/company/:path*',
        permanent: false,
        basePath: false,
      },
    ]
  },
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:10000').replace(/\/$/, '');
    return [
      {
        source: '/api/((?!generate-pdf|health).*)',
        destination: `${backendUrl}/api/:1`,
      },
    ]
  }
}
export default nextConfig
