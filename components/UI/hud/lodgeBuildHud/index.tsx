import { type SyntheticEvent } from 'react';
import styles from './styles';
import { Button } from 'components/UI/elements';
import { IndentedPanel } from 'components/UI/component';
import { Tab } from 'components/UI/elements';
import { HammerIcon } from 'assets';
import { LodgeInventory, LodgeFurnitureBrush } from './LodgeInventory';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import { nudgeLodgeBuildCamera } from 'helpers/lodge.scene.helper';

interface FloorTile {
  itemId: number;
  name: string;
  quantity: number;
}

interface Props {
  placeBrush: LodgeFurnitureBrush | null;
  floorBrush: number | null;
  invTick: number;
  selectedId: string | null;
  pendingPlace: { tx: number; ty: number } | null;
  walletFloorTiles: FloorTile[];
  onSelectBrush: (itemId: LodgeFurnitureBrush | null) => void;
  onSelectFloor: (tileId: number | null) => void;
  onRandomizeFloor: () => void;
  onConfirmPlace: () => void;
  onRemoveSelected: () => void;
  onBindListing?: () => void;
  canBindListing?: boolean;
  onExit: () => void;
}

/** Hot-pink lodge build HUD — inventory tray + floor tools. */
export const LodgeBuildHud = ({
  placeBrush,
  floorBrush,
  invTick,
  selectedId,
  pendingPlace,
  walletFloorTiles,
  onSelectBrush,
  onSelectFloor,
  onRandomizeFloor,
  onConfirmPlace,
  onRemoveSelected,
  onBindListing,
  canBindListing,
  onExit,
}: Props): JSX.Element => {
  const { click } = useAavegotchiSound();
  const placingFurniture = placeBrush != null;

  const blockPropagation = (e: SyntheticEvent) => e.stopPropagation();

  const panMap = (dir: -1 | 1) => {
    click();
    nudgeLodgeBuildCamera(dir);
  };

  return (
    <>
      <div className="lodge-build-root" aria-label="Lodge Build Mode">
        <div className="build-border" />
        <div className="map-pan" onClick={blockPropagation} onMouseDown={blockPropagation}>
          <Button size={2} secondary onClick={() => panMap(1)} title="Shift map left (reveal right tiles)">
            ◀ Map
          </Button>
          <Button size={2} secondary onClick={() => panMap(-1)} title="Shift map right (reveal left tiles)">
            Map ▶
          </Button>
        </div>
        <div className="right-container" onClick={blockPropagation} onMouseDown={blockPropagation}>
          <div className="panel-wrapper">
            <IndentedPanel
              hideSides={{ right: true, bottom: true }}
              borrowedColor
              isSidePanelFrame={true}
              inheritHeight
              title={{ value: 'inventory', fontSize: '4rem' }}
            >
              <div className="sidetray-content inventory">
                <LodgeInventory
                  placeBrush={placeBrush}
                  invTick={invTick}
                  onSelectBrush={onSelectBrush}
                  onExit={onExit}
                />
              </div>
            </IndentedPanel>
            <div className="tab-container">
              <Tab img={HammerIcon} onClick={() => undefined} active={true} />
            </div>
          </div>
        </div>

        {placingFurniture ? (
          <div className="build-toggle" onClick={blockPropagation} onMouseDown={blockPropagation}>
            <div className="batch-msg">
              {pendingPlace ? (
                <>
                  Place at <span className="ok">({pendingPlace.tx}, {pendingPlace.ty})</span>
                </>
              ) : (
                <>Click a floor tile, then Confirm</>
              )}
            </div>
            <Button size={2} disabled={!pendingPlace} onClick={onConfirmPlace}>
              Confirm
            </Button>
          </div>
        ) : (
          <div className="build-tools" onClick={blockPropagation} onMouseDown={blockPropagation}>
            <Button size={2} secondary onClick={onRandomizeFloor}>
              Randomize floor
            </Button>
            {selectedId ? (
              <>
                {canBindListing && onBindListing ? (
                  <Button size={2} secondary onClick={onBindListing}>
                    Bind listing
                  </Button>
                ) : null}
                <Button size={2} onClick={onRemoveSelected}>
                  Remove selected
                </Button>
              </>
            ) : null}
            <div className="floor-tile-bar">
              <span className="floor-tile-label">Wallet tiles</span>
              {!walletFloorTiles.length ? (
                <span className="muted">None in wallet</span>
              ) : (
                <div className="floor-tile-list">
                  {walletFloorTiles.map((t) => (
                    <button
                      type="button"
                      key={t.itemId}
                      className={`floor-tile-chip${floorBrush === t.itemId ? ' active' : ''}`}
                      title={`${t.name} ×${t.quantity}`}
                      style={{ backgroundImage: `url(/images/tiles/Tile_LE_${t.itemId}.png)` }}
                      onClick={() => {
                        click();
                        onSelectFloor(floorBrush === t.itemId ? null : t.itemId);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style jsx>{styles}</style>
    </>
  );
};

export default LodgeBuildHud;
