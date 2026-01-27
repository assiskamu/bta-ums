/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: "/bta-ums",
  assetPrefix: "/bta-ums/",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
