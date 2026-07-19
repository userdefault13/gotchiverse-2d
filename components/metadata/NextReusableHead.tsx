import React from 'react';
import Head from 'next/head';

interface NextReusableHeadProps {
  title: string;
  description: string;
  siteName: string;
  url: string;
  faviconPath: string;

  // Twitter
  creator?: string;
  image?: string;
}

const NextReusableHead = (props: NextReusableHeadProps): JSX.Element => {
  const { title, description, siteName, url, image, faviconPath, creator } = props;

  // We don't want metadata for testnets
  if (process.env.APP_ENV === 'staging') {
    return (
      <Head>
        <title>{title}</title>
        <link rel="canonical" href={url} />
      </Head>
    );
  } else {
    return (
      <Head>
        <title>{title}</title>
        <meta name="description" content={title} />
        <meta property="og:type" content="website" />
        <meta name="og:title" property="og:title" content={title} />

        {description && <meta name="og:description" property="og:description" content={description} />}

        <meta property="og:site_name" content={siteName} />
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        {description && <meta name="twitter:description" content={description} />}
        <meta name="twitter:site" content={siteName} />

        {creator && <meta name="twitter:creator" content="" />}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="64x64" href={faviconPath} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {image && <meta property="og:image" content={image} />}
        {image && <meta name="twitter:image" content={image} />}

        <link rel="canonical" href={url} />
      </Head>
    );
  }
};
export default NextReusableHead;
