/* eslint-disable @typescript-eslint/indent */
/* eslint-disable multiline-ternary */
import { BucketIcon, Button, ChannelIcon } from 'components/UI/elements';
import { useNotification } from 'contexts/NotificationContext';
import { useRealm } from 'contexts/RealmContext';
import { useUI } from 'contexts/UIContexts';
import { useWeb3 } from 'contexts/Web3Context';
import _ from 'lodash';
import {
  calculateChannellingResults,
  channelAlchemica,
  emptyReservoirs,
  formatTimeLeft,
  getCapacities,
  getClaimableAlchemica,
  getContractParcelLastChannel,
  getContractParcelLastClaimded,
  getHarvestRates,
  getIsSurveying,
  getParcelCurrentRound,
  getRemainingAlchemica,
  getTotalClaimed,
  secondsUntilParcelCanChannel,
  secondsUntilParcelCanClaim,
  surveyParcel,
} from 'helpers/parcels.helper';
import { useEffect, useState } from 'react';
import { getInstallationIdDataById, getInstallationTypeById } from 'shared_code/utils/shared.utils.installations';
import installationTypes from 'shared_code/data/installations.json';
import { ChannelData, InstallationData, InstallationTypeLocal, SurveyParcel, Tokens } from 'types';
import styles from './styles';
import Installations from 'components/phaser/Installations';
import { showNotificationWithTimeout, showTransactionNotification, updateTransactionNotificationStatus } from 'contexts/NotificationContext/actions';
import SFXController from 'components/controllers/SFXController';
import { usePhaser } from 'contexts/PhaserContext';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { LockIcon } from 'assets';
import Image from 'next/image';
import { getErrMessage } from 'helpers/ethers.helper';
import { getThemeColor } from 'helpers/functions';
import { getContract } from 'web3/contract';
import GameController from 'components/controllers/GameController';
import { AlchemicaBalances, AlchemicaStats, InstallationCard, Modal } from 'components/UI/component';
import { useGame } from 'contexts/GameContext';
import GlobalState from 'contexts/GlobalState';
import { FoundryStore } from 'helpers/foundry';
let channelInterval;
let claimInterval;

const totalSurveyRounds = 10; // Hardcoded for now

