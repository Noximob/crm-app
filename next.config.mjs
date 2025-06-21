/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Removido para suportar páginas dinâmicas
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
