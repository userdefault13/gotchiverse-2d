/* eslint-disable @typescript-eslint/indent */
/* eslint-disable multiline-ternary */
import { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './styles';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { useWeb3 } from 'contexts/Web3Context';
import { CloseIcon } from 'components/UI/elements';
import { GotchiSelectPanel, GotchiDetailsPanel } from 'components/UI/screens/section';
import { ContractParcel, GotchiverseAavegotchi, GotchiverseParcel, JsonParcel, Parcel, RealmEvent } from 'types';
import { fetchAavegotchiURL, setAavegtochiToLocalStorage, getGotchiData, isTrueSpectator, brsToRarity } from 'helpers/gotchi.helper';
import { useRealm } from 'contexts/RealmContext';
import useResizeObserver from 'hooks/useResizeObserver';
import router from 'next/router';
import { toast } from 'react-toastify';
import { collateralByAddress } from 'helpers/ethers.helper';
import {
  fetchContractOwnedParcels,
  getParcelAccessRights,
  getParcelsAccessRightsWhitelistIds,
  mapInGotchiverseParcelData,
  transformParcelFormat,
} from 'helpers/parcels.helper';
import Image from 'next/image';
import GameController from 'components/controllers/GameController';
import _ from 'lodash';
import { GotchiSVG, MaticNeeded } from 'components/UI/widgets';
import { PARCELS_BY_TOKEN_ID } from 'shared_code/models/model.realm';
import { ClosedPortal, GotchiverseLogo, LastPositionNoBgIcon, PortalLightningBg } from 'assets';
import { useGame } from 'contexts/GameContext';
import { SpawnLocation } from 'components/UI/structures/SpawnLocation';
import { SpawnSelector } from 'components/UI/sections';
import useMediaQuery from 'hooks/useMediaQuery';
import { BasePanel, ModalWrapper } from 'components/UI/component';
import { ChannelReadyToggle } from 'components/UI/elements/buttons/channelReadyToggle';
import { EnterButton } from 'components/UI/structures/EnterButton';

interface Props {
  selectedSpawn: string;
  handleSpawnSelect: (id: string) => void;
  onBack: () => void;
  selectedGotchi: GotchiverseAavegotchi;
}

export const GotchiSelectModal = ({ selectedSpawn, selectedGotchi, handleSpawnSelect, onBack }: Props): JSX.Element => {
  const [{ currentAccount, currentNetwork, globalProvider, ethersSigner }] = useWeb3();
  const [{ eventsList }, realmDispatch] = useRealm();
  const [{ gameConfig }] = useGame();

  const { portalOpen, sending } = useAavegotchiSound();

  // TODO: GAME_CONFIG.demoGotchiMode should be pulled from the API before page load and not start with the the default constant version here
  const [storedId, setStoredId] = useState<string>();
  const [enterPortal, setEnterPortal] = useState(false);
  const [parcel, setParcel] = useState<JsonParcel>(null);
  const [event, setEvent] = useState<RealmEvent>();
  const [entering, setEntering] = useState(false);
  const [spawnSelectorOpen, setSpawnSelectorOpen] = useState(false);
  const [isEvent, setIsEvent] = useState(false);

  const selectedGotchiRarity = useMemo(() => {
    if (!selectedGotchi) return 'disabled';
    return brsToRarity(Number(selectedGotchi.baseRarityScore));
  }, [selectedGotchi]);

  useEffect(() => {
    if (selectedGotchi) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [selectedGotchi]);

  const isDesktop = useMediaQuery('(min-width: 1200px), (min-height: 750px)');
  const selectedGotchiHeight = useMemo(
    () =>
      selectedGotchi
        ? isDesktop
          ? isTrueSpectator(selectedGotchi.isSpectator)
            ? 30
            : 42
          : isTrueSpectator(selectedGotchi.isSpectator)
          ? 30
          : 36
        : 0,
    [isDesktop, selectedGotchi],
  );

  const checkIsEvent = (spawnId: string): boolean => {
    return spawnId && spawnId[0] !== 'C' && spawnId !== 'aarena';
  };

  useEffect(() => {
    if (!selectedSpawn) return;
    const _isEvent = checkIsEvent(selectedSpawn);
    setIsEvent(_isEvent);
    if (!_isEvent) {
      void fetchParcelData();
    } else {
      setEvent(eventsList.find((event) => event.id === selectedSpawn));
    }
  }, [selectedSpawn, eventsList]);

  // useEffect(() => {
  //   setSpawnLocation(selectedSpawn);
  // }, [selectedSpawn]);

  const fetchParcelData = async () => {
    const parcelData: JsonParcel = _.find(PARCELS_BY_TOKEN_ID, (val: JsonParcel) => val.parcelId === selectedSpawn);
    setParcel(parcelData);
  };

  const getAndSignNonce = async function (signer, address, gotchiId?: string) {
    const nonceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/nonce/get?address=${address}`);
    if (nonceResponse.status !== 200) {
      toast.error('Error initiating wallet address validation', { theme: 'dark' });
      throw new Error(`An error occurred when fetching the nonce: ${nonceResponse.statusText}`);
    }
    const nonceData = await nonceResponse.json();
    const nonce = nonceData.nonce || nonceData.data?.nonce;
    const signed = await signer.signMessage(nonce);

    const gotchiQuery = gotchiId ? `&gotchiId=${gotchiId}` : '';
    const tokenResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/user/authtoken/get?address=${address}&signature=${signed}${gotchiQuery}`,
    );
    if (tokenResponse.status !== 200) {
      toast.error('The signature of the message is invalid', { theme: 'dark' });
      throw new Error(`An error occurred when validating the signed nonce: ${tokenResponse.statusText}`);
    }
    const tokenData = await tokenResponse.json();
    console.log('tokenData', tokenData);
    const token = tokenData.token || tokenData.authToken || tokenData.data?.token || tokenData.data?.authToken;
    localStorage.setItem('authToken', token);
  };

  const handleGotchiSelect = (gotchi: GotchiverseAavegotchi) => {
    if (gotchi) {
      void router.push(
        {
          pathname: '/',
          query: { ...router.query, gotchi: gotchi.id },
        },
        undefined,
        { scroll: false },
      );
    }
  };

  const handleGameStart = async (isLast?: boolean) => {
    if (entering) return;
    if (selectedGotchi) {
      setEntering(true);
      if (selectedSpawn) {
        if (selectedSpawn === 'aarena') GameController.updateMapType('aarena');
        else {
          let spawnLocId;
          if (isEvent) {
            const evt = eventsList.find((event) => event.id === selectedSpawn);
            if (!evt) {
              console.log('EVENT NOT FOUND FOR ID:', selectedSpawn);
            } else {
              spawnLocId = evt.parcelId;
            }
          } else {
            spawnLocId = selectedSpawn;
          }
          GameController.updateSpawnId(!isLast ? spawnLocId : undefined);
          GameController.updateMapType('citaadel');
        }
      }
      try {
        if (gameConfig.requireMetaMaskSign) {
          sending();
          await getAndSignNonce(ethersSigner, currentAccount, selectedGotchi?.id);
        }
        await setGlobalSelectedPlayer(selectedGotchi);
        void enterRealm();
      } catch (e) {
        setEntering(false);
        console.error('@handleGameStart', e);
      }
    }
  };

  const setGlobalSelectedPlayer = async (gotchi) => {
    const playerObject = getGotchiData(gotchi, currentNetwork, currentAccount, gameConfig.demoGotchiMode);
    const urls = await fetchAavegotchiURL(playerObject);
    const backgroundColor = collateralByAddress(currentNetwork, gotchi.collateral).secondaryColor;
    const isAavegotchiLent = gotchi.isLent;
    let lenderParcels: ContractParcel[] = [];
    let ownedParcels = await fetchContractOwnedParcels(currentAccount, globalProvider, currentNetwork);
    _.map(ownedParcels, (parcel) => _.assign(parcel, { owner: currentAccount }));

    if (isAavegotchiLent && currentNetwork === 'matic') {
      lenderParcels = await fetchContractOwnedParcels(gotchi.originalOwner.id, globalProvider, currentNetwork);
      playerObject.originalOwner = gotchi.originalOwner.id;
      // Get permissions for parcels of lended gotchi
      const parcelIds = _.map(lenderParcels, (parcel) => parcel.tokenId);
      // since we are currently limiting the number of parcels fetched here and we want to guarantee we load rights
      // for the selected parcel, verify the selected spawn point was a parcel
      if (selectedSpawn?.charAt(0) === 'C') {
        // convert selected parcel ID into it's tokenId equivalent
        const parcelData: JsonParcel = _.find(PARCELS_BY_TOKEN_ID, (val: JsonParcel) => val.parcelId === selectedSpawn);
        if (parcelData && !parcelIds.includes(parcelData.parcelId)) {
          // and if it wasn't already in the list to look up access rights, add it
          parcelIds.push(parcelData.tokenId);
          // add it to lenderParcels as required below as well, convert to ContractParcel type
          const contractParcel: ContractParcel = _.assign({}, _.pick(parcelData, ['tokenId', 'parcelHash', 'parcelId']), {
            id: parcelData.tokenId,
            district: String(parcelData.district),
          });
          lenderParcels.push(contractParcel);
        }
      }
      const accessRights = await getParcelAccessRights(parcelIds, currentNetwork, globalProvider);
      console.log('accessRights', accessRights);
      const accessWhitelists = await getParcelsAccessRightsWhitelistIds(parcelIds, currentNetwork, globalProvider, true);
      console.log('accessWhitelists', accessWhitelists);
      _.map(lenderParcels, (parcel, i) =>
        _.assign(parcel, { owner: gotchi.originalOwner.id, accessRights: accessRights[i], accessWhitelists: accessWhitelists?.[i] }),
      );
      ownedParcels = _.concat(ownedParcels, lenderParcels);
      console.log('ownedParcels', ownedParcels);
    }

    const gotchiverseParcels: GotchiverseParcel[] = await mapInGotchiverseParcelData(ownedParcels);
    const transformedParcels: Parcel[] = transformParcelFormat(gotchiverseParcels);
    setAavegtochiToLocalStorage(playerObject, backgroundColor, isAavegotchiLent, transformedParcels);
    console.log('gotchiverseParcels', gotchiverseParcels);
    realmDispatch({
      type: 'UPDATE_SELECTED_PLAYER',
      selectedPlayer: playerObject,
      gotchiUrl: urls,
      backgroundColor,
      isAavegotchiLent,
      escrow: gotchi.escrow,
      ownedParcels: transformedParcels,
    });
  };

  const enterRealm = async () => {
    setEnterPortal(true);
    portalOpen();
    setTimeout(() => {
      void router.push(GameController.getGameRoute());
    }, 2500);
  };

  const [placeholderCount, setPlaceholderCount] = useState<number>(12);
  const onResize = useCallback((target: HTMLDivElement) => {
    // Handle the resize event to update the count of placeholder items
    const { width, height } = target.getBoundingClientRect();
    let totalCount = 0;
    const maxBounds = {
      width: 1125,
      height: 800,
    };
    const minBounds = {
      width: 375,
      height: 600,
    };
    if (width < minBounds.width || height < minBounds.height) {
      totalCount = 7;
    } else if (width > maxBounds.width || height > maxBounds.height) {
      totalCount = 13;
    } else {
      totalCount = 13;
    }
    setPlaceholderCount(Math.max(totalCount - 1, 0));
  }, []);
  const containerRef = useResizeObserver(onResize);

  return (
    <>
      <ModalWrapper
        open={!!selectedGotchi}
        onClose={() => {
          !entering && onBack();
        }}
      >
        <div className="gotchi-select-modal not-clickable" onClick={(e) => e.stopPropagation()}>
          <div className="bg-container">
            <span className="bg-img">
              <Image alt="" src={PortalLightningBg} layout="fill" objectFit="cover" />
            </span>
            <MaticNeeded />
            <div className="close-button-container clickable" onClick={onBack}>
              <CloseIcon fill="var(--col-white)" size="3.5rem" big />
            </div>
            <div className="mobile-view">
              <Image alt="" src={GotchiverseLogo} className="mobile-logo" />
              <BasePanel
                title="Not Supported"
                inherit={{
                  width: true,
                  height: true,
                }}
                content={{
                  padding: 16,
                }}
              >
                <br />
                <p>The Gotchiverse is currently not supported on Mobile.</p>
                <p>Stay tuned to be alerted when Gotchiverse mobile is available</p>
              </BasePanel>
            </div>
            <div className="desktop-view" ref={containerRef}>
              <GotchiSelectPanel
                placeholderCount={placeholderCount}
                handleSelect={(gotchi) => {
                  if (entering) return;
                  handleGotchiSelect(gotchi);
                }}
                selectedId={selectedGotchi?.id}
                storedId={storedId}
              />

              {/* <div className="back_menu">
                  <Button onClick={() => onBack()} fullWidth>
                    {'< BACK TO MENU'}
                  </Button>
                </div> */}

              {!gameConfig.isLive || !currentNetwork || !globalProvider ? (
                <div className="portal closed">
                  <Image alt="" src={ClosedPortal} objectFit="contain" layout="fill" />
                </div>
              ) : null}

              {selectedGotchi && currentNetwork && globalProvider && (
                <div
                  className={`selected-gotchi-container ${gameConfig.isLive ? 'clickable' : ''} ${enterPortal ? 'enter-anim' : ''} ${
                    selectedGotchi.isSpectator ? 'spectator' : ''
                  }`}
                  onClick={async () => await handleGameStart()}
                >
                  <div className="gotchi">
                    <GotchiSVG
                      tokenId={selectedGotchi.id}
                      side={enterPortal ? 3 : 0}
                      options={{ removeBg: true, animate: true }}
                      height={selectedGotchiHeight}
                      isSpectator={selectedGotchi.isSpectator}
                    />
                  </div>
                  <div className="glow"></div>
                  <div className="gotchi-name-container">
                    <div className="gotchi-name">
                      {selectedGotchi.isSpectator || !selectedGotchi.readyToChannel ? null : (
                        <ChannelReadyToggle
                          size="4rem"
                          active={selectedGotchi.readyToChannel}
                          backgroundColor={`var(--col-${selectedGotchiRarity}-card-label-bg)`}
                        />
                      )}
                      <h4>{selectedGotchi.isSpectator ? 'Freebie' : selectedGotchi.name}</h4>
                    </div>
                    <p className="gotchi-caption">{selectedGotchi.isSpectator ? "Hi Fren! I'm always here for you!" : null}</p>
                  </div>
                </div>
              )}

              <div className="gotchi-details">
                {selectedGotchi && currentNetwork && globalProvider && (
                  <>
                    <GotchiDetailsPanel gotchi={selectedGotchi} />

                    {(isEvent && event) || (!isEvent && parcel) ? (
                      <div className="spawn-location-container">
                        <SpawnLocation
                          gotchi={selectedGotchi}
                          type={isEvent ? 'event' : 'parcel'}
                          parcel={parcel}
                          event={event}
                          onClickChange={() => setSpawnSelectorOpen(true)}
                          onClickEnter={async () => await handleGameStart()}
                        />
                        <button type="button" className="cta-last-position" onClick={async () => await handleGameStart(true)}>
                          <div className="location-icon">
                            <Image alt="" src={LastPositionNoBgIcon} width={20} height={20} />
                          </div>
                          <span>Use Last position</span>
                        </button>

                        {spawnSelectorOpen && (
                          <SpawnSelector
                            onClose={() => setSpawnSelectorOpen(false)}
                            handleSelect={(id) => {
                              handleSpawnSelect(id);
                              setSpawnSelectorOpen(false);
                            }}
                            type={isEvent ? 'EVENTS' : 'PARCELS'}
                            selectedSpawn={selectedSpawn}
                            selectedGotchi={selectedGotchi}
                          />
                        )}
                      </div>
                    ) : (
                      <EnterButton label="Enter Aarena >" onClick={async () => await handleGameStart()} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalWrapper>
      <style jsx>{styles}</style>
    </>
  );
};
