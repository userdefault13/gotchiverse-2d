import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import {
  enterLodgeMap,
  leaveLodgeMap,
  applyLodgeSceneLayout,
  setLodgeSceneBuildState,
  setLodgeSceneCallbacks,
} from 'helpers/lodge.scene.helper';
import {
  LodgeLayout,
  LodgeFurniturePiece,
  LodgeListingBind,
  loadLodgeLayout,
  saveLodgeLayout,
  serializeLodgeLayout,
  parseLodgeLayoutJson,
  placeLodgeFurniture,
  removeLodgeFurniture,
  bindListingToShelf,
  furnitureAt,
  makeDemoListing,
  isShelfItemId,
  isCashierItemId,
  isConsoleItemId,
  isTerminalItemId,
  isBroadcasterItemId,
  upgradeConsoleFurniture,
  upgradeCashierFurniture,
  CONSOLE_ITEM_ID,
  buildRandomFloorMap,
  ensureLodgeFloor,
  setFloorTile,
  LODGE_BASE_SHADE_IDS,
  lodgeInteriorFloorKeys,
  lodgeStructureAt,
} from 'helpers/lodge.layout.helper';
import { consoleLevelFromItemId } from 'helpers/console.installation.helper';
import { useUser } from 'contexts/UserContext';
import {
  subscribeLodgeLayout,
  seedLodgeLayout,
  publishLodgeLayout,
} from 'helpers/colyseus.lodge';
import styles from './styles';
import { LodgeBuildHud } from '../../lodgeBuildHud';
import type { LodgeFurnitureBrush } from '../../lodgeBuildHud/LodgeInventory';

type PlaceBrush = LodgeFurnitureBrush | null;

