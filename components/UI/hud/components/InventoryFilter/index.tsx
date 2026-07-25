import { Select } from 'components/UI/elements';
import { useUser } from 'contexts/UserContext';
import { updateInventory } from 'contexts/UserContext/actions';
import { useWeb3 } from 'contexts/Web3Context';
import { providers, Signer } from 'ethers';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { Installation, NetworkNames } from 'types';
import styles from './styles';

interface Props {
  setFetching: (boolean) => any;
}

export const InventoryFilter = ({ setFetching }: Props): JSX.Element => {
  const [{ currentNetwork, currentAccount, globalProvider }] = useWeb3();
  const [{ inventory }, userDispatch] = useUser();

  const [category, setCategory] = useState<string>('ALL');
  const [type, setType] = useState<string>('all');

  const categories = [
    { value: 'ALL', name: 'All' },
    { value: 'INSTALLATION', name: 'Installations' },
    { value: 'TILE', name: 'Tiles' },
  ];

  const types = {
    ALL: [{ value: 'all', name: 'All' }],
    INSTALLATION: [
      { value: 'all', name: 'All' },
      { value: 'aaltars', name: 'Aaltars' },
      { value: 'reservoirs', name: 'Reservoirs' },
      { value: 'harvesters', name: 'Harvesters' },
      { value: 'maakers', name: 'Maakers' },
      { value: 'decorations', name: 'Decorations' },
      { value: 'waalls', name: 'Waalls' },
      { value: 'lodges', name: 'Lodges' },
    ],
    TILE: [
      { value: 'all', name: 'All' },
      { value: 'rugs', name: 'Rugs' },
      { value: 'grasses', name: 'Grasses' },
      { value: 'mosaics', name: 'Mosaics' },
    ],
  };

  const installationTypes = {
    aaltars: 0,
    harvesters: 1,
    reservoirs: 2,
    waalls: 3,
    lodges: 4,
    maakers: 6,
    decorations: 7,
  };

  const fetchInventory = async (web3Options: { network: NetworkNames; provider: providers.Provider | Signer; account: string }) => {
    setFetching(true);
    const inventoryFetched = await updateInventory(web3Options, userDispatch);
    filterInventory(inventoryFetched);
    setFetching(false);
  };

  useEffect(() => {
    if (currentAccount && currentNetwork && globalProvider) {
      void fetchInventory({
        provider: globalProvider,
        network: currentNetwork,
        account: currentAccount,
      });
    }
  }, [currentNetwork, currentAccount, globalProvider]);

  const filterInventory = (inventory: Installation[]) => {
    const inventoryFiltered = _.map(inventory, (item: Installation) => {
      let isVisible = false;
      if (category === 'ALL') isVisible = true;
      else if (item.type !== category) isVisible = false;
      else if (type === 'all') isVisible = true;
      else {
        if (category === 'INSTALLATION') isVisible = item.itemType === installationTypes[type];
        else {
          if (type === 'grasses') isVisible = item.id === 2 || item.id === 4 || item.id === 6;
          else if (type === 'rugs') isVisible = item.id === 5 || item.id === 7;
          else if (type === 'mosaics') isVisible = item.id >= 8 && item.id <= 35;
        }
      }
      return {
        ...item,
        isVisible,
      };
    });
    userDispatch({
      type: 'UPDATE_INVENTORY',
      inventory: inventoryFiltered,
    });
  };

  useEffect(() => {
    setFetching(true);
    filterInventory(inventory);
    setFetching(false);
  }, [category, type]);

  return (
    <>
      <div className="filters">
        <div className="filter">
          <div className="name">Category</div>
          <Select
            options={categories}
            onSelect={(value: string) => {
              setCategory(value);
              setType('all');
            }}
            value={category}
            theme="info"
            width="17rem"
          />
        </div>
        <div className="filter">
          <div className="name">Type</div>
          <Select
            options={types[category]}
            onSelect={(value) => {
              setType(value);
            }}
            value={type}
            theme="info"
            width="17rem"
          />
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
