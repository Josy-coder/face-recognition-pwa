import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...pwaConfig,
  reactStrictMode: true,
  images: {
    domains: [],
  },
  env: {
    AWS_REGION: process.env.AWS_REGION,
  },
  // Configure headers to enable PWA features
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
  transpilePackages: [
    "@aws-amplify/ui-react-liveness",
    "@aws-amplify/ui-react"
  ],
};

export default nextConfig;