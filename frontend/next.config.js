/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse"],
  transpilePackages: ["@react-pdf/renderer"],
};
module.exports = nextConfig;
