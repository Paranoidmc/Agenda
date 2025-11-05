/**
 * Next.js configuration for development CORS and asset proxying.
 * Adjust as needed for your environment.
 */
const nextConfig = {
  async headers() {
    return [
      {
        // Allow CORS for API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, X-CSRF-TOKEN, Accept' },
        ],
      },
      {
        // Allow loading of Google Fonts and other external resources
        source: '/fonts/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
  
  // API proxy configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/sanctum/:path*',
        destination: 'http://localhost:8000/sanctum/:path*',
      },
      {
        source: '/login',
        destination: 'http://localhost:8000/api/login',
      },
      {
        source: '/session-login-controller',
        destination: 'http://localhost:8000/api/session-login-controller',
      },
      {
        source: '/token-login',
        destination: 'http://localhost:8000/api/token-login',
      },
      {
        source: '/logout',
        destination: 'http://localhost:8000/api/logout',
      },
      {
        source: '/user',
        destination: 'http://localhost:8000/api/user',
      },
      // Serve static images from public folder
      {
        source: '/img/:path*',
        destination: '/img/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
