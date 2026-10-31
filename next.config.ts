import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/directors/:id",
        destination: "/phu-trach/:id",
        permanent: true,
      },
      {
        source: "/coming-soon",
        destination: "/sap-ra-mat",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
