import _ from 'lodash';
import { BigNumber, ethers, utils } from 'ethers';
import { Action } from '../../contexts/UserContext/reducer';
import GhstContractABI from '../../web3/abi/aavegotchi/GHSTDiamond.json';
import { varsForNetwork } from 'shared_code/web3/shared.const.web3';
import { getContractFromRecipeType } from 'helpers/functions';
import { getContract } from 'web3/contract';
import { Installation, NetworkNames, InstallationsBalancesWithTypes, OngoingUpgradesRes } from 'types';
import { getUserAlchemicaBalances } from 'helpers/gotchi.helper';
import { getTypeByItemId } from 'helpers/installations.helper';
import Players from 'components/phaser/Players';
import { mergeLocalWaallsIntoInventory } from 'helpers/waalls.helper';
import { mergeLocalLodgesIntoInventory } from 'helpers/lodge.helper';
import { hydrateOffchainStore } from 'helpers/offchain.store';

export const updateGhstBalance = async (
  ethersOptions: { provider: ethers.providers.Provider; network: string; account: string },
  dispatch: React.Dispatch<Action>,
) => {
  const { ghstAddress } = varsForNetwork(ethersOptions.network);
  if (!ghstAddress || /^0x0{40}$/i.test(ghstAddress)) return;
  const ghst = new ethers.Contract(ghstAddress, GhstContractABI.abi, ethersOptions.provider);
  try {
    const balance = await ghst.balanceOf(ethersOptions.account);
    // console.log("balance", balance);

    dispatch({
      type: 'UPDATE_GHST_BALANCE',
      ghstBalance: balance,
    });
  } catch (error) {}
};

const fetchContractInventory = async (
  type: 'INSTALLATION' | 'TILE',
  web3Options: {
    network: NetworkNames;
    provider: ethers.providers.Provider | ethers.Signer;
    account: string;
  },
): Promise<Installation[]> => {
  const contractType = getContractFromRecipeType(type);
  const contractCall = type === 'INSTALLATION' ? 'installationsBalancesWithTypes' : 'tilesBalancesWithTypes';
  const contract = await getContract(web3Options.network, web3Options.provider, contractType, false);
  // console.log('contract', type, contract);

  let inventoryItems: Installation[] = [];
  if (contract) {
    const r: InstallationsBalancesWithTypes[] = await contract[contractCall](web3Options.account);
    // console.log('res', r);
    inventoryItems = _.map(r, ({ installationType, tileType, balance, itemId }: InstallationsBalancesWithTypes) => {
      const data: Installation = {
        id: Number(itemId),
        name: installationType?.name || tileType.name,
        quantity: Number(balance),
        type,
        width: installationType?.width || BigNumber.from(tileType.width),
        level: installationType?.level || 1,
        itemId: Number(itemId),
        height: installationType?.height || BigNumber.from(tileType.height),
        itemType: type === 'INSTALLATION' ? installationType?.installationType : tileType.tileType,
        alchemicaType: installationType?.alchemicaType,
        isVisible: true,
      };
      if (type === 'INSTALLATION') _.assign(data, { level: installationType.level });

      return data;
    }).filter(({ level }) => level === 1);
  }
  return inventoryItems;
};

export const updateInventory = async (
  web3Options: {
    network: NetworkNames;
    provider: ethers.providers.Provider | ethers.Signer;
    account: string;
  },
  dispatch: React.Dispatch<Action>,
): Promise<Installation[]> => {
  // Hydrate Waall/Lodge memory (+ Mongo) before merging into inventory UI.
  await hydrateOffchainStore(web3Options.account);

  const installationBalances = await fetchContractInventory('INSTALLATION', web3Options);

  const tileBalances = await fetchContractInventory('TILE', web3Options);

  const inventory = mergeLocalLodgesIntoInventory(mergeLocalWaallsIntoInventory([...installationBalances, ...tileBalances]));
  dispatch({
    type: 'UPDATE_INVENTORY',
    inventory,
  });
  return inventory;
};

export const setActiveBrush = (activeBrush: number, dispatch: React.Dispatch<Action>) => {
  dispatch({
    type: 'UPDATE_ACTIVE_BRUSH',
    activeBrush,
  });
};

