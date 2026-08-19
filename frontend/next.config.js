/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // small Docker image
  transpilePackages: ['@learnova/shared'],
};
module.exports = nextConfig;
