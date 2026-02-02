/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Konfigurasi untuk optimasi gambar.
   * `unoptimized: true` menonaktifkan optimasi gambar otomatis Next.js.
   */
  images: {
    unoptimized: true,
  },

  /**
   * Konfigurasi untuk deployment ke hosting pribadi.
   * Output standalone membuat bundle yang bisa di-deploy tanpa node_modules.
   */
  output: 'standalone',

  /**
   * Konfigurasi untuk server-side packages.
   * mysql2 dan bcryptjs perlu di-bundle sebagai external packages.
   */
  serverExternalPackages: ['mysql2', 'bcryptjs'],

  /**
   * Environment variables yang aman untuk client-side.
   */
  env: {
    NEXT_PUBLIC_APP_NAME: 'Sistem Presensi PT Lestari Bumi Persada',
  },

  /**
   * Security headers untuk production.
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
}

export default nextConfig
