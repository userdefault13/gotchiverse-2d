// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

const moduleExports = {
  // experimental: {
  //   // optimizeFonts: true,
  //   optimizeImages: true,
  // },

  // Keep Moralis out of the SSR graph; it is browser-initialized via dynamic import.
  serverExternalPackages: ['moralis', '@moralisweb3/common-evm-utils'],

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
    NEXT_PUBLIC_COLYSEUS_URL: process.env.NEXT_PUBLIC_COLYSEUS_URL,
    NEXT_PUBLIC_REALM_URLS: process.env.NEXT_PUBLIC_REALM_URLS,
    NEXT_PUBLIC_REALM_SMOKE_JSON: process.env.NEXT_PUBLIC_REALM_SMOKE_JSON,
    NEXT_PUBLIC_NETCODE: process.env.NEXT_PUBLIC_NETCODE,
    NEXT_PUBLIC_CORE_SUBGRAPH_URL: process.env.NEXT_PUBLIC_CORE_SUBGRAPH_URL,
    NEXT_PUBLIC_GOTCHIVERSE_SUBGRAPH_URL: process.env.NEXT_PUBLIC_GOTCHIVERSE_SUBGRAPH_URL,
    NEXT_PUBLIC_SVG_SUBGRAPH_URL: process.env.NEXT_PUBLIC_SVG_SUBGRAPH_URL,
    NEXT_PUBLIC_BASE_RPC: process.env.NEXT_PUBLIC_BASE_RPC,
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
  },
};

module.exports = moduleExports;
