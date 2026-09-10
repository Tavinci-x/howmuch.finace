/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  webpack(config) {
    config.module.rules.push({ resourceQuery: /raw/, type: 'asset/source' });
    return config;
  },
};

export default nextConfig;
