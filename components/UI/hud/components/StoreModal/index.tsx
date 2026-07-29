import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  enterStoreMap,
  leaveStoreMap,
  applyStoreSceneLayout,
  setStoreSceneBuildState,
  setStoreSceneCallbacks,
} from 'helpers/store.scene.helper';
import {
  SHELF_ITEM_ID,
  CASHIER_ITEM_ID,
  CONSOLE_ITEM_ID,
  StoreLayout,
  StoreFurniturePiece,
  StoreListingBind,
  loadStoreLayout,
  saveStoreLayout,
  serializeLayout,
  parseLayoutJson,
  craftStoreFurniture,
  placeFurniture,
  removeFurniture,
  bindListingToShelf,
  furnitureAt,
  getFurnitureQty,
  getConsoleBagCount,
  makeDemoListing,
  isShelfItemId,
  isCashierItemId,
  isConsoleItemId,
  buildRandomFloorMap,
  ensureStoreFloor,
  setFloorTile,
  STORE_BASE_SHADE_IDS,
  storeInteriorFloorKeys,
  storeStructureAt,
} from 'helpers/store.layout.helper';
import { consoleLevelFromItemId } from 'helpers/console.installation.helper';
import { useUser } from 'contexts/UserContext';
import {
  subscribeStoreOccupancy,
  subscribeStoreLayout,
  seedStoreLayout,
  publishStoreLayout,
} from 'helpers/colyseus.store';
import styles from './styles';

const STORE_MAX = 8;

type FurnitureBrush = typeof SHELF_ITEM_ID | typeof CASHIER_ITEM_ID | typeof CONSOLE_ITEM_ID;
type PlaceBrush = FurnitureBrush | null;

