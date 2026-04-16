// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['project-relay-backends-for-main.onrender.com'], // if you load images from backend
  },
};

module.exports = nextConfig;