/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits a self-contained .next/standalone build (server + only the
  // node_modules it actually needs) so the Docker runtime image can be
  // small instead of shipping the full node_modules tree.
  output: "standalone",
};

module.exports = nextConfig;
