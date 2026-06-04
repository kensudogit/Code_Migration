import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // /api/v1/* is handled by src/app/api/v1/[...path]/route.ts (long timeout for /convert)
}

export default nextConfig
