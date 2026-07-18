import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading the dev server from LAN hosts (e.g. a phone on the same
  // network) without Next blocking cross-origin HMR / font requests.
  allowedDevOrigins: ["192.168.5.154"],
};

export default nextConfig;
