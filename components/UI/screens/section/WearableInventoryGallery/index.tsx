import styles from './styles';
import { useUser } from 'contexts/UserContext';
import { slotLabel } from 'helpers/cartridgeWearable.helper';
import { SoftCText, WearableThumbnail } from 'components/UI/widgets';

export const WearableInventoryGallery = (): JSX.Element => {
  const [{ wearableInventory, cartridgeHeroes }] = useUser();
  const items = wearableInventory || [];

  const heroName = (id: string | null | undefined) => {
    if (!id) return null;
    const hero = (cartridgeHeroes || []).find((h) => h.id === id);
    return hero ? `c${String(hero.collateral || '').toUpperCase()}` : id;
  };

  return (
    <>
      <div className="wearable-gallery">
        <h2 className="gallery-title">
          <SoftCText>cWearables</SoftCText>
        </h2>
        <p className="gallery-caption">
          Cartridge inventory (mint &amp; view). Equip and manage on Aarcade.
        </p>
        <div className="gotchi-list-container">
          <div className="gotchi-list-inner scrollable">
            {items.length === 0 ? (
              <p className="empty">No cWearables yet. Mint them from a wallet gotchi&apos;s equip after bind.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`wearable-card rarity-${item.rarity}`}>
                  <WearableThumbnail itemTypeId={item.itemTypeId} name={item.name} size={56} />
                  <p className="wearable-name">{item.name}</p>
                  <p className="wearable-meta">
                    {item.rarity} · {slotLabel(item.slotIndex)}
                  </p>
                  <p className="wearable-source">{item.source || 'import'}</p>
                  <p className="wearable-equip">
                    {item.equippedTo
                      ? `On ${heroName(item.equippedTo)}`
                      : 'Unequipped — ready for any cAavegotchi'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