export const LodgeModal = (): JSX.Element => {
  const [{ lodgeState, lodgeCart, lodgeShelfModal, consoleState, broadcasterState }, uiDispatch] = useUI();
  const [{ inventory }] = useUser();
  const { back, click } = useAavegotchiSound();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LodgeLayout | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placeBrush, setPlaceBrush] = useState<PlaceBrush>(null);
  const [floorBrush, setFloorBrush] = useState<number | null>(null);
  const [pendingPlace, setPendingPlace] = useState<{ tx: number; ty: number } | null>(null);
  const [invTick, setInvTick] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [bindForm, setBindForm] = useState<LodgeListingBind | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const layoutRef = useRef<LodgeLayout | null>(null);
  const buildRef = useRef({
    buildMode: false,
    placeBrush: null as PlaceBrush,
    floorBrush: null as number | null,
    pendingPlace: null as { tx: number; ty: number } | null,
  });

  const open = Boolean(lodgeState?.open);
  const installationId = lodgeState?.installationId;
  const isOwner = Boolean(lodgeState?.isOwner);
  const buildMode = Boolean(lodgeState?.buildMode && isOwner);

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
    setInvTick((n) => n + 1);
  };

  const applyLayout = useCallback(
    (next: LodgeLayout, publish: boolean) => {
      const saved = saveLodgeLayout(next);
      layoutRef.current = saved;
      setLayout(saved);
      applyLodgeSceneLayout(saved);
      if (publish) publishLodgeLayout(serializeLodgeLayout(saved));
    },
    [],
  );

  const withFloor = (next: LodgeLayout): LodgeLayout =>
    ensureLodgeFloor(next, lodgeInteriorFloorKeys());

  const handleClose = useCallback(async () => {
    back();
    await leaveLodgeMap();
    setPlaceBrush(null);
    setFloorBrush(null);
    setPendingPlace(null);
    setShowCart(false);
    setBindForm(null);
    setLayout(null);
    layoutRef.current = null;
    uiDispatch({ type: 'UPDATE_LODGE_CART', lodgeCart: [] });
    uiDispatch({ type: 'UPDATE_LODGE_SHELF_MODAL', lodgeShelfModal: { open: false } });
    uiDispatch({
      type: 'UPDATE_CONSOLE_MODAL',
      consoleState: { open: false, furnitureId: undefined, installationId: undefined },
    });
    uiDispatch({
      type: 'UPDATE_BROADCASTER_MODAL',
      broadcasterState: { open: false, furnitureId: undefined, lodgeId: undefined, streamUrl: undefined },
    });
    uiDispatch({
      type: 'UPDATE_LODGE_MODAL',
      lodgeState: { open: false, installationId: undefined, isOwner: false, buildMode: false },
    });
  }, [back, uiDispatch]);

  const openShelf = useCallback(
    (piece: LodgeFurniturePiece) => {
      if (!isShelfItemId(piece.itemId)) return;
      click();
      setSelectedId(piece.id);
      setBindForm(piece.listing ? { ...piece.listing } : isOwner ? makeDemoListing(1) : null);
      uiDispatch({
        type: 'UPDATE_LODGE_SHELF_MODAL',
        lodgeShelfModal: { open: true, shelfId: piece.id, isOwner },
      });
    },
    [click, isOwner, uiDispatch],
  );

  const openConsole = useCallback(
    (piece: LodgeFurniturePiece) => {
      if (!isConsoleItemId(piece.itemId) || !installationId) return;
      click();
      setSelectedId(piece.id);
      uiDispatch({
        type: 'UPDATE_CONSOLE_MODAL',
        consoleState: {
          open: true,
          furnitureId: piece.id,
          installationId: piece.id,
          lodgeId: installationId,
          itemId: piece.itemId,
          loadedTitles: piece.loadedTitles || [],
          isOwner,
        },
      });
    },
    [click, installationId, isOwner, uiDispatch],
  );

  const openBroadcaster = useCallback(
    (piece: LodgeFurniturePiece) => {
      if (!isBroadcasterItemId(piece.itemId) || !installationId) return;
      click();
      setSelectedId(piece.id);
      uiDispatch({
        type: 'UPDATE_BROADCASTER_MODAL',
        broadcasterState: {
          open: true,
          furnitureId: piece.id,
          lodgeId: installationId,
          streamUrl: piece.streamUrl || '',
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

      if (fb != null && lodgeStructureAt(tx, ty) === 'floor') {
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
        if (lodgeStructureAt(tx, ty) !== 'floor') {
          setStatusMsg('Furniture goes on the floor');
          return;
        }
        if (furnitureAt(current, tx, ty)) {
          setStatusMsg('That tile already has furniture');
          return;
        }
        // Pin ghost — Confirm commits the place.
        setPendingPlace({ tx, ty });
        setStatusMsg(`Ready at (${tx}, ${ty}) — hit Confirm`);
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
              : isTerminalItemId(piece.itemId)
                ? 'Selected terminal — Remove to return to bag'
                : isBroadcasterItemId(piece.itemId)
                  ? 'Selected Broadcaster — Remove to return to bag'
                  : 'Selected console — Remove to return to bag',
        );
        return;
      }
      setSelectedId(null);
    },
    [applyLayout, click, installationId, isOwner, walletFloorTiles],
  );

  const handleConfirmPlace = useCallback(() => {
    const current = layoutRef.current;
    const pending = buildRef.current.pendingPlace;
    const pb = buildRef.current.placeBrush;
    if (!current || !installationId || !isOwner || pb == null || !pending) return;
    click();
    const result = placeLodgeFurniture(current, pb, pending.tx, pending.ty);
    setStatusMsg(result.message);
    refreshInv();
    if (result.ok) {
      applyLayout(result.layout, true);
      setPlaceBrush(null);
      setPendingPlace(null);
      buildRef.current.placeBrush = null;
      buildRef.current.pendingPlace = null;
      setLodgeSceneBuildState({
        buildMode: true,
        placeBrush: null,
        floorBrush: buildRef.current.floorBrush,
        pendingPlace: null,
      });
    }
  }, [applyLayout, click, installationId, isOwner]);

  const handleUpgradeFurniture = useCallback(
    (piece: LodgeFurniturePiece) => {
      const current = layoutRef.current;
      if (!current || !isOwner) return;
      click();
      if (isConsoleItemId(piece.itemId)) {
        const r = upgradeConsoleFurniture(current, piece.id);
        setStatusMsg(r.message);
        if (r.ok) {
          applyLayout(r.layout, true);
          refreshInv();
        }
        return;
      }
      if (isCashierItemId(piece.itemId)) {
        const r = upgradeCashierFurniture(current, piece.id);
        setStatusMsg(r.message);
        if (r.ok) {
          applyLayout(r.layout, true);
          refreshInv();
        }
        return;
      }
      setStatusMsg('This lodge installation cannot be upgraded');
    },
    [applyLayout, click, isOwner],
  );

  const handleMoveFurniture = useCallback(
    (piece: LodgeFurniturePiece) => {
      const current = layoutRef.current;
      if (!current || !isOwner) return;
      click();
      const r = removeLodgeFurniture(current, piece.id);
      if (!r.ok) {
        setStatusMsg('Could not pick up furniture');
        return;
      }
      applyLayout(r.layout, true);
      setSelectedId(null);
      setFloorBrush(null);
      setPendingPlace(null);
      const brush = (isConsoleItemId(piece.itemId) ? CONSOLE_ITEM_ID : piece.itemId) as PlaceBrush;
      setPlaceBrush(brush);
      setStatusMsg('Moving — click a floor tile, then Confirm');
      refreshInv();
    },
    [applyLayout, click, isOwner],
  );

  const handleRemoveFurniture = useCallback(
    (piece: LodgeFurniturePiece) => {
      const current = layoutRef.current;
      if (!current || !isOwner) return;
      click();
      const r = removeLodgeFurniture(current, piece.id);
      if (r.ok) {
        applyLayout(r.layout, true);
        setSelectedId(null);
        setStatusMsg('Furniture returned to bag');
        refreshInv();
      } else {
        setStatusMsg('Could not remove furniture');
      }
    },
    [applyLayout, click, isOwner],
  );

  const upgradeFurnitureRef = useRef(handleUpgradeFurniture);
  const moveFurnitureRef = useRef(handleMoveFurniture);
  const removeLodgeFurnitureRef = useRef(handleRemoveFurniture);
  upgradeFurnitureRef.current = handleUpgradeFurniture;
  moveFurnitureRef.current = handleMoveFurniture;
  removeLodgeFurnitureRef.current = handleRemoveFurniture;

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    buildRef.current = { buildMode, placeBrush, floorBrush, pendingPlace };
    setLodgeSceneBuildState({ buildMode, placeBrush, floorBrush, pendingPlace });
  }, [buildMode, placeBrush, floorBrush, pendingPlace]);

  // Sync when PlayHud mint Build Mode button toggles lodgeState.buildMode
  useEffect(() => {
    if (!open || !isOwner) return;
    if (buildMode) {
      refreshInv();
      setStatusMsg((msg) => msg || 'Build mode — craft furniture in Recipe Book (Lodge), then place here');
    } else {
      setPlaceBrush(null);
      setFloorBrush(null);
      setPendingPlace(null);
    }
  }, [buildMode, open, isOwner]);

  useEffect(() => {
    if (!open || !installationId) return;
    let cancelled = false;
    setJoining(true);
    setJoinError(null);
    setSelectedId(null);
    setPlaceBrush(null);
    setFloorBrush(null);
    setPendingPlace(null);
    setShowCart(false);
    setBindForm(null);
    refreshInv();

    const loaded = loadLodgeLayout(installationId);
    const local = withFloor(loaded);
    if (local !== loaded && (!loaded.floor || !Object.keys(loaded.floor).length)) {
      saveLodgeLayout(local);
    }
    setLayout(local);
    layoutRef.current = local;

    const callbacks = {
      onInteractShelf: (piece: LodgeFurniturePiece) => openShelf(piece),
      onInteractCashier: () => {
        setShowCart(true);
        setStatusMsg('Cashier — review cart. Checkout (escrow) lands in phase 1c.');
      },
      onInteractConsole: (piece: LodgeFurniturePiece) => openConsole(piece),
      onInteractTerminal: () => {
        setStatusMsg('Terminal — lodge owner desk. Concierge SaaS wiring comes next.');
      },
      onInteractBroadcaster: (piece: LodgeFurniturePiece) => openBroadcaster(piece),
      onBuildTileClick: (tx: number, ty: number) => handleBuildTileClick(tx, ty),
      onLeaveDoor: () => {
        void handleClose();
      },
      onSelectFurniture: (piece: LodgeFurniturePiece | null) => {
        setSelectedId(piece?.id || null);
      },
      onUpgradeFurniture: (piece: LodgeFurniturePiece) => upgradeFurnitureRef.current(piece),
      onMoveFurniture: (piece: LodgeFurniturePiece) => moveFurnitureRef.current(piece),
      onRemoveFurniture: (piece: LodgeFurniturePiece) => removeLodgeFurnitureRef.current(piece),
    };

    void (async () => {
      const result = await enterLodgeMap({
        lodgeId: installationId,
        ownerAddress: lodgeState?.ownerAddress,
        cartridgeId: lodgeState?.cartridgeId,
        layout: local,
        callbacks,
      });
      if (cancelled) return;
      setJoining(false);
      if (!result.ok) {
        setJoinError(result.error || 'Could not enter lodge.');
        return;
      }
      setLodgeSceneCallbacks(callbacks);
      // Merge remote layout if room already had one
      seedLodgeLayout(serializeLodgeLayout(local));
    })();

    const unsubLayout = subscribeLodgeLayout((json) => {
      if (!json || !installationId) return;
      const parsed = withFloor(parseLodgeLayoutJson(json, installationId));
      layoutRef.current = parsed;
      setLayout(parsed);
      applyLodgeSceneLayout(parsed);
    });

    return () => {
      cancelled = true;
      unsubLayout();
      void leaveLodgeMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enter once per open/install
  }, [open, installationId]);

  useEffect(() => {
    if (!open || !installationId) return;
    if (!consoleState?.open && !broadcasterState?.open) {
      const next = loadLodgeLayout(installationId);
      layoutRef.current = next;
      setLayout(next);
      applyLodgeSceneLayout(next);
      refreshInv();
    }
  }, [
    open,
    installationId,
    consoleState?.open,
    consoleState?.itemId,
    consoleState?.loadedTitles,
    broadcasterState?.open,
    broadcasterState?.streamUrl,
  ]);

  const setLodgeBuildMode = (next: boolean) => {
    click();
    if (!next) {
      setPlaceBrush(null);
      setFloorBrush(null);
      setPendingPlace(null);
      setStatusMsg(null);
    } else {
      refreshInv();
      setStatusMsg('Build mode — craft furniture in Recipe Book (Lodge), then place here');
    }
    uiDispatch({
      type: 'UPDATE_LODGE_MODAL',
      lodgeState: {
        ...lodgeState,
        open: true,
        installationId,
        isOwner,
        buildMode: next,
      },
    });
  };

  const handleRemoveSelected = () => {
    if (!layout || !selectedId || !isOwner) return;
    const r = removeLodgeFurniture(layout, selectedId);
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
      { ...layout, floor: buildRandomFloorMap(lodgeInteriorFloorKeys()) },
      true,
    );
    setStatusMsg(`Floor randomized from ${LODGE_BASE_SHADE_IDS.length} greyscale base shades`);
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
      uiDispatch({ type: 'UPDATE_LODGE_SHELF_MODAL', lodgeShelfModal: { open: false } });
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
    const piece = layout?.furniture.find((f) => f.id === lodgeShelfModal.shelfId || f.id === selectedId);
    const listing = piece?.listing;
    if (!piece || !listing) {
      setStatusMsg('No listing bound to this shelf');
      return;
    }
    const existing = lodgeCart.find((l) => l.shelfId === piece.id);
    const next = existing
      ? lodgeCart.map((l) => (l.shelfId === piece.id ? { ...l, quantity: l.quantity + 1 } : l))
      : [
          ...lodgeCart,
          {
            shelfId: piece.id,
            listingId: listing.listingId,
            title: listing.title,
            price: listing.price,
            currency: listing.currency,
            quantity: 1,
          },
        ];
    uiDispatch({ type: 'UPDATE_LODGE_CART', lodgeCart: next });
    setStatusMsg(`Added ${listing.title} to cart`);
    setShowCart(true);
    click();
  };

  const handleCartQty = (shelfId: string, quantity: number) => {
    const next =
      quantity <= 0
        ? lodgeCart.filter((l) => l.shelfId !== shelfId)
        : lodgeCart.map((l) => (l.shelfId === shelfId ? { ...l, quantity } : l));
    uiDispatch({ type: 'UPDATE_LODGE_CART', lodgeCart: next });
  };

  const cartTotal = lodgeCart.reduce((sum, l) => sum + l.price * l.quantity, 0);

  if (!open) return null;

  const shelfModalOpen = Boolean(lodgeShelfModal?.open);
  const activeShelf = layout?.furniture.find((f) => f.id === (lodgeShelfModal.shelfId || selectedId));

  return (
    <>
      <div className={`lodge-hud${buildMode ? ' build-active' : ''}`} aria-label="Lodge HUD">
        {joining || joinError || (statusMsg && buildMode) ? (
          <div className="lodge-hud-top hud-panel minimal">
            {joining ? <span>Entering lodge…</span> : null}
            {joinError ? <span className="err">{joinError}</span> : null}
            {statusMsg && buildMode ? <span className="build-status">{statusMsg}</span> : null}
          </div>
        ) : null}

        {statusMsg && !buildMode ? <p className="status hud-panel">{statusMsg}</p> : null}

        {showCart && !buildMode ? (
          <div className="cart-panel hud-panel">
            <h3>Cart</h3>
            {!lodgeCart.length ? <p className="hint">Empty — walk to a shelf and press E / Enter.</p> : null}
            <ul>
              {lodgeCart.map((line) => (
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

      {isOwner && buildMode ? (
        <LodgeBuildHud
          placeBrush={placeBrush}
          floorBrush={floorBrush}
          invTick={invTick}
          selectedId={selectedId}
          pendingPlace={pendingPlace}
          walletFloorTiles={walletFloorTiles}
          onSelectBrush={(id) => {
            setFloorBrush(null);
            setPendingPlace(null);
            setPlaceBrush(id);
            if (id == null) {
              setStatusMsg(null);
              return;
            }
            if (isTerminalItemId(id)) {
              setStatusMsg('Terminal selected — click a floor tile, then Confirm');
            } else if (isBroadcasterItemId(id)) {
              setStatusMsg('Broadcaster selected — click a floor tile, then Confirm');
            } else if (isShelfItemId(id)) {
              setStatusMsg('Shelf selected — click a floor tile, then Confirm');
            } else if (isCashierItemId(id)) {
              setStatusMsg('Cashier selected — click a floor tile, then Confirm');
            } else {
              setStatusMsg('Console selected — click a floor tile, then Confirm');
            }
          }}
          onSelectFloor={(tileId) => {
            setPlaceBrush(null);
            setPendingPlace(null);
            setFloorBrush(tileId);
            setStatusMsg(tileId != null ? `Floor brush #${tileId} — click a floor tile` : null);
          }}
          onRandomizeFloor={handleRandomizeFloor}
          onConfirmPlace={handleConfirmPlace}
          onRemoveSelected={handleRemoveSelected}
          canBindListing={Boolean(layout?.furniture.some((f) => f.id === selectedId && isShelfItemId(f.itemId)))}
          onBindListing={() => {
            const piece = layout?.furniture.find((f) => f.id === selectedId);
            if (piece) openShelf(piece);
          }}
          onExit={() => setLodgeBuildMode(false)}
        />
      ) : null}

      <Modal
        title={
          activeShelf
            ? isConsoleItemId(activeShelf.itemId)
              ? `Console L${consoleLevelFromItemId(activeShelf.itemId)}`
              : activeShelf.listing?.title || 'Shelf'
            : 'Shelf'
        }
        open={shelfModalOpen}
        onClose={() => uiDispatch({ type: 'UPDATE_LODGE_SHELF_MODAL', lodgeShelfModal: { open: false } })}
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
