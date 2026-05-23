import type { NextConfig } from 'next';
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const config: NextConfig = {
  transpilePackages: ['@egoless-do/core'],
  experimental: { turbo: {} },
};

export default withPWA(config);
