import React, { useEffect } from 'react';
import App from 'next/app';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globalStyles.css';
import '../styles/palettes.scss';
import '../styles/crtScanlines.css';
import GlobalContextProvider from 'contexts';

import { useGeneral } from 'contexts/GeneralContext';
import { GeneralActions } from 'contexts/GeneralContext/reducer';
import { State as GeneralStateInterface } from 'contexts/GeneralContext/store';
import NextReusableHead from 'components/metadata/NextReusableHead';
import { UserDetails } from 'components/utility/UserDetails';
import { ToastContainer, Slide } from 'react-toastify';
import { useSettings } from 'contexts/SettingsContext';
import { fetchLocalSettings } from 'contexts/SettingsContext/actions';
// import * as Sentry from '@sentry/react';
import { ParallaxProvider } from 'react-scroll-parallax';
import GlobalStateController from 'components/UI/GlobalStateController';
// import Script from 'next/script';
// import GameController from 'components/controllers/GameController';

const Initializer = () => {
  const [, dispatch] = useGeneral();
  const [, settingsDispatch] = useSettings();

  useEffect(() => {
    const initProps: Partial<GeneralStateInterface> = {};
    const vol = localStorage.getItem('volume');
    const lng = localStorage.getItem('language');
    if (vol) {
      initProps.volume = parseFloat(vol);
    }

    if (lng) {
      initProps.language = lng;
    }
    dispatch({
      type: GeneralActions.INITIALIZE,
      props: initProps,
    });

    fetchLocalSettings(settingsDispatch);
    /*
    GameController.handleToastNotification({
      message: 'An error with the Core Matic subgraph is currently causing some disruption to Baazaar and Gotchi Lending. Gotchiverse is still running smoothly outside of the parcel whitelist feature. The team is working to resolve the other issues ASAP!',
      autoClose: false,
      type: 'error',
    });
    */
  }, []);

  return null;
};

class MyApp extends App {
  render(): JSX.Element {
    const { Component, pageProps } = this.props;

    return (
      <ParallaxProvider>
        <GlobalContextProvider>
          <Initializer />

          <NextReusableHead
            title="Enter the Gotchiverse"
            description="A play-and-earn metaverse for Aavegotchis"
            siteName="Aavegotchi Gotchiverse"
            faviconPath="/favicon.png"
            url="https://gotchiverse-2d.vercel.app"
            image="https://gotchiverse-2d.vercel.app/apple-touch-icon.png"
          />

          <ToastContainer
            position="bottom-center"
            autoClose={3000}
            newestOnTop={true}
            closeOnClick
            draggable
            pauseOnHover
            hideProgressBar={true}
            limit={3}
            transition={Slide}
            closeButton={false}
            pauseOnFocusLoss={false}
          />
          <GlobalStateController />
          <UserDetails />
          <Component {...pageProps} />
        </GlobalContextProvider>
      </ParallaxProvider>
    );
  }
}

export default MyApp;
