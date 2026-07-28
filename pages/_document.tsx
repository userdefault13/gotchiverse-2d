import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link href="https://unpkg.com/nes.css@2.3.0/css/nes.min.css" rel="stylesheet" />
          <link rel="preload" href="/fonts/Pixelar Regular.woff2" as="font" crossOrigin="" />
          <link rel="preload" href="/fonts/Alien-Encounters-Regular.ttf" as="font" crossOrigin="" />
          <link rel="preload" href="/fonts/Alien-Encounters-Solid-Regular.ttf" as="font" crossOrigin="" />
        </Head>
        <body className={process.env.NODE_ENV.startsWith('dev') ? 'debug-screens' : ''}>
          <Main />
          <div id="portal" />
          <div id="portal-tooltip"></div>
          <div id="gv-crt-overlay" aria-hidden="true" />
          <NextScript />
          {process.env.APP_ENV === 'production' && <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js"></script>}
          <noscript>
            <img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" />
          </noscript>
          <script async defer src={'https://www.recaptcha.net/recaptcha/enterprise.js?render=' + process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}></script>
        </body>
      </Html>
    );
  }
}
