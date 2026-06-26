import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

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

export default withSentryConfig(finalConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnel: '/api/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
