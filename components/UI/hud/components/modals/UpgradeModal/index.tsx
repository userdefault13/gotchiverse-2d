/* eslint-disable prefer-regex-literals */
import { Button, TraitUpgradeVertical, BlockTimer } from 'components/UI/elements';
import styles from './styles';
import _ from 'lodash';
import Image from 'next/image';
import { getOnChainAlchemicaIcon, getStripName, nFormatter } from 'helpers/functions';
import { NetworkNames, OngoingUpgrades } from 'types';
import { BigNumber, ethers, providers, utils } from 'ethers';
import { getContract, checkTokensAllowance, fetchTokensAllowance } from 'web3/contract';
import { useWeb3 } from 'contexts/Web3Context';
import { useEffect, useState, useMemo } from 'react';
import { useUI } from 'contexts/UIContexts';
import { speedupUpgrade, upgradeInstallation } from 'helpers/parcels.helper';
import { useUser } from 'contexts/UserContext';
import { fetchOngoingUpgrades, fetchAndSetAlchemicaBalance, fetchAndSetGltrBalance } from 'contexts/UserContext/actions';
import { useNotification } from 'contexts/NotificationContext';
import { showTransactionNotification, updateTransactionNotificationStatus } from 'contexts/NotificationContext/actions';
import { ApprovalNeeded } from 'components/UI/widgets';
import { getInstallationIdDataById } from 'shared_code/utils/shared.utils.installations';
import { useRealm } from 'contexts/RealmContext';
import { getErrMessage } from 'helpers/ethers.helper';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { getSelectedGotchiId } from 'helpers/installations.helper';
import { UsersAlchemicaBalance } from '../../CraftingTable/components';
import { InstallationCard, UpgrdModal } from 'components/UI/component';
import { getLocalWaallUpgradeInfo } from 'helpers/waalls.helper';
import {
  getLocalLodgeUpgradeInfo,
  isLocalOffchainInstallationId,
  isLocalOffchainItemId,
  isLodgeInstallationId,
  isLodgeItemId,
} from 'helpers/lodge.helper';
import Installations from 'components/phaser/Installations';

interface CurrentUpgrade {
  name: string;
  level: number;
  spillRadius?: number;
  spillRate?: number;
  capacity?: number;
  id: number;
  installationType: number;
  harvestRate?: number;
}

interface NextUpgrade extends CurrentUpgrade {
  upgradeCost: number[];
  blocksToUpgrade: number;
}

interface TokensApproved {
  fud: boolean;
  fomo: boolean;
  alpha: boolean;
  kek: boolean;
  gltr: boolean;
}

