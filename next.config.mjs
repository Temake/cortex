/** @type {import('next').NextConfig} */
const nextConfig = {
  // The DTP SDK is ESM-only and pulls no native deps; nothing special needed,
  // but keep it out of the client bundle by never importing it from a client component.
  serverExternalPackages: ["@ontomorph/dtp-sdk"],
};

export default nextConfig;
