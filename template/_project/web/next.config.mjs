/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* and /graphql to the togo Go backend during development so the
  // frontend and backend feel like one origin. Override the target via
  // NEXT_PUBLIC_API_ORIGIN (defaults to the local API).
  async rewrites() {
    const origin = process.env.API_ORIGIN ?? "http://localhost:8080";
    return [
      { source: "/api/:path*", destination: `${origin}/api/:path*` },
      { source: "/graphql", destination: `${origin}/graphql` },
      { source: "/events", destination: `${origin}/events` },
    ];
  },
};

export default nextConfig;
