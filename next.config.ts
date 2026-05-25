import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import { runtimeCaching as defaultRuntimeCaching } from '@ducanh2912/next-pwa';

const runtimeCaching = defaultRuntimeCaching.filter(
  entry => entry.options?.cacheName !== 'apis'
);

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    navigateFallback: '/offline',
    runtimeCaching,
  },
});

const nextConfig: NextConfig = {
  typescript: {
    // Ignore build errors during development
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  turbopack: {},
};

export default withPWA(nextConfig);
