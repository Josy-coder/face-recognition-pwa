import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

export default {
  ...pwaConfig,
  reactStrictMode: true,
  images: {
    domains: ['expertum.ai'],
  },
};