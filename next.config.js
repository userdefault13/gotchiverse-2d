// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const moduleExports = {
  // experimental: {
  //   // optimizeFonts: true,
  //   optimizeImages: true,
  // },

  images: {
    disableStaticImages: true,
    dangerouslyAllowSVG: true,
    remotePatterns: [
      'verse-static.aavegotchi.com',
      'verse-ugc.aavegotchi.com',
      'gotchiverse.s3.ap-northeast-1.amazonaws.com',
      'beta-verse-ugc.aavegotchi.com',
      'beta-verse-static.aavegotchi.com',
      'blog.aavegotchi.com',
      'app.aavegotchi.com',
      'api.gotchiverse.io',
      'beta-api.gotchiverse.io',
      'arweave.net',
    ].map((hostname) => ({ protocol: 'https', hostname })),
  },

  env: {
    APP_ENV: process.env.APP_ENV,
    NETWORK: process.env.NETWORK,
    REALM_NETWORK: process.env.REALM_NETWORK,
    ALCHEMICA_NETWORK: process.env.ALCHEMICA_NETWORK,
    SERVER_URL: process.env.SERVER_URL,

    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    ALCHEMICA_API_URL: process.env.ALCHEMICA_API_URL,
    MORALIS_API_KEY: process.env.MORALIS_API_KEY,
    GHOST_API_KEY: process.env.GHOST_API_KEY,
    ALCHEMICA_DEPOSIT: process.env.ALCHEMICA_DEPOSIT,

    // Web3 React connectors
    INFURA_ID: process.env.INFURA_ID,
    VENLY_CLIENT_ID: process.env.VENLY_CLIENT_ID,
    OAUTH_LINK: process.env.OAUTH_LINK,

    // Analytics
    ARCX_API_KEY: process.env.ARCX_API_KEY,

    // Dev only
    USE_LOCALHOST: process.env.USE_LOCALHOST,

    // Hybrid Grid Foundry PoC (also set on Vercel / .env.production)
    NEXT_PUBLIC_ENABLE_FOUNDRY_POC: process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC,
  },
};

module.exports = moduleExports;