export const StoreModal = (): JSX.Element => {
  const [{ storeState, storeCart, storeShelfModal, consoleState }, uiDispatch] = useUI();
  const [{ inventory }] = useUser();
  const { back, click } = useAavegotchiSound();
  const [occupancy, setOccupancy] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [buildMode, setBuildMode] = useState(false);
  const [layout, setLayout] = useState<StoreLayout | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placeBrush, setPlaceBrush] = useState<PlaceBrush>(null);
  const [floorBrush, setFloorBrush] = useState<number | null>(null);
  const [shelfQty, setShelfQty] = useState(0);
  const [cashierQty, setCashierQty] = useState(0);
  const [consoleQty, setConsoleQty] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [bindForm, setBindForm] = useState<StoreListingBind | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const layoutRef = useRef<StoreLayout | null>(null);
  const buildRef = useRef({ buildMode: false, placeBrush: null as PlaceBrush, floorBrush: null as number | null });

  const open = Boolean(storeState?.open);
  const installationId = storeState?.installationId;
  const isOwner = Boolean(storeState?.isOwner);

  const walletFloorTiles = useMemo(() => {
    return (inventory || [])
      .filter((item) => item.type === 'TILE' && Number(item.quantity) > 0 && Number(item.itemId) > 0)
      .map((item) => ({
        itemId: Number(item.itemId),
        name: item.name || `Tile ${item.itemId}`,
        quantity: Number(item.quantity),
      }))
      .sort((a, b) => a.itemId - b.itemId);
  }, [inventory]);

  const refreshInv = () => {
    setShelfQty(getFurnitureQty(SHELF_ITEM_ID));
    setCashierQty(getFurnitureQty(CASHIER_ITEM_ID));
    setConsoleQty(getConsoleBagCount());
  };

  const applyLayout = useCallback(
    (next: StoreLayout, publish: boolean) => {
      const saved = saveStoreLayout(next);
      layoutRef.current = saved;
      setLayout(saved);
      applyStoreSceneLayout(saved);
      if (publish) publishStoreLayout(serializeLayout(saved));
    },
    [],
  );

  const withFloor = (next: StoreLayout): StoreLayout =>
    ensureStoreFloor(next, storeInteriorFloorKeys());

  const handleClose = useCallback(async () => {
    back();
    await leaveStoreMap();
    setBuildMode(false);
    setPlaceBrush(null);
    setFloorBrush(null);
    setShowCart(false);
    setBindForm(null);
    setLayout(null);
    layoutRef.current = null;
    uiDispatch({ type: 'UPDATE_STORE_CART', storeCart: [] });
    uiDispatch({ type: 'UPDATE_STORE_SHELF_MODAL', storeShelfModal: { open: false } });
    uiDispatch({
      type: 'UPDATE_CONSOLE_MODAL',
      consoleState: { open: false, furnitureId: undefined, installationId: undefined },
    });
    uiDispatch({
      type: 'UPDATE_STORE_MODAL',
      storeState: { open: false, installationId: undefined, isOwner: false },
    });
  }, [back, uiDispatch]);

  const openShelf = useCallback(
    (piece: StoreFurniturePiece) => {
      if (!isShelfItemId(piece.itemId)) return;
      click();
      setSelectedId(piece.id);
      setBindForm(piece.listing ? { ...piece.listing } : isOwner ? makeDemoListing(1) : null);
      uiDispatch({
        type: 'UPDATE_STORE_SHELF_MODAL',
        storeShelfModal: { open: true, shelfId: piece.id, isOwner },
      });
    },
    [click, isOwner, uiDispatch],
  );

  const openConsole = useCallback(
    (piece: StoreFurniturePiece) => {
      if (!isConsoleItemId(piece.itemId) || !installationId) return;
      click();
      setSelectedId(piece.id);
      uiDispatch({
        type: 'UPDATE_CONSOLE_MODAL',
        consoleState: {
          open: true,
          furnitureId: piece.id,
          installationId: piece.id,
          storeId: installationId,
          itemId: piece.itemId,
          loadedTitles: piece.loadedTitles || [],
          isOwner,
        },
      });
    },
    [click, installationId, isOwner, uiDispatch],
  );

  const handleBuildTileClick = useCallback(
    (tx: number, ty: number) => {
      const current = layoutRef.current;
      if (!current || !installationId || !isOwner || !buildRef.current.buildMode) return;
      click();
      const { floorBrush: fb, placeBrush: pb } = buildRef.current;

      if (fb != null && storeStructureAt(tx, ty) === 'floor') {
        const owned = walletFloorTiles.some((t) => t.itemId === fb);
        if (!owned) {
          setStatusMsg('You do not own that tile in your wallet');
          return;
        }
        applyLayout(setFloorTile(current, tx, ty, fb, 'wallet'), true);
        setStatusMsg(`Placed wallet tile #${fb}`);
        return;
      }

      if (pb != null) {
        if (storeStructureAt(tx, ty) !== 'floor') {
          setStatusMsg('Furniture goes on the floor');
          return;
        }
        const result = placeFurniture(current, pb, tx, ty);
        setStatusMsg(result.message);
        refreshInv();
        if (result.ok) {
          applyLayout(result.layout, true);
          setPlaceBrush(null);
          buildRef.current.placeBrush = null;
          setStoreSceneBuildState({
            buildMode: true,
            placeBrush: null,
            floorBrush: buildRef.current.floorBrush,
          });
        }
        return;
      }

      const piece = furnitureAt(current, tx, ty);
      if (piece) {
        setSelectedId(piece.id);
        setStatusMsg(
          isShelfItemId(piece.itemId)
            ? 'Selected shelf — bind listing or Remove'
            : isCashierItemId(piece.itemId)
              ? 'Selected cashier — Remove to return to bag'
              : 'Selected console — Remove to return to bag',
        );
        return;
      }
      setSelectedId(null);
    },
    [applyLayout, click, installationId, isOwner, walletFloorTiles],
  );

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    buildRef.current = { buildMode, placeBrush, floorBrush };
    setStoreSceneBuildState({ buildMode, placeBrush, floorBrush });
  }, [buildMode, placeBrush, floorBrush]);

  useEffect(() => {
    if (!open || !installationId) return;
    let cancelled = false;
    setJoining(true);
    setJoinError(null);
    setSelectedId(null);
    setPlaceBrush(null);
    setFloorBrush(null);
    setBuildMode(false);
    setShowCart(false);
    setBindForm(null);
    refreshInv();

    const loaded = loadStoreLayout(installationId);
    const local = withFloor(loaded);
    if (local !== loaded && (!loaded.floor || !Object.keys(loaded.floor).length)) {
      saveStoreLayout(local);
    }
    setLayout(local);
    layoutRef.current = local;

    const callbacks = {
      onInteractShelf: (piece: StoreFurniturePiece) => openShelf(piece),
      onInteractCashier: () => {
        setShowCart(true);
        setStatusMsg('Cashier — review cart. Checkout (escrow) lands in phase 1c.');
      },
      onInteractConsole: (piece: StoreFurniturePiece) => openConsole(piece),
      onBuildTileClick: (tx: number, ty: number) => handleBuildTileClick(tx, ty),
      onLeaveDoor: () => {
        void handleClose();
      },
      onSelectFurniture: (piece: StoreFurniturePiece | null) => {
        setSelectedId(piece?.id || null);
      },
    };

    void (async () => {
      const result = await enterStoreMap({
        storeId: installationId,
        ownerAddress: storeState?.ownerAddress,
        cartridgeId: storeState?.cartridgeId,
        layout: local,
        callbacks,
      });
      if (cancelled) return;
      setJoining(false);
      if (!result.ok) {
        setJoinError(result.error || 'Could not enter store.');
        return;
      }
      setStoreSceneCallbacks(callbacks);
      // Merge remote layout if room already had one
      seedStoreLayout(serializeLayout(local));
    })();

    const unsubOcc = subscribeStoreOccupancy(setOccupancy);
    const unsubLayout = subscribeStoreLayout((json) => {
      if (!json || !installationId) return;
      const parsed = withFloor(parseLayoutJson(json, installationId));
      layoutRef.current = parsed;
      setLayout(parsed);
      applyStoreSceneLayout(parsed);
    });

    return () => {
      cancelled = true;
      unsubOcc();
      unsubLayout();
      void leaveStoreMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enter once per open/install
  }, [open, installationId]);

  useEffect(() => {
    if (!open || !installationId) return;
    if (!consoleState?.open) {
      const next = loadStoreLayout(installationId);
      layoutRef.current = next;
      setLayout(next);
      applyStoreSceneLayout(next);
      refreshInv();
    }
  }, [open, installationId, consoleState?.open, consoleState?.itemId, consoleState?.loadedTitles]);

  const setStoreBuildMode = (next: boolean) => {
    click();
    setBuildMode(next);
    if (!next) {
      setPlaceBrush(null);
      setFloorBrush(null);
      setStatusMsg(null);
    } else {
      refreshInv();
      setStatusMsg('Build mode — click tiles in the store to place / paint');
    }
  };

  const handleCraft = (itemId: typeof SHELF_ITEM_ID | typeof CASHIER_ITEM_ID) => {
    const r = craftStoreFurniture(itemId, 1);
    setStatusMsg(r.message);
    refreshInv();
    click();
  };

  const handleRemoveSelected = () => {
    if (!layout || !selectedId || !isOwner) return;
    const r = removeFurniture(layout, selectedId);
    if (r.ok) {
      applyLayout(r.layout, true);
      setSelectedId(null);
      setStatusMsg('Furniture returned to bag');
      refreshInv();
    }
  };

  const handleRandomizeFloor = () => {
    if (!layout || !isOwner) return;
    click();
    applyLayout(
      { ...layout, floor: buildRandomFloorMap(storeInteriorFloorKeys()) },
      true,
    );
    setStatusMsg(`Floor randomized from ${STORE_BASE_SHADE_IDS.length} greyscale base shades`);
  };

  const handleBindSave = () => {
    if (!layout || !selectedId || !bindForm || !isOwner) return;
    if (!bindForm.listingId.trim() || !bindForm.title.trim() || !(bindForm.price > 0)) {
      setStatusMsg('Listing needs id, title, and price > 0');
      return;
    }
    const r = bindListingToShelf(layout, selectedId, {
      ...bindForm,
      listingId: bindForm.listingId.trim(),
      title: bindForm.title.trim(),
      description: bindForm.description || '',
      currency: 'sim_credit',
      chainId: Number(bindForm.chainId) || 8453,
      price: Number(bindForm.price),
    });
    setStatusMsg(r.message);
    if (r.ok) {
      applyLayout(r.layout, true);
      uiDispatch({ type: 'UPDATE_STORE_SHELF_MODAL', storeShelfModal: { open: false } });
    }
  };

  const handleBindClear = () => {
    if (!layout || !selectedId || !isOwner) return;
    const r = bindListingToShelf(layout, selectedId, null);
    setStatusMsg(r.message);
    if (r.ok) {
      applyLayout(r.layout, true);
      setBindForm(makeDemoListing(1));
    }
  };

  const handleAddToCart = () => {
    const piece = layout?.furniture.find((f) => f.id === storeShelfModal.shelfId || f.id === selectedId);
    const listing = piece?.listing;
    if (!piece || !listing) {
      setStatusMsg('No listing bound to this shelf');
      return;
    }
    const existing = storeCart.find((l) => l.shelfId === piece.id);
    const next = existing
      ? storeCart.map((l) => (l.shelfId === piece.id ? { ...l, quantity: l.quantity + 1 } : l))
      : [
          ...storeCart,
          {
            shelfId: piece.id,
            listingId: listing.listingId,
            title: listing.title,
            price: listing.price,
            currency: listing.currency,
            quantity: 1,
          },
        ];
    uiDispatch({ type: 'UPDATE_STORE_CART', storeCart: next });
    setStatusMsg(`Added ${listing.title} to cart`);
    setShowCart(true);
    click();
  };

  const handleCartQty = (shelfId: string, quantity: number) => {
    const next =
      quantity <= 0
        ? storeCart.filter((l) => l.shelfId !== shelfId)
        : storeCart.map((l) => (l.shelfId === shelfId ? { ...l, quantity } : l));
    uiDispatch({ type: 'UPDATE_STORE_CART', storeCart: next });
  };

  const cartTotal = storeCart.reduce((sum, l) => sum + l.price * l.quantity, 0);

  if (!open) return null;

  const shelfModalOpen = Boolean(storeShelfModal?.open);
  const activeShelf = layout?.furniture.find((f) => f.id === (storeShelfModal.shelfId || selectedId));

  return (
    <>
      <div className="store-hud" aria-label="Store HUD">
        <div className="store-hud-top hud-panel">
          <span>
            Shoppers {occupancy}/{STORE_MAX}
          </span>
          {isOwner ? <span className="owner-badge">Owner</span> : null}
          {isOwner && buildMode ? <span className="owner-badge build">Build Mode</span> : null}
          {joining ? <span>Entering store…</span> : null}
          {joinError ? <span className="err">{joinError}</span> : null}
          {isOwner ? (
            <Button size={2} secondary={!buildMode} onClick={() => setStoreBuildMode(!buildMode)}>
              {buildMode ? 'Exit Build Mode' : 'Build Mode'}
            </Button>
          ) : null}
          <span className="cart-chip" onClick={() => setShowCart((v) => !v)}>
            Cart {storeCart.reduce((n, l) => n + l.quantity, 0)}
          </span>
        </div>

        {isOwner && buildMode ? (
          <div className="store-hud-build hud-panel">
            <Button size={2} onClick={() => handleCraft(SHELF_ITEM_ID)}>
              Craft Shelf ({shelfQty})
            </Button>
            <Button size={2} onClick={() => handleCraft(CASHIER_ITEM_ID)}>
              Craft Cashier ({cashierQty})
            </Button>
            <Button
              size={2}
              secondary={placeBrush !== SHELF_ITEM_ID}
              onClick={() => {
                setFloorBrush(null);
                setPlaceBrush(placeBrush === SHELF_ITEM_ID ? null : SHELF_ITEM_ID);
              }}
            >
              Place Shelf
            </Button>
            <Button
              size={2}
              secondary={placeBrush !== CASHIER_ITEM_ID}
              onClick={() => {
                setFloorBrush(null);
                setPlaceBrush(placeBrush === CASHIER_ITEM_ID ? null : CASHIER_ITEM_ID);
              }}
            >
              Place Cashier
            </Button>
            <Button
              size={2}
              secondary={placeBrush !== CONSOLE_ITEM_ID}
              onClick={() => {
                setFloorBrush(null);
                setPlaceBrush(placeBrush === CONSOLE_ITEM_ID ? null : CONSOLE_ITEM_ID);
              }}
              disabled={consoleQty < 1}
            >
              Place Console ({consoleQty})
            </Button>
            <Button size={2} secondary onClick={handleRandomizeFloor}>
              Randomize floor
            </Button>
            {selectedId ? (
              <>
                {layout?.furniture.some((f) => f.id === selectedId && isShelfItemId(f.itemId)) ? (
                  <Button
                    size={2}
                    secondary
                    onClick={() => {
                      const piece = layout?.furniture.find((f) => f.id === selectedId);
                      if (piece) openShelf(piece);
                    }}
                  >
                    Bind listing
                  </Button>
                ) : null}
                <Button size={2} onClick={handleRemoveSelected}>
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
                        setPlaceBrush(null);
                        setFloorBrush(floorBrush === t.itemId ? null : t.itemId);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {statusMsg ? <p className="status hud-panel">{statusMsg}</p> : null}

        <div className="store-hud-bottom hud-panel">
          <p className="hint">WASD / arrows move · E / Enter interact · walk out the door to leave</p>
          <div className="actions">
            <Button size={2} secondary onClick={() => setShowCart(true)}>
              Show cart
            </Button>
            <Button size={2} onClick={() => void handleClose()}>
              Leave Store
            </Button>
          </div>
        </div>

        {showCart ? (
          <div className="cart-panel hud-panel">
            <h3>Cart</h3>
            {!storeCart.length ? <p className="hint">Empty — walk to a shelf and press E / Enter.</p> : null}
            <ul>
              {storeCart.map((line) => (
                <li key={line.shelfId}>
                  <div>
                    <strong>{line.title}</strong>
                    <div className="muted">
                      {line.price} SIM × {line.quantity}
                    </div>
                  </div>
                  <div className="qty">
                    <Button size={2} onClick={() => handleCartQty(line.shelfId, line.quantity - 1)}>
                      −
                    </Button>
                    <span>{line.quantity}</span>
                    <Button size={2} onClick={() => handleCartQty(line.shelfId, line.quantity + 1)}>
                      +
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="total">Total: {cartTotal} SIM</p>
            <Button size={2} secondary onClick={() => setShowCart(false)}>
              Close cart
            </Button>
            <p className="muted">Checkout (escrow) lands in phase 1c.</p>
          </div>
        ) : null}
      </div>

      <Modal
        title={
          activeShelf
            ? isConsoleItemId(activeShelf.itemId)
              ? `Console L${consoleLevelFromItemId(activeShelf.itemId)}`
              : activeShelf.listing?.title || 'Shelf'
            : 'Shelf'
        }
        open={shelfModalOpen}
        onClose={() => uiDispatch({ type: 'UPDATE_STORE_SHELF_MODAL', storeShelfModal: { open: false } })}
        light
      >
        <div className="shelf-modal">
          {activeShelf?.listing ? (
            <>
              <p>{activeShelf.listing.description || 'No description'}</p>
              <p>
                <strong>
                  {activeShelf.listing.price} {activeShelf.listing.currency}
                </strong>
              </p>
              <Button size={2} onClick={handleAddToCart}>
                Add to cart
              </Button>
            </>
          ) : (
            <p className="muted">No listing bound.</p>
          )}
          {isOwner && bindForm ? (
            <div className="bind-form">
              <h4>Bind listing</h4>
              <label>
                Listing id
                <input
                  value={bindForm.listingId}
                  onChange={(e) => setBindForm({ ...bindForm, listingId: e.target.value })}
                />
              </label>
              <label>
                Title
                <input
                  value={bindForm.title}
                  onChange={(e) => setBindForm({ ...bindForm, title: e.target.value })}
                />
              </label>
              <label>
                Price (SIM)
                <input
                  type="number"
                  value={bindForm.price}
                  onChange={(e) => setBindForm({ ...bindForm, price: Number(e.target.value) })}
                />
              </label>
              <div className="bind-actions">
                <Button size={2} onClick={handleBindSave}>
                  Save bind
                </Button>
                <Button size={2} secondary onClick={handleBindClear}>
                  Clear
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <style jsx>{styles}</style>
    </>
  );
};
