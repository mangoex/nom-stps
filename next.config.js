const fs = require('fs');
const path = require('path');

const workerOrigen = path.join(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const workerDestino = path.join(__dirname, 'public/pdf.worker.min.mjs');
if (fs.existsSync(workerOrigen)) {
  fs.copyFileSync(workerOrigen, workerDestino);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['pdfjs-dist'],
  experimental: {
    serverComponentsExternalPackages: ['unpdf'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