export const fetchOngoingUpgrades = async (
  web3Options: {
    network: NetworkNames;
    provider: ethers.providers.Provider | ethers.Signer;
    account: string;
  },
  dispatch: React.Dispatch<Action>,
): Promise<void> => {
  const contract = await getContract(web3Options.network, web3Options.provider, 'installationDiamond', false);
  if (contract) {
    const res = await contract.getUserUpgradeQueueNew(web3Options.account);
    let lenderRes;
    if (Players.selectedPlayer.originalOwner) {
      lenderRes = await contract.getUserUpgradeQueueNew(Players.selectedPlayer.originalOwner);
    }
    if (!res?.output_) return;

    let ongoingUpgradesRes: OngoingUpgradesRes[] = transformUpgradeRes(res);
    // console.log('ongoingUpgradesRes', ongoingUpgradesRes);

    if (lenderRes?.output_) {
      const ongoingLenderRes: OngoingUpgradesRes[] = transformUpgradeRes(lenderRes);
      // console.log('ongoingLenderRes', ongoingLenderRes);
      ongoingUpgradesRes = _.union(ongoingUpgradesRes, ongoingLenderRes);
    }

    // Get next levels information for craft time
    const uniqueIds = ongoingUpgradesRes.reduce((acc: number[], curr: OngoingUpgradesRes) => {
      return acc.includes(curr.installationId + 1) ? acc : [...acc, curr.installationId + 1];
    }, []);

    // Get more details about installations
    // const installationDetails = await contract.getInstallationTypes(uniqueIds);
    const installationDetails = uniqueIds.map((id) => {
      return getTypeByItemId(Number(id));
    });

    // console.log('installationDetails', installationDetails);

    // For each upgrade, map in correct data
    const ongoingUpgrades = ongoingUpgradesRes.map((upgrade) => {
      const installation = installationDetails.find((item) => item.itemId === upgrade.installationId + 1);
      return {
        ...upgrade,
        name: installation.name,
        startBlock: upgrade.readyBlock - installation.craftTime,
        level: installation.level,
      };
    });

    dispatch({ type: 'UPDATE_ONGOING_UPGRADES', ongoingUpgrades });
    // const currentBlock = await web3Options.provider.getBlockNumber();
    // console.log('currentBlock', currentBlock);
  }
};

const transformUpgradeRes = (res): OngoingUpgradesRes[] => {
  return res.output_.reduce((acc: OngoingUpgradesRes[], item, index) => {
    const { owner, coordinateX, coordinateY, readyBlock, claimed, parcelId, installationId } = item;
    if (claimed) return acc;
    const upgrade = {
      owner,
      coordinateX,
      coordinateY,
      readyBlock,
      parcelId,
      installationId: Number(installationId),
      index: res.indexes_[index],
    };
    return [...acc, upgrade];
  }, []);
};

export const fetchAndSetAlchemicaBalance = async (
  web3Options: {
    network: NetworkNames;
    provider: ethers.providers.Provider;
    account: string;
  },
  dispatch: React.Dispatch<Action>,
): Promise<void> => {
  const { network, provider, account } = web3Options;

  const results = await getUserAlchemicaBalances(account, network, provider);

  if (results) {
    const alchemicaBalance = {
      fud: results[0],
      fomo: results[1],
      alpha: results[2],
      kek: results[3],
      // gltr: results[4],
    };
    dispatch({
      type: 'UPDATE_ALCHEMICA_BALANCE',
      alchemicaBalance,
    });
  }
};

export const fetchAndSetGltrBalance = async (
  web3Options: { provider: ethers.providers.Provider; network: NetworkNames; account: string },
  dispatch: React.Dispatch<Action>,
): Promise<void> => {
  const gltrContract = getContract(web3Options.network, web3Options.provider, 'gltrAddress');
  try {
    const balance = await gltrContract.balanceOf(web3Options.account);
    const formattedBalance = Number(utils.formatEther(balance));

    dispatch({
      type: 'UPDATE_GLTR_BALANCE',
      gltrBalance: formattedBalance,
    });
  } catch (error) {
    console.error(error);
  }
};

export const fetchAndSetMaticBalance = async (
  web3Options: { provider: ethers.providers.Provider; network: NetworkNames; account: string },
  dispatch: React.Dispatch<Action>,
): Promise<void> => {
  try {
    // Base / Robinhood (and any chain without a MATIC ERC-20): use native ETH gas balance.
    const { maticAddress } = varsForNetwork(web3Options.network);
    const useNativeGas =
      !maticAddress ||
      /^0x0{40}$/i.test(maticAddress) ||
      web3Options.network === 'base' ||
      web3Options.network === 'robinhood';
    let formattedBalance: number;
    if (useNativeGas) {
      const balance = await web3Options.provider.getBalance(web3Options.account);
      formattedBalance = Number(utils.formatEther(balance));
    } else {
      const maticContract = getContract(web3Options.network, web3Options.provider, 'maticAddress');
      if (!maticContract) return;
      const balance = await maticContract.balanceOf(web3Options.account);
      formattedBalance = Number(utils.formatEther(balance));
    }

    dispatch({
      type: 'UPDATE_MATIC_BALANCE',
      maticBalance: formattedBalance,
    });
  } catch (error) {
    // Avoid console.error — Next.js dev overlay treats it as a blocking page error.
    console.warn('@fetchAndSetMaticBalance', error);
  }
};
