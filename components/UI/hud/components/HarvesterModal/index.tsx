import { RateIcon } from 'assets';
import { Button, ParamStatus } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import { useWeb3 } from 'contexts/Web3Context';
import { useEffect, useState } from 'react';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { InstallationData, InstallationTypeLocal, Tokens } from 'types';
import installationTypes from 'shared_code/data/installations.json';
import styles from './styles';
import { getClaimableAlchemica, getHarvestRates, getTotalClaimed } from 'helpers/parcels.helper';
import { getAaltarIdForInstallation } from 'helpers/installations.helper';
import { AlchemicaValue, InstallationCard, Modal } from 'components/UI/component';
import { useGame } from 'contexts/GameContext';

export const HarvesterModal = (): JSX.Element => {
  const [{ harvesterState }, uiDispatch] = useUI();
  const [{ currentNetwork, globalProvider }] = useWeb3();
  const [{ gameConfig }] = useGame();

  const [installationTypeData, setInstallationTypeData] = useState<InstallationTypeLocal>();
  const [type, setType] = useState<Tokens>();
  const [liveRate, setLiveRate] = useState<number>();
  const [collected, setCollected] = useState<number>();
  const [totalClaimed, setTotalClaimed] = useState<number>();
  const [loading, setLoading] = useState(false);

  const alchemicas: Tokens[] = ['fud', 'fomo', 'alpha', 'kek'];

  useEffect(() => {
    if (harvesterState.open && harvesterState.installationId) {
      void getSetInstallationData(harvesterState.installationId);
    } else {
      setInstallationTypeData(undefined);
      setCollected(undefined);
      setTotalClaimed(undefined);
      setLiveRate(undefined);
    }
  }, [harvesterState.open, harvesterState.installationId, currentNetwork, globalProvider]);

  const handleClose = () => {
    uiDispatch({
      type: 'UPDATE_HARVESTER_STATE',
      harvesterState: {
        open: false,
        installationId: undefined,
        aaltarId: undefined,
      },
    });
  };

  const handleOpenDashboard = () => {
    const aaltarId = harvesterState.aaltarId || getAaltarIdForInstallation(harvesterState.installationId);
    handleClose();
    if (!aaltarId) {
      console.warn('HarvesterModal: no aaltar on parcel for dashboard');
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
    await getAndSetAlchemicaData(Number(installationData.realmId), typeData.alchemicaType, typeData.harvestRate);
  };

  const getAndSetAlchemicaData = async (realmId: number, alchemicaType: number, fallbackRate?: number) => {
    if (!globalProvider || !currentNetwork || !realmId) return;
    setLoading(true);
    try {
      const [claimable, claimed, rates] = await Promise.all([
        getClaimableAlchemica(globalProvider, currentNetwork, realmId),
        getTotalClaimed(globalProvider, currentNetwork, realmId),
        getHarvestRates(globalProvider, currentNetwork, realmId),
      ]);
      if (claimable) setCollected(claimable[alchemicaType] ?? 0);
      if (claimed) setTotalClaimed(claimed[alchemicaType] ?? 0);
      if (rates) setLiveRate(rates[alchemicaType] ?? fallbackRate ?? 0);
      else setLiveRate(fallbackRate ?? 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {installationTypeData && (
        <Modal
          title={`${type ? type.toUpperCase() : ''} HARVESTER`}
          open={harvesterState.installationId && harvesterState.open}
          onClose={handleClose}
          color={gameConfig.gotchiverseTheme}
        >
          <div className="inner">
            <div className="main">
              <div className="param-container col">
                <ParamStatus
                  label="Harvest rate/daily"
                  icon={RateIcon}
                  value={`${liveRate ?? installationTypeData.harvestRate ?? 0} ${type?.toUpperCase() || ''}`}
                />
                {loading ? <p className="hint">Loading parcel rates…</p> : null}
              </div>
              <div className="harvest-info col">
                <AlchemicaValue type={type} label={'IN RESERVOIR NOW:'} value={collected} />
                <AlchemicaValue type={type} label={'CLAIMED TOTAL:'} value={totalClaimed} />
              </div>
              <div className="card-container col">
                <InstallationCard
                  color={gameConfig.gotchiverseTheme}
                  level={installationTypeData.level}
                  typeId={installationTypeData.itemId}
                  size={0.8}
                  pinLabel
                />
              </div>
            </div>
          </div>
          <div className="button-container">
            <Button onClick={handleOpenDashboard} fullWidth color={gameConfig.gotchiverseTheme}>
              Empty via Dashboard
            </Button>
          </div>
        </Modal>
      )}
      <style jsx>{styles}</style>
    </>
  );
};
