/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better error detection
    reactStrictMode: true,

    // Suppress preload warnings in production
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },

    // Security headers (base setup)
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                ],
            },
        ]
    },

    // Optimize images (Next.js 16: use remotePatterns; add hostnames when you use next/image with external URLs)
    images: {
        remotePatterns: [],
    },

    // Transpile packages that might have issues with Next.js
    transpilePackages: ['react-quill-new'],

    turbopack: {
        // Empty config to silence the warning
    },

    // Suppress browser warnings
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
            }
        }
        return config
    },
}

module.exports = nextConfig
