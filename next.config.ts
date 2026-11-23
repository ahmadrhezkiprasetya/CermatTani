import path from 'node:path';
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export default function nextConfig(phase: string): NextConfig {
  return {
    // Pisahkan folder build dev (.next-dev) dan produksi (.next) agar `next build`
    // tidak pernah menimpa chunk milik `next dev` yang sedang berjalan.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    outputFileTracingRoot: path.join(__dirname),
    images: {
      unoptimized: true,
    },
    async headers() {
      return [
        {
          source: '/sw.js',
          headers: [
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
            { key: 'Service-Worker-Allowed', value: '/' },
          ],
        },
      ];
    },
  };
}
