import styles from './styles';
import { useUser } from 'contexts/UserContext';
import { SoftCText } from 'components/UI/widgets';
import { installationImageSrc } from 'helpers/cartridgePaarcel.helper';

export const InstallationInventoryGallery = (): JSX.Element => {
  const [{ installationInventory, parcelInventory }] = useUser();
  const items = (installationInventory || []).filter((i) => !i.equippedToParcelId);

  const parcelName = (id: string | null | undefined) => {
    if (!id) return null;
    const p = (parcelInventory || []).find((row) => row.id === id);
    return p ? `cPaarcel #${p.realmTokenId}` : id;
  };

  return (
    <>
      <div className="install-gallery">
        <h2 className="gallery-title">
          <SoftCText>cInstallations</SoftCText>
        </h2>
        <p className="gallery-caption">
          Unequipped cartridge bag (installs + cTiles). Equipped copies live on cPaarcels.
        </p>
        <div className="gotchi-list-container">
          <div className="gotchi-list-inner scrollable">
            {items.length === 0 ? (
              <p className="empty">
                No unequipped cInstallations yet. Craft soft installs / cTiles, or mint from wallet.
              </p>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`install-card kind-${item.kind}`}>
                  <div
                    className="install-thumb"
                    style={{
                      backgroundImage: `url(${installationImageSrc(item.itemTypeId, item.kind)})`,
                    }}
                  />
                  <p className="install-name">{item.name}</p>
                  <p className="install-meta">
                    {item.kind} · #{item.itemTypeId}
                  </p>
                  <p className="install-source">{item.source || 'import'}</p>
                  <p className="install-equip">
                    {item.equippedToParcelId
                      ? `On ${parcelName(item.equippedToParcelId)}`
                      : 'Unequipped — ready for a cPaarcel'}
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
