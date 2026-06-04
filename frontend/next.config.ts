import type { NextConfig } from 'next'
import path from 'path'

const apiUrl = process.env.API_URL ?? 'http://localhost:8090'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
