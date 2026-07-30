import { useMemo } from 'react';
import { Button } from 'components/UI/elements';
import { InventoryCard } from 'components/UI/component';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  BROADCASTER_ITEM_ID,
  LODGE_FURNITURE_TYPE,
  getLodgeFurnitureQty,
} from 'helpers/lodge.layout.helper';
import inventoryStyles from '../components/Inventory/styles';

export type LodgeFurnitureBrush = typeof BROADCASTER_ITEM_ID;

interface LodgeInstallCard {
  id: number;
  itemId: number;
  name: string;
  quantity: number;
  level: number;
  itemType: number;
  type: 'INSTALLATION';
}

interface Props {
  placeBrush: LodgeFurnitureBrush | null;
  invTick: number;
  onSelectBrush: (itemId: LodgeFurnitureBrush | null) => void;
  onExit: () => void;
}

function buildLodgeInstallations(): LodgeInstallCard[] {
  return [
    {
      id: BROADCASTER_ITEM_ID,
      itemId: BROADCASTER_ITEM_ID,
      name: 'Broadcaster',
      quantity: getLodgeFurnitureQty(BROADCASTER_ITEM_ID),
      level: 1,
      itemType: LODGE_FURNITURE_TYPE,
      type: 'INSTALLATION',
    },
  ];
}

/** Inventory tray for lodge furniture bag (Broadcaster). */
export const LodgeInventory = ({ placeBrush, invTick, onSelectBrush, onExit }: Props): JSX.Element => {
  const { click, oops, back } = useAavegotchiSound();

  const items = useMemo(() => buildLodgeInstallations(), [invTick]);

  const handlePointerDown = (item: LodgeInstallCard) => {
    if (!item.quantity) {
      oops();
      return;
    }
    click();
    const brush = item.itemId as LodgeFurnitureBrush;
    onSelectBrush(placeBrush === brush ? null : brush);
  };

  const handleExit = () => {
    back();
    onExit();
  };

  return (
    <>
      <div className="content">
        <p className="store-inv-hint">Broadcaster — craft via Recipe Book → Crafting Table, then place here</p>
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
