import { useMemo } from 'react';
import { Button } from 'components/UI/elements';
import { InventoryCard } from 'components/UI/component';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  SHELF_ITEM_ID,
  CASHIER_ITEM_ID,
  CONSOLE_ITEM_ID,
  TERMINAL_ITEM_ID,
  STORE_FURNITURE_TYPE,
  getFurnitureQty,
  getConsoleBagCount,
} from 'helpers/store.layout.helper';
import inventoryStyles from '../components/Inventory/styles';

export type StoreFurnitureBrush =
  | typeof SHELF_ITEM_ID
  | typeof CASHIER_ITEM_ID
  | typeof CONSOLE_ITEM_ID
  | typeof TERMINAL_ITEM_ID;

interface StoreInstallCard {
  id: number;
  itemId: number;
  name: string;
  quantity: number;
  level: number;
  itemType: number;
  type: 'INSTALLATION';
}

interface Props {
  placeBrush: StoreFurnitureBrush | null;
  invTick: number;
  onSelectBrush: (itemId: StoreFurnitureBrush | null) => void;
  onExit: () => void;
}

function buildStoreInstallations(): StoreInstallCard[] {
  return [
    {
      id: SHELF_ITEM_ID,
      itemId: SHELF_ITEM_ID,
      name: 'Shelf Level 1',
      quantity: getFurnitureQty(SHELF_ITEM_ID),
      level: 1,
      itemType: STORE_FURNITURE_TYPE,
      type: 'INSTALLATION',
    },
    {
      id: CASHIER_ITEM_ID,
      itemId: CASHIER_ITEM_ID,
      name: 'Cashier Level 1',
      quantity: getFurnitureQty(CASHIER_ITEM_ID),
      level: 1,
      itemType: STORE_FURNITURE_TYPE,
      type: 'INSTALLATION',
    },
    {
      id: TERMINAL_ITEM_ID,
      itemId: TERMINAL_ITEM_ID,
      name: 'Terminal Level 1',
      quantity: getFurnitureQty(TERMINAL_ITEM_ID),
      level: 1,
      itemType: STORE_FURNITURE_TYPE,
      type: 'INSTALLATION',
    },
    {
      id: CONSOLE_ITEM_ID,
      itemId: CONSOLE_ITEM_ID,
      name: 'Console Level 1',
      quantity: getConsoleBagCount(),
      level: 1,
      itemType: STORE_FURNITURE_TYPE,
      type: 'INSTALLATION',
    },
  ];
}

/** Inventory tray for store installations (furniture bag), mirrored after parcel Inventory. */
export const StoreInventory = ({ placeBrush, invTick, onSelectBrush, onExit }: Props): JSX.Element => {
  const { click, oops, back } = useAavegotchiSound();

  const items = useMemo(() => buildStoreInstallations(), [invTick]);

  const handlePointerDown = (item: StoreInstallCard) => {
    if (!item.quantity) {
      oops();
      return;
    }
    click();
    const brush = item.itemId as StoreFurnitureBrush;
    onSelectBrush(placeBrush === brush ? null : brush);
  };

  const handleExit = () => {
    back();
    onExit();
  };

  return (
    <>
      <div className="content">
        <p className="store-inv-hint">Store installations — craft in Recipe Book, then place here</p>
        <div className="divider"></div>
        <div className="scroll-wrapper">
          <div className="scroll-cantainer-wrapper scrollable info">
            <div className="scroll-container">
              {items.map((item) => {
                const active = placeBrush === item.itemId;
                const disabled = !item.quantity;
                return (
                  <div key={item.id} style={{ boxShadow: 'none' }} className={`shadow ${active ? 'active' : ''}`}>
                    <div
                      className={`installation-wrapper ${active ? 'active' : ''}`}
                      onPointerDown={() => handlePointerDown(item)}
                    >
                      <InventoryCard
                        quantity={item.quantity}
                        installation={{
                          name: item.name,
                          level: item.level,
                          rarity: 'common',
                          type: item.type,
                          itemType: item.itemType,
                          id: item.id,
                          itemId: item.itemId,
                        }}
                        isDisabled={disabled ? { state: true, reason: '0 remaining' } : { state: false }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="exit-button">
        <Button color="success" fullWidth={true} onClick={handleExit} disableSound>
          Exit Build Mode
        </Button>
      </div>
      <style jsx>{inventoryStyles}</style>
      <style jsx>{`
        .store-inv-hint {
          margin: 0 0 0.4rem;
          font-size: 1.2rem;
          color: var(--col-success-300);
          line-height: 1.2;
        }
        .shadow.active {
          filter: drop-shadow(0rem 0.1rem 0.1rem var(--col-success-300))
            drop-shadow(0rem -0.1rem 0.1rem var(--col-success-300)) drop-shadow(0.1rem 0rem 0.1rem var(--col-success-300))
            drop-shadow(-0.1rem 0rem 0.1rem var(--col-success-300)) drop-shadow(0rem 0rem 0.4rem var(--col-success-300));
        }
        .installation-wrapper.active {
          background: var(--col-success-300);
        }
      `}</style>
    </>
  );
};