export const ParcelDashboard = (): JSX.Element => {
  const { click } = useAavegotchiSound();

  const [{ parcelDashboardState, accessRightsState }, uiDispatch] = useUI();
  const [{ ethersSigner, currentNetwork, globalProvider }] = useWeb3();
  const [{ selectedPlayer, ownedParcels }, realmDispatch] = useRealm();
  const [, notificationDispatch] = useNotification();
  const [{ scene }, phaserDispatch] = usePhaser();
  const { oops } = useAavegotchiSound();
  const [{ gameConfig }] = useGame();

  const [channelLoading, setChannelLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [realmId, setRealmId] = useState<number>();
  const [installationId, setInstallationId] = useState<number>();
  const [installationLevel, setInstallationLevel] = useState<number>();

  const [collected, setCollected] = useState<number[]>();
  const [remaining, setRemaining] = useState<number[]>();
  const [totalClaimed, setTotalClaimed] = useState<number[]>();
  const [enoughToClaim, setEnoughToClaim] = useState<boolean>();

  const [isSurveying, setIsSurveying] = useState<boolean>();
  const [hasSurveyed, setHasSurveyed] = useState<boolean>();
  const [surveyRound, setSurveyRound] = useState<number>();
  const [hasReservoirs, setHasReservoirs] = useState<boolean>();

  const [rates, setRates] = useState<number[]>();
  const [capacities, setCapacities] = useState<number[]>();

  const [secondsUntilChannel, setSecondsUntilChannel] = useState<number>();
  const [secondsUntilClaim, setSecondsUntilClaim] = useState<number>();

  const alchemicas: Tokens[] = ['fud', 'fomo', 'alpha', 'kek'];

  useEffect(() => {
    if (parcelDashboardState.open && parcelDashboardState.altarId) void getSetInstallationData(parcelDashboardState.altarId);
    else {
      setInstallationId(undefined);
      setInstallationLevel(undefined);
      setRealmId(undefined);
      setHasSurveyed(undefined);
      setCollected(undefined);
      setRemaining(undefined);
      setTotalClaimed(undefined);
      setEnoughToClaim(undefined);
      setRates(undefined);
      setCapacities(undefined);
      setSurveyRound(undefined);
    }
  }, [parcelDashboardState]);

  const handleClose = () => {
    uiDispatch({
      type: 'UPDATE_PARCEL_DASHBOARD',
      parcelDashboardState: {
        open: false,
        altarId: undefined,
      },
    });
    if (claimInterval) clearInterval(claimInterval);
    if (channelInterval) clearInterval(channelInterval);
  };

  const getSetInstallationData = async (id) => {
    setFetching(true);
    const installationData = getInstallationIdDataById(id) as unknown as InstallationData;
    // console.log('@getSetInstallationData:installationData', installationData);

    // installationData is destructured from installationId(aaltarId). Look for the InstallationData to see all data
    if (installationData?.itemId) {
      setInstallationId(installationData.itemId);

      // get InstallationTyle from local stored json file.
      const type = installationTypes[installationData.itemId] as InstallationTypeLocal;
      // console.log('@getSetInstallationData:type', type);
      if (type) {
        setInstallationLevel(type.level);
      }

      await getSetChannelTime(installationData.realmId, installationData.itemId);
      await getSetClaimTime(installationData.realmId);
      await getSetSurveyRound(installationData.realmId);
    }

    // set realmId (tokenId of the parcel from the contract) & fetch all data needed
    const realmId = installationData.realmId;
    if (realmId) {
      setRealmId(realmId);
      await getAndSetHarvestingData(realmId);
      await getAndSetAlchemicaData(realmId);
    }
    setFetching(false);
  };

  // get Current alchemica data related to reservoir states
  const getAndSetAlchemicaData = async (realmId: number) => {
    const claimable = await getClaimableAlchemica(ethersSigner, currentNetwork, realmId);
    // console.log('claimable', claimable);
    if (claimable) {
      setCollected(claimable);
      const enoughToClaim = _.find(claimable, (amount) => amount > 0);
      setEnoughToClaim(!!enoughToClaim);
      // console.log('enoughToClaim', !!enoughToClaim);
    }

    const remaining = await getRemainingAlchemica(ethersSigner, currentNetwork, realmId);
    // console.log('remaining', remaining);
    if (remaining) setRemaining(remaining);

    const totalClaimed = await getTotalClaimed(ethersSigner, currentNetwork, realmId);
    // console.log('totalClaimed', totalClaimed);
    if (totalClaimed) setTotalClaimed(totalClaimed);

    const surveying = await getIsSurveying(globalProvider, currentNetwork, realmId);
    // console.log('surveying', surveying);
    setIsSurveying(surveying);

    if (totalClaimed && remaining) {
      const hasSurveyed = _.sum(totalClaimed) + _.sum(remaining) !== 0;
      // console.log('hasSurveyed', hasSurveyed);
      setHasSurveyed(hasSurveyed);
    }

    const capacities = await getCapacities(ethersSigner, currentNetwork, realmId);
    if (capacities) setHasReservoirs(_.sum(capacities) !== 0);
  };

  // current reservoirs/hervesters data
  const getAndSetHarvestingData = async (realmId: number) => {
    const rates = await getHarvestRates(ethersSigner, currentNetwork, realmId);
    // console.log('rates', rates);
    if (rates) setRates(rates);

    const capacities = await getCapacities(ethersSigner, currentNetwork, realmId);
    // console.log('capacities', capacities);
    if (capacities) setCapacities(capacities);
  };

  const getSetChannelTime = async (realmId: number, installationId: number) => {
    if (!installationId || !realmId) return;

    const parcelLastChannel = await getContractParcelLastChannel(globalProvider, currentNetwork, realmId);
    // console.log('parcelLastChannel', parcelLastChannel);
    const secondsUntilChannel = secondsUntilParcelCanChannel(parcelLastChannel, installationId.toString());
    // console.log('secondsUntilChannel', secondsUntilChannel);
    setSecondsUntilChannel(secondsUntilChannel);

    // Reset Aaltar Icon
    if (scene && parcelLastChannel) Installations.updateParcelLastChannel(parcelDashboardState.altarId, parcelLastChannel.toString());

    if (channelInterval) clearInterval(channelInterval);
    channelInterval = setInterval(() => {
      const secondsUntilChannel = secondsUntilParcelCanChannel(currentNetwork, parcelLastChannel);
      // console.log('secondsUntilChannel', secondsUntilChannel);
      setSecondsUntilChannel(secondsUntilChannel);
      if (secondsUntilChannel === 0) clearInterval(channelInterval);
    }, 60 * 1000);
  };

  const getSetClaimTime = async (realmId: number) => {
    const parcelLastClaimed = await getContractParcelLastClaimded(globalProvider, currentNetwork, realmId);
    // console.log('parcelLastClaimed', parcelLastClaimed);

    const secondsUntilClaim = secondsUntilParcelCanClaim(currentNetwork, parcelLastClaimed);
    // console.log('secondsUntilClaim', secondsUntilClaim);
    setSecondsUntilClaim(secondsUntilClaim);

    // Create Interval to update each 1min.
    if (claimInterval) clearInterval(claimInterval);
    claimInterval = setInterval(() => {
      const secondsUntilClaim = secondsUntilParcelCanClaim(currentNetwork, parcelLastClaimed);
      // console.log('secondsUntilClaim', secondsUntilClaim);
      setSecondsUntilClaim(secondsUntilClaim);
      if (secondsUntilClaim === 0) clearInterval(claimInterval);
    }, 60 * 1000);
  };

  const getSetSurveyRound = async (realmId: number) => {
    const parcelCurrentRound = await getParcelCurrentRound(globalProvider, currentNetwork, realmId);
    setSurveyRound(Number(parcelCurrentRound));
  };

  // CALLS
  const handleChannel = async () => {
    const channelContract: ChannelData = {
      realmId: realmId,
      gotchiId: Number(selectedPlayer.id),
    };
    setChannelLoading(true);
    const results = calculateChannellingResults({
      altarId: parcelDashboardState.altarId,
      playerId: selectedPlayer.id,
    });

    console.log('Will channel:', results);

    const id = showTransactionNotification(notificationDispatch, {
      message: 'Channeling Alchemica',
    });

    try {
      await Installations.addFlamesToAaltar(parcelDashboardState.altarId, true);
      const tx = await channelAlchemica(ethersSigner, currentNetwork, channelContract);
      // console.log('@handleChannel TX:', tx);
      await Installations.addFlamesToAaltar(parcelDashboardState.altarId, false);

      if (tx?.status) {
        // parcelDashboardState.altarId
        // getInstallationIdDataById(parcelDashboardState.altarId);
        // getInstallationTypeById(parcelDashboardState.altarId);

        GameController.handleToastNotification({
          message: `You channelled ${results.fud.toFixed(3)} FUD, ${results.fomo.toFixed(3)} FOMO, ${results.alpha.toFixed(
            3,
          )} ALPHA and ${results.kek.toFixed(3)} KEK!`,
          autoClose: true,
          type: 'success',
        });

        SFXController.playFX('channeling_end');
        await getSetChannelTime(realmId, installationId);
        updateTransactionNotificationStatus(notificationDispatch, id, 'success');
        realmDispatch({
          type: 'UPDATE_CHANNEL_ID',
          lastChanneledId: Number(selectedPlayer.id),
        });
        // Hybrid Foundry PoC: channel spill raises pollution score
        if ((gameConfig as { enableParcelFoundryPoC?: boolean })?.enableParcelFoundryPoC || process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true') {
          FoundryStore.setFoundryEnabled(true);
          FoundryStore.addPollution(1 + Math.min(5, Math.floor((results.fud + results.fomo) / 10)));
        }
      } else {
        oops();
        updateTransactionNotificationStatus(notificationDispatch, id, 'error', getErrMessage(tx));
      }

      setChannelLoading(false);
    } catch (error) {
      oops();
      // console.log('@handleChannel:ERROR', error?.data?.message || error.message || '');
      updateTransactionNotificationStatus(notificationDispatch, id, 'error', error?.data?.message || error.message || '');
      setChannelLoading(false);
    }
  };

  const handleClaim = async () => {
    const channelContract: ChannelData = {
      realmId: realmId,
      gotchiId: Number(selectedPlayer.id),
    };

    setClaimLoading(true);
    const id = showTransactionNotification(notificationDispatch, {
      message: 'Empty Reservoirs',
    });
    try {
      const tx = await emptyReservoirs(ethersSigner, currentNetwork, channelContract);
      console.log('@handleClaim TX:', tx);

      const tint = collected
        .map((amount, index) => {
          if (amount > 0) return alchemicas[index];
          else return undefined;
        })
        .filter((type) => type);

      if (tx?.status) {
        GameController.handleToastNotification({
          message: `You collected ${collected[0]} FUD, ${collected[1]} FOMO, ${collected[2]} ALPHA and ${collected[3]} KEK!`,
          autoClose: true,
          type: 'success',
        });
        // updateLastChannelIcon
        await getAndSetAlchemicaData(realmId);
        await getSetClaimTime(realmId);
        updateTransactionNotificationStatus(notificationDispatch, id, 'success');
        Installations.handleSpillOverAnim(parcelDashboardState.altarId, tint.length === 1 ? tint[0] : undefined);
        handleClose();
      } else {
        oops();
        updateTransactionNotificationStatus(notificationDispatch, id, 'error', getErrMessage(tx));
      }

      setClaimLoading(false);
    } catch (error) {
      oops();
      console.log('@handleClaim:ERROR', error?.data?.message || error.message);
      updateTransactionNotificationStatus(notificationDispatch, id, 'error', error?.data?.message || error.message);
      setClaimLoading(false);
    }
  };

  const handleSurvey = async () => {
    // Sanity check
    if (!realmId || !installationId) return;
    console.log('@handleSurvey:INIT:', realmId, installationId);

    const surveyParcelData: SurveyParcel = {
      realmId: realmId,
    };
    const id = showTransactionNotification(notificationDispatch, {
      message: 'Survey Parcel',
    });
    let tx;

    try {
      await Installations.addFlamesToAaltar(parcelDashboardState.altarId, true);
      tx = await surveyParcel(ethersSigner, currentNetwork, surveyParcelData);

      console.log('@handleSurvey TX:', tx);
      await Installations.addFlamesToAaltar(parcelDashboardState.altarId, false);

      if (tx?.status) {
        // updateLastChannelIcon
        // SFXController.playFX('channeling_end');
        await getSetInstallationData(parcelDashboardState.altarId);
        updateTransactionNotificationStatus(notificationDispatch, id, 'success');

        const surveyingInterval = async (): Promise<boolean> => {
          const realmDiamond = await getContract(currentNetwork, globalProvider, 'realmDiamond');
          const res: boolean = await realmDiamond.isSurveying(realmId);
          if (!res) {
            showNotificationWithTimeout(notificationDispatch, {
              type: 'success',
              title: 'Surveying is complete!',
              message: `Parcel ${realmId}`,
              options: {
                sound: true,
              },
            });
          }
          return res;
        };
        GameController.addIntervalAction(`survey_${realmId}`, surveyingInterval(), { complete: false, max: 3, delay: 5 });
      } else {
        oops();
        updateTransactionNotificationStatus(
          notificationDispatch,
          id,
          'error',
          tx?.data?.message?.replace('execution reverted: AlchemicaFacet:', '') || undefined,
        );
      }
    } catch (error) {
      oops();
      // console.log('@handleSurvey:ERROR', error);
      updateTransactionNotificationStatus(notificationDispatch, id, 'error', getErrMessage(tx || error));
    }
  };

  const onToggleAccessRights = () => {
    click();
    uiDispatch({
      type: 'UPDATE_ACCESS_RIGHTS_STATE',
      accessRightsState: parcelDashboardState,
    });
    setTimeout(() => {
      handleClose();
    }, 1);
  };

  return (
    <>
      <Modal title={`REALM #${realmId || ''}`} open={realmId && parcelDashboardState.open} onClose={handleClose}>
        <div className="parcel-dashboard-content">
          <div className="toggle-access-rights" onClick={onToggleAccessRights}>
            <div className="access-rights-button">
              <Image alt="" src={LockIcon} layout="fill" />
            </div>
            <div className="access-rights-label">ACCESS RIGHTS</div>
          </div>

          <div className="info-container">
            <div className="installation-container">
              <InstallationCard typeId={installationId} level={installationLevel} size={0.78} color="pink" name="ALCHEMICAL AALTAR" pinLabel />
            </div>
            <div className="reservoirs">
              <AlchemicaBalances hasSurveyed={hasSurveyed} balances={collected} name="COLLECTED" color="pink" />
              <AlchemicaBalances hasSurveyed={hasSurveyed} balances={remaining} name="REMAINING" color="white" />
            </div>
            <div className="stats-container">
              <AlchemicaStats total={totalClaimed} rates={rates} capacities={capacities} />
            </div>
          </div>
          {((gameConfig as { enableParcelFoundryPoC?: boolean })?.enableParcelFoundryPoC ||
            process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true') && (
            <div className="foundry-strip" style={{ marginTop: 12, padding: 8, border: '1px solid #50dce6', fontSize: 12 }}>
              <div style={{ color: '#50dce6', fontWeight: 700 }}>FOUNDRY PoC</div>
              <div>
                Pollution {FoundryStore.getState().pollution} · Tithe {FoundryStore.getState().titheAccrued} · Netherlink{' '}
                {FoundryStore.getState().netherlink.toUpperCase()}
              </div>
              <div style={{ opacity: 0.85 }}>{FoundryStore.getState().walkLedgerHint}</div>
            </div>
          )}
          <div className="button-group">
            <div className="column">
              <Button size={2.8} disabled={channelLoading || !!secondsUntilChannel} secondary onClick={handleChannel} fullWidth>
                Channel Alchemica
              </Button>
              {!channelLoading && (
                <div className="comment">
                  <ChannelIcon size={24} fill={channelLoading || !!secondsUntilChannel ? 'white' : 'var(--col-purple-300)'} />
                  <span className={channelLoading || !!secondsUntilChannel ? 'disabled' : 'channel'}>
                    {secondsUntilChannel ? `${formatTimeLeft(secondsUntilChannel)} REMAINING` : 'READY TO CHANNEL'}
                  </span>
                </div>
              )}
            </div>
            <div className="column">
              <Button
                disabled={claimLoading || !!secondsUntilClaim || isSurveying || !hasSurveyed || !hasReservoirs || !enoughToClaim}
                size={3}
                color={gameConfig.gotchiverseTheme}
                onClick={handleClaim}
                fullWidth
              >
                {claimLoading ? 'Claiming...' : 'Empty Reservoirs'}
              </Button>
              {!claimLoading && (
                <div className="comment">
                  <BucketIcon size={24} fill={secondsUntilClaim || !hasReservoirs || !enoughToClaim ? 'white' : getThemeColor('', 300)} />
                  <span
                    className={`${gameConfig.gotchiverseTheme} ${
                      !!secondsUntilClaim || isSurveying || !hasSurveyed || !hasReservoirs || !enoughToClaim ? 'disabled' : 'reservoir'
                    }`}
                  >
                    {secondsUntilClaim
                      ? `${formatTimeLeft(secondsUntilClaim)} REMAINING`
                      : !hasReservoirs
                      ? "You don't have any reservoirs yet"
                      : !enoughToClaim
                      ? "You don't have enough alchemica to claim"
                      : 'READY TO EMPTY'}
                  </span>
                </div>
              )}
            </div>
            <div className="column">
              <Button
                disabled={isSurveying || fetching || !installationId || surveyRound >= totalSurveyRounds}
                size={3}
                color="info"
                onClick={handleSurvey}
                fullWidth
              >
                {isSurveying ? 'Surveying...' : 'Survey Parcel'}
              </Button>
              {isSurveying && <span className="survey-info">It normally can take up to 2-5 minutes</span>}
              {!isSurveying && surveyRound && (
                <span className="comment info">
                  Surveyed {surveyRound}/{totalSurveyRounds} times
                </span>
              )}
            </div>
          </div>
        </div>
      </Modal>
      <style jsx>{styles}</style>
    </>
  );
};
