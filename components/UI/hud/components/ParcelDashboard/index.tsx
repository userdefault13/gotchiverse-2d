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
  getContractGotchiLastChannel,
  getContractParcelLastChannel,
  getContractParcelLastClaimded,
  getHarvestRates,
  getIsSurveying,
  getParcelCurrentRound,
  getRemainingAlchemica,
  getTotalClaimed,
  secondsUntilGotchiCanChannel,
  secondsUntilParcelCanChannel,
  secondsUntilParcelCanClaim,
  surveyParcel,
} from 'helpers/parcels.helper';
import {
  channelAlchemicaLocally,
  getSoftGotchiLastChanneled,
  getSoftParcelLastChanneled,
  isCParcelInInventory,
  isSoftLaunchChannel,
  resolveOnChainGotchiId,
  resolveOnChainParcelId,
} from 'helpers/softChannel.helper';
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
import { useUser } from 'contexts/UserContext';
import { getUserAlchemicaBalances } from 'helpers/gotchi.helper';
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
  const [{ alchemicaBalance, userAavegotchis, ownedParcels: userOwnedParcels, parcelInventory }, userDispatch] = useUser();
  const [, notificationDispatch] = useNotification();
  const [{ scene }, phaserDispatch] = usePhaser();
  const { oops } = useAavegotchiSound();
  const [{ gameConfig }] = useGame();

  const foundryEnabled =
    Boolean((gameConfig as { enableParcelFoundryPoC?: boolean })?.enableParcelFoundryPoC) ||
    process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true';
  const [foundryState, setFoundryState] = useState(() => FoundryStore.getState());

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

  const [secondsUntilParcelChannel, setSecondsUntilParcelChannel] = useState<number>();
  const [secondsUntilGotchiChannel, setSecondsUntilGotchiChannel] = useState<number>();
  const [gotchiLastChanneledStr, setGotchiLastChanneledStr] = useState<string>('0');
  const [secondsUntilClaim, setSecondsUntilClaim] = useState<number>();

  /** Parcel altar cooldown OR gotchi daily UTC lock — UI previously only checked parcel. */
  const secondsUntilChannel = Math.max(secondsUntilParcelChannel || 0, secondsUntilGotchiChannel || 0);
  const channelBlockedByGotchi = (secondsUntilGotchiChannel || 0) > (secondsUntilParcelChannel || 0);

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
      setSecondsUntilParcelChannel(undefined);
      setSecondsUntilGotchiChannel(undefined);
      setGotchiLastChanneledStr('0');
    }
  }, [parcelDashboardState]);

  useEffect(() => {
    if (!parcelDashboardState.open || selectedPlayer?.id == null) return;
    const onChainId = resolveOnChainGotchiId(selectedPlayer);
    const soft = isSoftLaunchChannel(realmId);
    // Soft path uses cartridge id; on-chain path uses bound L1 id when wallet owns it.
    const gotchiKey = soft || onChainId == null ? selectedPlayer.id : onChainId;
    if (!soft && (onChainId == null || !globalProvider || !currentNetwork)) return;
    void getSetGotchiChannelTime(gotchiKey);
  }, [
    parcelDashboardState.open,
    globalProvider,
    currentNetwork,
    selectedPlayer?.id,
    selectedPlayer?.cartridgeSourceTokenId,
    selectedPlayer?.isCartridgeHero,
    userAavegotchis,
    userOwnedParcels,
    ownedParcels,
    parcelInventory,
    realmId,
  ]);

  // Tick gotchi UTC countdown while dashboard is open
  useEffect(() => {
    if (!parcelDashboardState.open) return;
    const id = setInterval(() => {
      setSecondsUntilGotchiChannel(secondsUntilGotchiCanChannel(gotchiLastChanneledStr) || 0);
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [parcelDashboardState.open, gotchiLastChanneledStr]);

  useEffect(() => {
    if (!foundryEnabled) return;
    setFoundryState(FoundryStore.getState());
    return FoundryStore.subscribe(setFoundryState);
  }, [foundryEnabled]);

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
    const reader = globalProvider || ethersSigner;
    if (!reader || !currentNetwork) return;

    const claimable = await getClaimableAlchemica(reader, currentNetwork, realmId);
    // console.log('claimable', claimable);
    if (claimable) {
      setCollected(claimable);
      const enoughToClaim = _.find(claimable, (amount) => amount > 0);
      setEnoughToClaim(!!enoughToClaim);
      // console.log('enoughToClaim', !!enoughToClaim);
    }

    const remaining = await getRemainingAlchemica(reader, currentNetwork, realmId);
    // console.log('remaining', remaining);
    if (remaining) setRemaining(remaining);

    const totalClaimed = await getTotalClaimed(reader, currentNetwork, realmId);
    // console.log('totalClaimed', totalClaimed);
    if (totalClaimed) setTotalClaimed(totalClaimed);

    if (globalProvider) {
      const surveying = await getIsSurveying(globalProvider, currentNetwork, realmId);
      // console.log('surveying', surveying);
      setIsSurveying(surveying);
    }

    if (totalClaimed && remaining) {
      const hasSurveyed = _.sum(totalClaimed) + _.sum(remaining) !== 0;
      // console.log('hasSurveyed', hasSurveyed);
      setHasSurveyed(hasSurveyed);
    }

    const capacities = await getCapacities(reader, currentNetwork, realmId);
    if (capacities) setHasReservoirs(_.sum(capacities) !== 0);
  };

  // current reservoirs/harvesters data
  const getAndSetHarvestingData = async (realmId: number) => {
    const reader = globalProvider || ethersSigner;
    if (!reader || !currentNetwork) return;

    const rates = await getHarvestRates(reader, currentNetwork, realmId);
    // console.log('rates', rates);
    if (rates) setRates(rates);

    const capacities = await getCapacities(reader, currentNetwork, realmId);
    // console.log('capacities', capacities);
    if (capacities) setCapacities(capacities);
  };

  const getSetChannelTime = async (realmId: number, installationId: number) => {
    if (!installationId || !realmId) return;

    const soft = isSoftLaunchChannel(realmId);
    const parcelLastChannel = soft
      ? getSoftParcelLastChanneled(realmId)
      : await getContractParcelLastChannel(globalProvider, currentNetwork, realmId);
    const lastChanneledStr = parcelLastChannel != null ? parcelLastChannel.toString() : '0';
    const parcelSeconds = secondsUntilParcelCanChannel(lastChanneledStr, installationId.toString()) || 0;
    setSecondsUntilParcelChannel(parcelSeconds);

    // Reset Aaltar Icon (including never-channeled `0`)
    if (scene && parcelDashboardState.altarId) {
      Installations.updateParcelLastChannel(parcelDashboardState.altarId, lastChanneledStr);
    }

    if (channelInterval) clearInterval(channelInterval);
    channelInterval = setInterval(() => {
      const nextParcel = secondsUntilParcelCanChannel(lastChanneledStr, installationId.toString()) || 0;
      setSecondsUntilParcelChannel(nextParcel);
      if (nextParcel === 0) clearInterval(channelInterval);
    }, 60 * 1000);
  };

  const getSetGotchiChannelTime = async (gotchiId: string | number) => {
    if (gotchiId == null || gotchiId === '') return;
    const soft = isSoftLaunchChannel(realmId);
    if (soft) {
      const gotchiLast = getSoftGotchiLastChanneled(gotchiId);
      setGotchiLastChanneledStr(gotchiLast);
      setSecondsUntilGotchiChannel(secondsUntilGotchiCanChannel(gotchiLast) || 0);
      return;
    }
    if (!globalProvider || !currentNetwork) return;
    const gotchiLast = await getContractGotchiLastChannel(globalProvider, currentNetwork, gotchiId);
    setGotchiLastChanneledStr(gotchiLast);
    setSecondsUntilGotchiChannel(secondsUntilGotchiCanChannel(gotchiLast) || 0);
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
    const soft = isSoftLaunchChannel(realmId);
    const onChainGotchiId = resolveOnChainGotchiId(selectedPlayer);
    const onChainParcelId = resolveOnChainParcelId(realmId);

    if (!soft) {
      if (!ethersSigner || !currentNetwork) {
        oops();
        showNotificationWithTimeout(notificationDispatch, {
          type: 'error',
          message: 'Wallet not connected. Connect on Base and try again.',
          options: { sound: true },
        });
        return;
      }
      if (currentNetwork !== 'base' && currentNetwork !== 'mumbai' && currentNetwork !== 'matic') {
        oops();
        showNotificationWithTimeout(notificationDispatch, {
          type: 'error',
          message: `Wrong network (${currentNetwork}). Switch to Base and try again.`,
          options: { sound: true },
        });
        return;
      }
      if (onChainGotchiId == null) {
        oops();
        showNotificationWithTimeout(notificationDispatch, {
          type: 'error',
          message: selectedPlayer?.isCartridgeHero
            ? 'Bind a matching L1 Aavegotchi in this wallet to channel on-chain as your cAavegotchi.'
            : 'No Aavegotchi selected for on-chain channeling.',
          options: { sound: true },
        });
        return;
      }
      if (onChainParcelId == null) {
        oops();
        showNotificationWithTimeout(notificationDispatch, {
          type: 'error',
          message: isCParcelInInventory(realmId)
            ? 'This cParcel is not owned by your wallet as an L1 REALM parcel. Own the matching parcel to channel on-chain.'
            : 'Parcel id missing for on-chain channeling.',
          options: { sound: true },
        });
        return;
      }
    }

    if (selectedPlayer?.id == null || selectedPlayer?.id === '') {
      oops();
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        message: 'No Aavegotchi selected.',
        options: { sound: true },
      });
      return;
    }
    if (realmId == null) {
      oops();
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        message: 'Parcel id missing. Close and reopen the Aaltar dashboard.',
        options: { sound: true },
      });
      return;
    }

    setChannelLoading(true);
    let results;
    try {
      results = calculateChannellingResults({
        altarId: parcelDashboardState.altarId,
        playerId: selectedPlayer.id,
      });
      console.log('Will channel:', results);
    } catch (previewErr: any) {
      oops();
      setChannelLoading(false);
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        message: previewErr?.message || 'Channel preview failed',
        options: { sound: true },
      });
      return;
    }

    const id = showTransactionNotification(notificationDispatch, {
      message: soft ? 'Channeling Alchemica (soft-launch)' : 'Channeling Alchemica',
    });

    try {
      await Installations.addFlamesToAaltar(parcelDashboardState.altarId, true);

      if (soft) {
        // Seed session balance from chain when missing (Crafting may never have loaded it).
        let seededBalance = alchemicaBalance || GlobalState.USER?.state?.alchemicaBalance;
        const account = GlobalState.WEB3?.state?.currentAccount;
        if (!seededBalance && account && currentNetwork && (globalProvider || ethersSigner)) {
          try {
            const provider = globalProvider || ethersSigner.provider;
            const results = await getUserAlchemicaBalances(account, currentNetwork, provider);
            if (results) {
              seededBalance = { fud: results[0], fomo: results[1], alpha: results[2], kek: results[3] };
              userDispatch({ type: 'UPDATE_ALCHEMICA_BALANCE', alchemicaBalance: seededBalance });
            }
          } catch (e) {
            console.warn('@handleChannel soft balance fetch', e);
          }
        }
        seededBalance = seededBalance || { fud: 0, fomo: 0, alpha: 0, kek: 0 };
        const softTx = channelAlchemicaLocally({
          altarId: parcelDashboardState.altarId,
          realmId,
          playerId: selectedPlayer.id,
          alchemicaBalance: seededBalance,
        });
        if (softTx?.status) {
          userDispatch({ type: 'UPDATE_ALCHEMICA_BALANCE', alchemicaBalance: softTx.nextBalance });
          GameController.handleToastNotification({
            message: `Channeled (soft-launch): ${results.fud.toFixed(3)} FUD, ${results.fomo.toFixed(3)} FOMO, ${results.alpha.toFixed(
              3,
            )} ALPHA and ${results.kek.toFixed(3)} KEK!`,
            autoClose: true,
            type: 'success',
          });
          SFXController.playFX('channeling_end');
          await getSetChannelTime(realmId, installationId);
          if (selectedPlayer?.id != null) await getSetGotchiChannelTime(selectedPlayer.id);
          updateTransactionNotificationStatus(notificationDispatch, id, 'success');
          const channeledNum = Number(selectedPlayer.id);
          if (Number.isFinite(channeledNum)) {
            realmDispatch({
              type: 'UPDATE_CHANNEL_ID',
              lastChanneledId: channeledNum,
            });
          }
          if ((gameConfig as { enableParcelFoundryPoC?: boolean })?.enableParcelFoundryPoC || process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true') {
            FoundryStore.setFoundryEnabled(true);
            FoundryStore.addPollution(1 + Math.min(5, Math.floor((results.fud + results.fomo) / 10)));
          }
        } else {
          oops();
          updateTransactionNotificationStatus(notificationDispatch, id, 'error', 'Soft-launch channel failed');
        }
        return;
      }

      const channelContract: ChannelData = {
        realmId: onChainParcelId,
        gotchiId: onChainGotchiId,
      };
      const tx = await channelAlchemica(ethersSigner, currentNetwork, channelContract);
      // console.log('@handleChannel TX:', tx);

      if (tx?.status) {
        GameController.handleToastNotification({
          message: `You channelled ${results.fud.toFixed(3)} FUD, ${results.fomo.toFixed(3)} FOMO, ${results.alpha.toFixed(
            3,
          )} ALPHA and ${results.kek.toFixed(3)} KEK!`,
          autoClose: true,
          type: 'success',
        });

        SFXController.playFX('channeling_end');
        await getSetChannelTime(realmId, installationId);
        await getSetGotchiChannelTime(onChainGotchiId);
        updateTransactionNotificationStatus(notificationDispatch, id, 'success');
        realmDispatch({
          type: 'UPDATE_CHANNEL_ID',
          lastChanneledId: onChainGotchiId,
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
    } catch (error) {
      oops();
      console.warn('@handleChannel:ERROR', error);
      updateTransactionNotificationStatus(notificationDispatch, id, 'error', getErrMessage(error) || error?.message || 'Channel failed');
    } finally {
      await Installations.addFlamesToAaltar(parcelDashboardState.altarId, false);
      setChannelLoading(false);
    }
  };

  const handleClaim = async () => {
    const soft = isSoftLaunchChannel(realmId);
    const onChainGotchiId = resolveOnChainGotchiId(selectedPlayer);
    const onChainParcelId = resolveOnChainParcelId(realmId);

    if (soft) {
      oops();
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        message:
          isCParcelInInventory(realmId) && onChainParcelId == null
            ? 'This cParcel is not owned by your wallet as an L1 REALM parcel. Own the matching parcel to empty reservoirs on-chain.'
            : selectedPlayer?.isCartridgeHero && onChainGotchiId == null
              ? 'Bind a matching L1 Aavegotchi in this wallet (same id as this cAavegotchi) to empty reservoirs on-chain.'
              : 'Reservoir claim is not available in soft-launch. Channel Alchemica instead.',
        options: { sound: true },
      });
      return;
    }

    if (onChainGotchiId == null) {
      oops();
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        message: selectedPlayer?.isCartridgeHero
          ? 'Bind a matching L1 Aavegotchi in this wallet to empty reservoirs via your cAavegotchi.'
          : 'No Aavegotchi selected for reservoir claim.',
        options: { sound: true },
      });
      return;
    }

    if (onChainParcelId == null) {
      oops();
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        message: isCParcelInInventory(realmId)
          ? 'This cParcel is not owned by your wallet as an L1 REALM parcel. Own the matching parcel to empty reservoirs on-chain.'
          : 'Parcel id missing for reservoir claim.',
        options: { sound: true },
      });
      return;
    }

    if (!ethersSigner || !currentNetwork) {
      oops();
      showNotificationWithTimeout(notificationDispatch, {
        type: 'error',
        message: 'Wallet not connected. Connect on Base and try again.',
        options: { sound: true },
      });
      return;
    }

    const channelContract: ChannelData = {
      realmId: onChainParcelId,
      gotchiId: onChainGotchiId,
    };

    setClaimLoading(true);
    const id = showTransactionNotification(notificationDispatch, {
      message: 'Empty Reservoirs',
    });
    try {
      const tx = await emptyReservoirs(ethersSigner, currentNetwork, channelContract);
      console.log('@handleClaim TX:', tx);

      const tint = (collected || [])
        .map((amount, index) => {
          if (amount > 0) return alchemicas[index];
          else return undefined;
        })
        .filter((type) => type);

      if (tx?.status) {
        GameController.handleToastNotification({
          message: `You collected ${collected?.[0] ?? 0} FUD, ${collected?.[1] ?? 0} FOMO, ${collected?.[2] ?? 0} ALPHA and ${
            collected?.[3] ?? 0
          } KEK!`,
          autoClose: true,
          type: 'success',
        });
        await getAndSetAlchemicaData(realmId);
        await getSetClaimTime(realmId);
        updateTransactionNotificationStatus(notificationDispatch, id, 'success');
        Installations.handleSpillOverAnim(parcelDashboardState.altarId, tint.length === 1 ? tint[0] : undefined);
        handleClose();
      } else {
        oops();
        updateTransactionNotificationStatus(notificationDispatch, id, 'error', getErrMessage(tx));
      }
    } catch (error) {
      oops();
      console.log('@handleClaim:ERROR', error?.data?.message || error.message);
      updateTransactionNotificationStatus(notificationDispatch, id, 'error', error?.data?.message || error.message);
    } finally {
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
          {foundryEnabled && (
            <div className="foundry-strip" style={{ marginTop: 12, padding: 8, border: '1px solid #50dce6', fontSize: 12 }}>
              <div style={{ color: '#50dce6', fontWeight: 700 }}>FOUNDRY PoC</div>
              <div>
                Pollution {foundryState.pollution} · Tithe {foundryState.titheAccrued} · Netherlink{' '}
                {foundryState.netherlink.toUpperCase()}
              </div>
              <div>
                Cargo {foundryState.cargo.fud}/{foundryState.cargo.fomo}/{foundryState.cargo.alpha}/{foundryState.cargo.kek}
                {' · '}
                Relay {foundryState.materials?.antennaRelay ?? 0} · Steel {foundryState.materials?.steel ?? 0} · Wire{' '}
                {foundryState.materials?.wire ?? 0}
              </div>
              <div style={{ opacity: 0.85 }}>{foundryState.walkLedgerHint}</div>
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
                    {secondsUntilChannel
                      ? channelBlockedByGotchi
                        ? `GOTCHI LOCKED ${formatTimeLeft(secondsUntilChannel)} (UTC midnight)`
                        : `${formatTimeLeft(secondsUntilChannel)} REMAINING`
                      : 'READY TO CHANNEL'}
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
