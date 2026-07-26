import { useEffect, useState } from 'react';
import { RadiusIcon, RateIcon } from 'assets';
import { Button, ParamStatus } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import { useWeb3 } from 'contexts/Web3Context';
import { useRealm } from 'contexts/RealmContext';
import { useNotification } from 'contexts/NotificationContext';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import installationTypes from 'shared_code/data/installations.json';
import { ChannelData, InstallationData, InstallationTypeLocal, Tokens } from 'types';
import styles from './styles';
import {
  emptyReservoirs,
  formatTimeLeft,
  getCapacities,
  getClaimableAlchemica,
  getContractParcelLastClaimded,
  getTotalClaimed,
  secondsUntilParcelCanClaim,
} from 'helpers/parcels.helper';
import { getAaltarIdForInstallation } from 'helpers/installations.helper';
import { AlchemicaValue, InstallationCard, Modal } from 'components/UI/component';
import { useGame } from 'contexts/GameContext';
import { showTransactionNotification, updateTransactionNotificationStatus } from 'contexts/NotificationContext/actions';
import { getErrMessage } from 'helpers/ethers.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import GameController from 'components/controllers/GameController';
import Installations from 'components/phaser/Installations';

export const ReservoirModal = (): JSX.Element => {
  const [{ reservoirState }, uiDispatch] = useUI();
  const [{ ethersSigner, currentNetwork, globalProvider }] = useWeb3();
  const [{ selectedPlayer }] = useRealm();
  const [, notificationDispatch] = useNotification();
  const [{ gameConfig }] = useGame();
  const { oops, click } = useAavegotchiSound();

  const [installationTypeData, setInstallationTypeData] = useState<InstallationTypeLocal>();
  const [realmId, setRealmId] = useState<number>();
  const [collected, setCollected] = useState<number>();
  const [allCollected, setAllCollected] = useState<number[]>();
  const [totalClaimed, setTotalClaimed] = useState<number>();
  const [capacity, setCapacity] = useState<number>();
  const [percentage, setPercentage] = useState<number>();
  const [type, setType] = useState<Tokens>();
  const [secondsUntilClaim, setSecondsUntilClaim] = useState<number>();
  const [claimLoading, setClaimLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const alchemicas: Tokens[] = ['fud', 'fomo', 'alpha', 'kek'];

  useEffect(() => {
    if (reservoirState.open && reservoirState.installationId) {
      void getSetInstallationData(reservoirState.installationId);
    } else {
      setInstallationTypeData(undefined);
      setCollected(undefined);
      setAllCollected(undefined);
      setTotalClaimed(undefined);
      setCapacity(undefined);
      setPercentage(undefined);
      setSecondsUntilClaim(undefined);
    }
  }, [reservoirState.open, reservoirState.installationId, currentNetwork, globalProvider]);

  const handleClose = () => {
    uiDispatch({
      type: 'UPDATE_RESERVOIR_STATE',
      reservoirState: {
        open: false,
        installationId: undefined,
        aaltarId: undefined,
      },
    });
  };

  const handleOpenDashboard = () => {
    const aaltarId = reservoirState.aaltarId || getAaltarIdForInstallation(reservoirState.installationId);
    handleClose();
    if (!aaltarId) {
      console.warn('ReservoirModal: no aaltar on parcel for dashboard');
      return;
    }
    uiDispatch({
      type: 'UPDATE_PARCEL_DASHBOARD',
      parcelDashboardState: { open: true, altarId: aaltarId },
    });
  };

  const getSetInstallationData = async (id: string) => {
    const installationData = getInstallationIdDataById(id) as unknown as InstallationData;
    if (installationData?.itemId == null) return;

    const typeData = installationTypes[installationData.itemId] as InstallationTypeLocal;
    if (!typeData) return;

    setInstallationTypeData(typeData);
    setType(alchemicas[typeData.alchemicaType]);
    const tokenId = Number(installationData.realmId);
    if (tokenId) {
      setRealmId(tokenId);
      await getAndSetAlchemicaData(tokenId, typeData.alchemicaType);
    }
  };

  const getAndSetAlchemicaData = async (parcelTokenId: number, alchemicaType: number) => {
    if (!globalProvider || !currentNetwork || !parcelTokenId) return;
    setLoading(true);
    try {
      const [claimable, claimed, capacities, lastClaimed] = await Promise.all([
        getClaimableAlchemica(globalProvider, currentNetwork, parcelTokenId),
        getTotalClaimed(globalProvider, currentNetwork, parcelTokenId),
        getCapacities(globalProvider, currentNetwork, parcelTokenId),
        getContractParcelLastClaimded(globalProvider, currentNetwork, parcelTokenId),
      ]);

      if (claimable) {
        setAllCollected(claimable);
        setCollected(claimable[alchemicaType] ?? 0);
      }
      if (claimed) setTotalClaimed(claimed[alchemicaType] ?? 0);
      if (capacities) setCapacity(capacities[alchemicaType] ?? 0);

      if (claimable && capacities?.[alchemicaType]) {
        setPercentage(Number(((claimable[alchemicaType] * 100) / capacities[alchemicaType]).toFixed(0)));
      } else {
        setPercentage(0);
      }

      const lastClaimStr = lastClaimed != null ? lastClaimed.toString() : '0';
      setSecondsUntilClaim(secondsUntilParcelCanClaim(currentNetwork, lastClaimStr) ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const canEmpty =
    Boolean(ethersSigner && selectedPlayer?.id && realmId) &&
    !claimLoading &&
    !secondsUntilClaim &&
    Boolean(allCollected?.some((amount) => amount > 0)) &&
    Boolean(capacity);

  const handleEmpty = async () => {
    if (!canEmpty || !ethersSigner || !selectedPlayer?.id || !realmId) return;
    click();
    setClaimLoading(true);
    const notifyId = showTransactionNotification(notificationDispatch, {
      message: 'Empty Reservoirs',
    });
    const channelContract: ChannelData = {
      realmId,
      gotchiId: Number(selectedPlayer.id),
    };
    try {
      const tx = await emptyReservoirs(ethersSigner, currentNetwork, channelContract);
      if (tx?.status) {
        const amounts = allCollected || [0, 0, 0, 0];
        GameController.handleToastNotification({
          message: `You collected ${amounts[0]} FUD, ${amounts[1]} FOMO, ${amounts[2]} ALPHA and ${amounts[3]} KEK!`,
          autoClose: true,
          type: 'success',
        });
        updateTransactionNotificationStatus(notificationDispatch, notifyId, 'success');
        const aaltarId = reservoirState.aaltarId || getAaltarIdForInstallation(reservoirState.installationId);
        if (aaltarId) {
          const tint = amounts
            .map((amount, index) => (amount > 0 ? alchemicas[index] : undefined))
            .filter(Boolean) as Tokens[];
          Installations.handleSpillOverAnim(aaltarId, tint.length === 1 ? tint[0] : undefined);
        }
        await getAndSetAlchemicaData(realmId, installationTypeData.alchemicaType);
      } else {
        oops();
        updateTransactionNotificationStatus(notificationDispatch, notifyId, 'error', getErrMessage(tx));
      }
    } catch (error) {
      oops();
      updateTransactionNotificationStatus(
        notificationDispatch,
        notifyId,
        'error',
        error?.data?.message || error?.message || 'Empty reservoirs failed',
      );
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <>
      {installationTypeData && (
        <Modal
          title={`${alchemicas[installationTypeData.alchemicaType].toUpperCase()} RESERVOIR`}
          color={gameConfig.gotchiverseTheme}
          open={reservoirState.installationId && reservoirState.open}
          onClose={handleClose}
        >
          <div className="inner">
            <div className="main">
              <div className="params-status col">
                <ParamStatus label="Capacity" icon={RadiusIcon} value={`${capacity ?? 0} ${type?.toUpperCase() || ''}`} />
                <ParamStatus label="Spill Radius" icon={RadiusIcon} value={`${installationTypeData.spillRadius} G`} />
                <ParamStatus label="Spill Rate" icon={RateIcon} value={`${installationTypeData.spillRate / 100}%`} />
                {loading ? <p className="hint">Loading reservoir…</p> : null}
              </div>
              <div className="collected-info col">
                <AlchemicaValue label="COLLECTED NOW:" type={type} value={collected} />
                <AlchemicaValue label="COLLECTED TOTAL:" type={type} value={totalClaimed} />
              </div>
              <div className="card-container col">
                <div className="card">
                  <InstallationCard
                    color={gameConfig.gotchiverseTheme}
                    level={installationTypeData.level}
                    typeId={installationTypeData.itemId}
                    size={0.9}
                    pinLabel
                    progressPos="bottom"
                    percentage={percentage}
                    progress={`${type} ${percentage ?? 0}%`}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="button-container">
            <Button onClick={handleEmpty} fullWidth color={gameConfig.gotchiverseTheme} disabled={!canEmpty}>
              {claimLoading ? 'Emptying…' : secondsUntilClaim ? `${formatTimeLeft(secondsUntilClaim)} cooldown` : 'Empty Reservoirs'}
            </Button>
            <Button onClick={handleOpenDashboard} fullWidth secondary>
              Open Dashboard
            </Button>
          </div>
        </Modal>
      )}
      <style jsx>{styles}</style>
    </>
  );
};
