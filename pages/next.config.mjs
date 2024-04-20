import {setupDevPlatform} from '@cloudflare/next-on-pages/next-dev';
import path from 'path';
import runtimeCaching from './cache.js';
import withPWAInit from '@ducanh2912/next-pwa';


// Here we use the @cloudflare/next-on-pages next-dev module to allow us to use bindings during local development
// (when running the application with `next dev`), for more information see:
// https://github.com/cloudflare/next-on-pages/blob/5712c57ea7/internal-packages/next-dev/README.md
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}


// https://github.com/shadowwalker/next-pwa
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // disable: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching
  }
});


/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  // https://nextjs.org/docs/pages/building-your-application/routing/internationalization
  // i18n: {
  //   locales: ['en'],
  //   defaultLocale: 'en'
  // },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // experimental: {
  //   esmExternals: "loose",
  // },
  // sassOptions: {
  //   fiber: false,
  //   includePaths: [path.join(__dirname, "styles")],
  // },
  // swcMinify: true,
  async rewrites() {
    return [{
      source: "/api/sso/:path*",
      destination: "https://sso.hocgin.com/api/:path*",
    }];
  },
});

export default nextConfig;
