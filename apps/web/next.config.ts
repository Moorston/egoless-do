import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@egoless-do/core', 'pocketbase'],
  experimental: { turbo: {} },
  output: 'standalone',
};

// next-pwa uses webpack plugins incompatible with Turbopack;
// only apply in production builds where webpack is used.
const isProd = process.env.NODE_ENV === 'production';
let finalConfig: NextConfig = config;
if (isProd) {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
  });
  finalConfig = withPWA(config);
}

export default finalConfig;