export const UpgradeModal = (): JSX.Element => {
  const [{ globalProvider, currentNetwork, ethersSigner, currentAccount }] = useWeb3();
  const [{ upgradeModal }, uiDispatch] = useUI();
  const [{ ongoingUpgrades, alchemicaBalance, gltrBalance }, userDispatch] = useUser();
  const [{ selectedPlayer }] = useRealm();
  const { send } = useAavegotchiSound();
  const [, notificationDispatch] = useNotification();

  const [currentBlock, setCurrentBlock] = useState(0);
  const [selectedInstallation, setSelectedInstallation] = useState<CurrentUpgrade>();
  const [nextUpgrade, setNextUpgrade] = useState<NextUpgrade>();
  const [tokensApproved, setTokensApproved] = useState<TokensApproved>();
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [gltrValue, setGltrValue] = useState<string>('');

  const [inProgress, setInProgress] = useState<OngoingUpgrades>();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (upgradeModal.open) void fetchAndSetCurrentBlock();
  }, [upgradeModal]);

  const fetchAndSetCurrentBlock = async () => {
    const block = await globalProvider.getBlockNumber();
    setCurrentBlock(block);
    return block;
  };

  const fetchContractRecipe = async (network: NetworkNames, provider: providers.Provider, id: number): Promise<NextUpgrade> => {
    // Local Waalls / Lodges are not on InstallationDiamond — load from catalog.
    if (isLocalOffchainItemId(id)) {
      const info = isLodgeItemId(id) ? getLocalLodgeUpgradeInfo(id) : getLocalWaallUpgradeInfo(id);
      if (!info) return;
      setSelectedInstallation(info.current);
      if (!info.next) {
        setNextUpgrade(undefined);
        return;
      }
      const next: NextUpgrade = {
        ...info.next,
        upgradeCost: info.next.upgradeCost,
        blocksToUpgrade: info.next.blocksToUpgrade,
      };
      setNextUpgrade(next);
      return next;
    }

    const contract = await getContract(network, provider, 'installationDiamond', false);
    if (contract) {
      const currentRes = await contract.getInstallationTypes([id]);
      const current: CurrentUpgrade = {
        name: currentRes[0].name,
        level: currentRes[0].level,
        spillRadius: currentRes[0].spillRadius,
        spillRate: currentRes[0].spillRate,
        capacity: Number(ethers.utils.formatEther(currentRes[0].capacity)),
        id: id,
        installationType: currentRes[0].installationType,
        harvestRate: Number(ethers.utils.formatEther(currentRes[0].harvestRate)),
      };

      // const nextRes = await contract.getInstallationTypes([Number(currentRes[0].nextLevelId)]);
      const nextRes = await contract.getInstallationTypes([id + 1]);
      const next: NextUpgrade = {
        name: nextRes[0].name,
        level: nextRes[0].level,
        spillRadius: nextRes[0].spillRadius,
        spillRate: nextRes[0].spillRate,
        capacity: Number(ethers.utils.formatEther(nextRes[0].capacity)),
        upgradeCost: nextRes[0].alchemicaCost.map((big: BigNumber) => utils.formatEther(big)),
        blocksToUpgrade: nextRes[0].craftTime,
        installationType: nextRes[0].installationType,
        harvestRate: Number(ethers.utils.formatEther(nextRes[0].harvestRate)),
        // id: currentRes[0].nextLevelId,
        id: id + 1,
      };
      setSelectedInstallation(current);
      setNextUpgrade(next);
      return next;
    }
  };

  const handleClose = () => {
    setGltrValue('');
    uiDispatch({
      type: 'UPDATE_UPGRADE_MODAL',
      upgradeModal: {
        open: false,
        installationId: undefined,
      },
    });
  };

  const getInstallationDetails = (installationId: string) => {
    const { itemId, position, realmId } = getInstallationIdDataById(installationId);
    return {
      realmId: Number(realmId),
      coordinateX: position.x,
      coordinateY: position.y,
      installationId: itemId,
    };
  };

  const handleUpgrade = async (speedup?: boolean) => {
    setLoading(true);
    const activeParcel = getInstallationDetails(upgradeModal.installationId);
    const id = showTransactionNotification(notificationDispatch, {
      message: 'Upgrade Installation',
    });
    let tx;
    try {
      // Local Waall / Lodge upgrade — instant, no diamond.
      if (isLocalOffchainInstallationId(upgradeModal.installationId)) {
        const label = isLodgeInstallationId(upgradeModal.installationId) ? 'Lodge' : 'Waall';
        if (!nextUpgrade) {
          updateTransactionNotificationStatus(notificationDispatch, id, 'error', `No next ${label} level`);
          setLoading(false);
          return;
        }
        const cost = nextUpgrade.upgradeCost || [0, 0, 0, 0];
        const canPay = !cost.some((value, i) => !validAlchemica(Number(value), i, alchemicaBalance));
        if (!canPay) {
          updateTransactionNotificationStatus(notificationDispatch, id, 'error', 'Not enough alchemica');
          setLoading(false);
          return;
        }
        const nextBalance = {
          fud: alchemicaBalance.fud - Number(cost[0] || 0),
          fomo: alchemicaBalance.fomo - Number(cost[1] || 0),
          alpha: alchemicaBalance.alpha - Number(cost[2] || 0),
          kek: alchemicaBalance.kek - Number(cost[3] || 0),
        };
        const result = isLodgeInstallationId(upgradeModal.installationId)
          ? await Installations.upgradeLocalLodge(upgradeModal.installationId)
          : await Installations.upgradeLocalWaall(upgradeModal.installationId);
        if (!result.ok) {
          updateTransactionNotificationStatus(notificationDispatch, id, 'error', result.message);
          setLoading(false);
          return;
        }
        userDispatch({ type: 'UPDATE_ALCHEMICA_BALANCE', alchemicaBalance: nextBalance });
        send();
        updateTransactionNotificationStatus(notificationDispatch, id, 'success');
        handleClose();
        setLoading(false);
        return;
      }

      const gltr = isNaN(Number(gltrValue)) ? 0 : Math.abs(Number(gltrValue));
      if (!speedup) tx = await upgradeInstallation(currentAccount, ethersSigner, currentNetwork, activeParcel, gltr);
      else {
        tx = await speedupUpgrade(ethersSigner, currentNetwork, {
          upgradeIndex: Number(inProgress.index),
          gotchiId: getSelectedGotchiId(),
          blocks: gltr,
        });
      }
      if (tx?.wait) {
        send();
        const res = await tx.wait();
        if (res?.status) {
          updateTransactionNotificationStatus(notificationDispatch, id, 'success');
          const web3Options = { provider: globalProvider, network: currentNetwork, account: currentAccount };
          // Update state
          void fetchOngoingUpgrades(web3Options, userDispatch);
          void fetchAndSetAlchemicaBalance(web3Options, userDispatch);
          void fetchAndSetGltrBalance(web3Options, userDispatch);
        }
      } else updateTransactionNotificationStatus(notificationDispatch, id, 'error', getErrMessage(tx));
    } catch (error) {
      console.log('@handleUpgradeERR', error);
      updateTransactionNotificationStatus(notificationDispatch, id, 'error', getErrMessage(tx || error));
    }
    setLoading(false);
  };

  const getIsInProgress = (upgrades: OngoingUpgrades[], id: string) => {
    const { realmId, coordinateX, coordinateY, installationId } = getInstallationDetails(id);
    const selectedUpgrade = upgrades.find(
      (upgrade) =>
        Number(upgrade.parcelId) === Number(realmId) &&
        upgrade.installationId === installationId &&
        upgrade.coordinateX === coordinateX &&
        upgrade.coordinateY === coordinateY,
    );
    return selectedUpgrade;
  };

  const calculateProgress = useMemo(() => {
    if (currentBlock && inProgress) {
      const max = inProgress.readyBlock - inProgress.startBlock;
      const progress = currentBlock - inProgress.startBlock;
      const percentage = Math.floor((progress * 100) / max);
      if (percentage < 0) return '0%';
      if (percentage > 100) return '100%';

      return `${percentage}%`;
    }
  }, [currentBlock, inProgress?.startBlock, inProgress?.readyBlock]);

  const getBlocksRemaining = (end?: number, current?: number, gltr?: string) => {
    const gltrDeduction = isNaN(Number(gltr)) ? 0 : Math.abs(Number(gltr));
    if (current && end) {
      const difference = end - current - gltrDeduction;
      return difference < 0 ? 0 : difference;
    }
    if (end) return end;
    return 0;
  };

  const getBlocksToUpgrade = (blocks?: number, gltr?: string): number => {
    if (blocks) {
      const gltrDeduction = isNaN(Number(gltr)) ? 0 : Math.abs(Number(gltr));
      return blocks - gltrDeduction < 0 ? 0 : blocks - gltrDeduction;
    }
    return 0;
  };

  const isApproved = (allowance?: TokensApproved): boolean => {
    if (allowance === undefined) return false;
    return !Object.keys(allowance).some((alchemica) => !allowance[alchemica]);
  };

  const fetchAndSetAllowance = async (web3Options: { network: NetworkNames; provider: providers.Provider; account: string }, next: NextUpgrade) => {
    const { account, provider, network } = web3Options;
    setLoading(true);
    const response = await fetchTokensAllowance('installationDiamond', account, network, provider);
    if (response) {
      console.log('nextUpgrade', next?.upgradeCost);
      const allowedTokens = checkTokensAllowance(
        {
          fud: Number(next?.upgradeCost[0]) || 0.1,
          fomo: Number(next?.upgradeCost[1]) || 0.1,
          alpha: Number(next?.upgradeCost[2]) || 0.1,
          kek: Number(next?.upgradeCost[2]) || 0.1,
          gltr: 0.1,
        },
        {
          fud: response[0],
          fomo: response[1],
          alpha: response[2],
          kek: response[3],
          gltr: response[4],
        },
      );
      setTokensApproved(allowedTokens);
    }
    setLoading(false);
  };

  const validAlchemica = (
    cost: number,
    key: number,
    alchemica?: {
      fud: number;
      fomo: number;
      alpha: number;
      kek: number;
    },
  ) => {
    if (!alchemica) return false;
    switch (key) {
      case 0:
        return cost <= alchemica.fud;
      case 1:
        return cost <= alchemica.fomo;
      case 2:
        return cost <= alchemica.alpha;
      case 3:
        return cost <= alchemica.kek;
      default:
        return true;
    }
  };

  const validGltr = (input: string, balance: number) => {
    const gltr = isNaN(Number(input)) ? 0 : Math.abs(Number(input));
    if (balance == null || Number.isNaN(Number(balance))) return gltr === 0;
    return gltr <= balance;
  };

  const isLocalOffchainUpgrade = Boolean(upgradeModal?.installationId && isLocalOffchainInstallationId(upgradeModal.installationId));

  const sufficientBalance = (
    recipe: NextUpgrade,
    alchemica: {
      fud: number;
      fomo: number;
      alpha: number;
      kek: number;
    },
  ) => {
    if (!recipe || !alchemica) return false;

    const isValidAlchemica = !recipe.upgradeCost.some((value, i) => !validAlchemica(Number(value), i, alchemica));
    // Local Waalls / Lodges ignore GLTR (instant upgrade).
    if (isLocalOffchainUpgrade) return isValidAlchemica;
    const isValidGltr = validGltr(gltrValue, gltrBalance);
    return isValidAlchemica && isValidGltr;
  };

  useEffect(() => {
    if (ongoingUpgrades && upgradeModal?.installationId) {
      const isUpgrading = getIsInProgress(ongoingUpgrades, upgradeModal?.installationId);
      setInProgress(isUpgrading);
      // console.log('inProgress', inProgress);
    } else {
      setInProgress(undefined);
    }
  }, [ongoingUpgrades, upgradeModal?.installationId]);

  useEffect(() => {
    if (globalProvider && currentNetwork && upgradeModal.installationId) {
      void initUpgradeModal();
    }
  }, [globalProvider, currentNetwork, currentAccount, upgradeModal.installationId]);

  const initUpgradeModal = async () => {
    const web3options = { provider: globalProvider, network: currentNetwork, account: currentAccount };
    const installationData = getInstallationIdDataById(upgradeModal.installationId);
    const next = await fetchContractRecipe(currentNetwork, globalProvider, installationData.itemId);
    await fetchAndSetAlchemicaBalance(web3options, userDispatch);

    if (isLocalOffchainItemId(installationData.itemId)) {
      // Local Waalls / Lodges skip diamond allowance / upgrade queue.
      setTokensApproved({ fud: true, fomo: true, alpha: true, kek: true, gltr: true });
      setLoading(false);
      return;
    }

    await fetchOngoingUpgrades(web3options, userDispatch);
    await fetchAndSetAllowance(web3options, next);
    await fetchAndSetGltrBalance(web3options, userDispatch);
  };

  if (approveModalOpen) {
    return (
      <ApprovalNeeded
        approved={tokensApproved}
        handleApproved={setTokensApproved}
        open={approveModalOpen && upgradeModal.open}
        onClose={() => setApproveModalOpen(false)}
        contractName="installationDiamond"
      />
    );
  }

  const handleClaim = async () => {
    setLoading(true);
    const contract = await getContract(currentNetwork, ethersSigner, 'installationDiamond', true);

    let notificationId;
    if (notificationDispatch) {
      notificationId = showTransactionNotification(notificationDispatch, {
        message: `Claim Upgrade Lv. ${nextUpgrade.level}`,
        options: {
          sound: true,
        },
      });
    }

    try {
      const tx = await contract.finalizeUpgrades([Number(inProgress.index)]);
      await tx.wait();
      updateTransactionNotificationStatus(notificationDispatch, notificationId, 'success');

      void fetchOngoingUpgrades({ provider: globalProvider, network: currentNetwork, account: currentAccount }, userDispatch);
    } catch (error) {
      console.log(`@handleClaim ${error}`);
      updateTransactionNotificationStatus(notificationDispatch, notificationId, 'error');
    }
    setLoading(false);
  };

  const isReady = () => {
    return inProgress && currentBlock >= inProgress.readyBlock;
  };

  const handleOnMaxGltr = async () => {
    let block;
    if (inProgress) {
      block = await fetchAndSetCurrentBlock();
    }
    const blocks = inProgress ? getBlocksRemaining(inProgress?.readyBlock, block) : getBlocksToUpgrade(nextUpgrade?.blocksToUpgrade, '0');
    setGltrValue(blocks.toString());
  };

  const getLevelBasedProp = (prop) => {
    return selectedInstallation?.level === 9 ? selectedInstallation[prop] : nextUpgrade?.[prop];
  };

  const getRemainingBlocks = inProgress
    ? getBlocksRemaining(inProgress?.readyBlock, currentBlock, gltrValue)
    : getBlocksToUpgrade(nextUpgrade?.blocksToUpgrade, gltrValue);

  const handleOnChange = (e) => {
    let { value, min, max } = e.target;
    value = Math.max(Number(min), Math.min(Number(max), Number(value)));
    setGltrValue(Number(value).toString());
    // setGltrValue(e?.target.value);
  };

  return (
    <>
      <UpgrdModal
        open={upgradeModal.open}
        onClose={handleClose}
        color="info"
        title={
          selectedInstallation?.level === 9
            ? 'Upgrade Completed!'
            : `Upgrade ${selectedInstallation?.name.replace('Level ', 'Lv. ').replace('Alchemical ', '')}`
        }
      >
        <UsersAlchemicaBalance usersAlchemicaBalance={alchemicaBalance} color="info" gltr={gltrBalance} />

        <div className="inner">
          <div className="raw info-container">
            <div className="info-content">
              <InstallationCard typeId={getLevelBasedProp('id')} level={getLevelBasedProp('level')} size={1.1} progress={calculateProgress} />
              {
                <div className="traits-content fade-gradient left">
                  {selectedInstallation?.installationType === 1 && (
                    <TraitUpgradeVertical name="Harvest Rate" currentValue={selectedInstallation?.harvestRate} nextValue={nextUpgrade?.harvestRate} />
                  )}
                  {(selectedInstallation?.installationType === 2 || selectedInstallation?.installationType === 0) && (
                    <>
                      {selectedInstallation?.spillRadius && (
                        <TraitUpgradeVertical
                          name="Spill Radius"
                          currentValue={selectedInstallation?.spillRadius}
                          nextValue={nextUpgrade?.spillRadius}
                        />
                      )}
                      {selectedInstallation?.spillRate && (
                        <TraitUpgradeVertical
                          name="Spill Rate"
                          currentValue={`${selectedInstallation?.spillRate / 100}%`}
                          nextValue={`${nextUpgrade?.spillRate / 100}%`}
                        />
                      )}
                      {selectedInstallation?.installationType === 2 && selectedInstallation?.capacity && (
                        <TraitUpgradeVertical name="Capacity" currentValue={selectedInstallation?.capacity} nextValue={nextUpgrade?.capacity} />
                      )}
                    </>
                  )}
                </div>
              }
            </div>

            {!isReady() && selectedInstallation?.level !== 9 && (
              <>
                <div className="alchemica-container fade-gradient">
                  <span className="lable info title"> UPGRADE COST: </span>
                  {nextUpgrade?.upgradeCost.map((value, i) => (
                    <div key={i} className={`alchemica ${validAlchemica(Number(value), i, alchemicaBalance) ? '' : 'invalid'}`}>
                      <Image alt="" src={getOnChainAlchemicaIcon(i)} width={32} height={32} />
                      <p>{nFormatter(value, 2)}</p>
                    </div>
                  ))}
                </div>

                {!isLocalOffchainUpgrade && (
                  <BlockTimer
                    blocks={
                      inProgress
                        ? getBlocksRemaining(inProgress?.readyBlock, currentBlock, gltrValue)
                        : getBlocksToUpgrade(nextUpgrade?.blocksToUpgrade, gltrValue)
                    }
                    maxValue={inProgress ? getBlocksRemaining(inProgress?.readyBlock, currentBlock) : getBlocksToUpgrade(nextUpgrade?.blocksToUpgrade)}
                    value={gltrValue}
                    onMax={handleOnMaxGltr}
                    onChange={handleOnChange}
                    error={gltrBalance === undefined ? false : !validGltr(gltrValue, gltrBalance)}
                  />
                )}
                {isLocalOffchainUpgrade && (
                  <div className="alchemica-container fade-gradient">
                    <span className="lable info title">BUILD TIME:</span>
                    <p style={{ color: 'var(--col-info-200)', fontSize: '1.6rem', margin: 0 }}>Instant (local)</p>
                  </div>
                )}
              </>
            )}

            {(isReady() || selectedInstallation?.level === 9) && (
              <>
                <div className="congrats-container">
                  <h3 className="congrats-title">Congrats FREN!</h3>
                  <div className="congrats-info">
                    Your {selectedInstallation && getStripName(selectedInstallation?.name).toUpperCase()} now upgraded to{' '}
                    <span className="level-decoration">{`Level ${selectedInstallation?.level === 9 ? 9 : nextUpgrade?.level}!`}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="btn-container raw">
            {isApproved(tokensApproved) && !inProgress && selectedInstallation?.level !== 9 && (!inProgress || !isReady()) && (
              <Button
                onClick={async () => await handleUpgrade()}
                color="info"
                disabled={loading || !!inProgress || !sufficientBalance(nextUpgrade, alchemicaBalance)}
              >
                {loading && !inProgress && 'Loading...'}
                {!inProgress && !loading && 'Upgrade'}
              </Button>
            )}

            {isApproved(tokensApproved) && inProgress && selectedInstallation?.level !== 9 && (!inProgress || !isReady()) && (
              <Button
                onClick={async () => await handleUpgrade(true)}
                secondary
                disabled={loading || gltrBalance === undefined || !gltrValue || gltrValue === '0' || !validGltr(gltrValue, gltrBalance)}
              >
                {loading && 'Loading...'}
                {inProgress && !loading && 'Speed up'}
              </Button>
            )}

            {!isApproved(tokensApproved) && (
              <Button onClick={() => setApproveModalOpen(true)} disabled={loading}>
                {loading ? 'Loading...' : 'Approve'}
              </Button>
            )}

            {selectedInstallation?.level !== 9 && isReady() && (
              <Button color="info" onClick={handleClaim} disabled={loading}>
                {loading ? 'Claiming...' : 'Claim'}
              </Button>
            )}
          </div>
        </div>
      </UpgrdModal>
      <style jsx>{styles}</style>
    </>
  );
};
