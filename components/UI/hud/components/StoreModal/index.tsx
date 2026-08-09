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
  StoreLayout,
  StoreFurniturePiece,
  StoreListingBind,
  HolderLayout,
  loadStoreLayout,
  saveStoreLayout,
  serializeLayout,
  parseLayoutJson,
  placeFurniture,
  removeFurniture,
  bindListingToShelf,
  configureRackShelf,
  furnitureAt,
  makeDemoListing,
  isShelfItemId,
  isCashierItemId,
  isConsoleItemId,
  isTerminalItemId,
  isRackShelfKind,
  normalizeShelfPiece,
  pieceListedSlots,
  shelfDisplayName,
  upgradeConsoleFurniture,
  upgradeCashierFurniture,
  CONSOLE_ITEM_ID,
  buildRandomFloorMap,
  ensureStoreFloor,
  setFloorTile,
  STORE_BASE_SHADE_IDS,
  storeInteriorFloorKeys,
  storeStructureAt,
} from 'helpers/store.layout.helper';
import { useUser } from 'contexts/UserContext';
import {
  subscribeStoreLayout,
  seedStoreLayout,
  publishStoreLayout,
} from 'helpers/colyseus.store';
import styles from './styles';
import { StoreBuildHud } from '../../storeBuildHud';
import type { StoreFurnitureBrush } from '../../storeBuildHud/StoreInventory';

type PlaceBrush = StoreFurnitureBrush | null;

export const StoreModal = (): JSX.Element => {
  const [{ storeState, storeCart, storeShelfModal, consoleState }, uiDispatch] = useUI();
  const [{ inventory }] = useUser();
  const { back, click } = useAavegotchiSound();
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [layout, setLayout] = useState<StoreLayout | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placeBrush, setPlaceBrush] = useState<PlaceBrush>(null);
  const [floorBrush, setFloorBrush] = useState<number | null>(null);
  const [pendingPlace, setPendingPlace] = useState<{ tx: number; ty: number } | null>(null);
  const [invTick, setInvTick] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [bindForm, setBindForm] = useState<StoreListingBind | null>(null);
  const [bindSlotId, setBindSlotId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const layoutRef = useRef<StoreLayout | null>(null);
  const buildRef = useRef({
    buildMode: false,
    placeBrush: null as PlaceBrush,
    floorBrush: null as number | null,
    pendingPlace: null as { tx: number; ty: number } | null,
  });

  const open = Boolean(storeState?.open);
  const installationId = storeState?.installationId;
  const isOwner = Boolean(storeState?.isOwner);
  const buildMode = Boolean(storeState?.buildMode && isOwner);

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
    setPlaceBrush(null);
    setFloorBrush(null);
    setPendingPlace(null);
    setShowCart(false);
    setBindForm(null);
    setBindSlotId(null);
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
      storeState: { open: false, installationId: undefined, isOwner: false, buildMode: false },
    });
  }, [back, uiDispatch]);

  const openShelf = useCallback(
    (piece: StoreFurniturePiece, slotId?: string) => {
      if (!isShelfItemId(piece.itemId)) return;
      click();
      const normalized = normalizeShelfPiece(piece);
      setSelectedId(piece.id);
      const focusSlot =
        (slotId && normalized.slots?.find((s) => s.id === slotId)) ||
        normalized.slots?.find((s) => s.listing) ||
        normalized.slots?.[0];
      setBindSlotId(focusSlot?.id || null);
      setBindForm(
        focusSlot?.listing
          ? { ...focusSlot.listing }
          : isOwner
            ? makeDemoListing(1)
            : null,
      );
      uiDispatch({
        type: 'UPDATE_STORE_SHELF_MODAL',
        storeShelfModal: { open: true, shelfId: piece.id, slotId: focusSlot?.id, isOwner },
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
            ? `Selected ${shelfDisplayName(piece.itemId)} — bind listing or Remove`
            : isCashierItemId(piece.itemId)
              ? 'Selected cashier — Remove to return to bag'
              : isTerminalItemId(piece.itemId)
                ? 'Selected terminal — Remove to return to bag'
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
    const result = placeFurniture(current, pb, pending.tx, pending.ty);
    setStatusMsg(result.message);
    refreshInv();
    if (result.ok) {
      applyLayout(result.layout, true);
      setPlaceBrush(null);
      setPendingPlace(null);
      buildRef.current.placeBrush = null;
      buildRef.current.pendingPlace = null;
      setStoreSceneBuildState({
        buildMode: true,
        placeBrush: null,
        floorBrush: buildRef.current.floorBrush,
        pendingPlace: null,
      });
    }
  }, [applyLayout, click, installationId, isOwner]);

  const handleUpgradeFurniture = useCallback(
    (piece: StoreFurniturePiece) => {
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
      setStatusMsg('This store installation cannot be upgraded');
    },
    [applyLayout, click, isOwner],
  );

  const handleMoveFurniture = useCallback(
    (piece: StoreFurniturePiece) => {
      const current = layoutRef.current;
      if (!current || !isOwner) return;
      click();
      const r = removeFurniture(current, piece.id);
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
    (piece: StoreFurniturePiece) => {
      const current = layoutRef.current;
      if (!current || !isOwner) return;
      click();
      const r = removeFurniture(current, piece.id);
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
  const removeFurnitureRef = useRef(handleRemoveFurniture);
  upgradeFurnitureRef.current = handleUpgradeFurniture;
  moveFurnitureRef.current = handleMoveFurniture;
  removeFurnitureRef.current = handleRemoveFurniture;

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    buildRef.current = { buildMode, placeBrush, floorBrush, pendingPlace };
    setStoreSceneBuildState({ buildMode, placeBrush, floorBrush, pendingPlace });
  }, [buildMode, placeBrush, floorBrush, pendingPlace]);

  // Sync when PlayHud mint Build Mode button toggles storeState.buildMode
  useEffect(() => {
    if (!open || !isOwner) return;
    if (buildMode) {
      refreshInv();
      setStatusMsg((msg) => msg || 'Build mode — craft furniture in Recipe Book (Store), then place here');
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

    const loaded = loadStoreLayout(installationId);
    const local = withFloor(loaded);
    if (local !== loaded && (!loaded.floor || !Object.keys(loaded.floor).length)) {
      saveStoreLayout(local);
    }
    setLayout(local);
    layoutRef.current = local;

    const callbacks = {
      onInteractShelf: (piece: StoreFurniturePiece, slotId?: string) => openShelf(piece, slotId),
      onInteractCashier: () => {
        setShowCart(true);
        setStatusMsg('Cashier — review cart. Checkout (escrow) lands in phase 1c.');
      },
      onInteractConsole: (piece: StoreFurniturePiece) => openConsole(piece),
      onInteractTerminal: () => {
        setStatusMsg('Terminal — store owner desk. Concierge SaaS wiring comes next.');
      },
      onBuildTileClick: (tx: number, ty: number) => handleBuildTileClick(tx, ty),
      onLeaveDoor: () => {
        void handleClose();
      },
      onSelectFurniture: (piece: StoreFurniturePiece | null) => {
        setSelectedId(piece?.id || null);
      },
      onUpgradeFurniture: (piece: StoreFurniturePiece) => upgradeFurnitureRef.current(piece),
      onMoveFurniture: (piece: StoreFurniturePiece) => moveFurnitureRef.current(piece),
      onRemoveFurniture: (piece: StoreFurniturePiece) => removeFurnitureRef.current(piece),
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

    const unsubLayout = subscribeStoreLayout((json) => {
      if (!json || !installationId) return;
      const parsed = withFloor(parseLayoutJson(json, installationId));
      layoutRef.current = parsed;
      setLayout(parsed);
      applyStoreSceneLayout(parsed);
    });

    return () => {
      cancelled = true;
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
    if (!next) {
      setPlaceBrush(null);
      setFloorBrush(null);
      setPendingPlace(null);
      setStatusMsg(null);
    } else {
      refreshInv();
      setStatusMsg('Build mode — craft furniture in Recipe Book (Store), then place here');
    }
    uiDispatch({
      type: 'UPDATE_STORE_MODAL',
      storeState: {
        ...storeState,
        open: true,
        installationId,
        isOwner,
        buildMode: next,
      },
    });
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
    if (!layout || !selectedId || !bindForm || !isOwner || !bindSlotId) return;
    if (!bindForm.listingId.trim() || !bindForm.title.trim() || !(bindForm.price > 0)) {
      setStatusMsg('Listing needs id, title, and price > 0');
      return;
    }
    const r = bindListingToShelf(
      layout,
      selectedId,
      {
        ...bindForm,
        listingId: bindForm.listingId.trim(),
        title: bindForm.title.trim(),
        description: bindForm.description || '',
        currency: 'sim_credit',
        chainId: Number(bindForm.chainId) || 8453,
        price: Number(bindForm.price),
      },
      bindSlotId,
    );
    setStatusMsg(r.message);
    if (r.ok) {
      applyLayout(r.layout, true);
    }
  };

  const handleBindClear = () => {
    if (!layout || !selectedId || !isOwner || !bindSlotId) return;
    const r = bindListingToShelf(layout, selectedId, null, bindSlotId);
    setStatusMsg(r.message);
    if (r.ok) {
      applyLayout(r.layout, true);
      setBindForm(makeDemoListing(1));
    }
  };

  const handleRackConfigure = (shelfCount: 1 | 2 | 3, holderLayout: HolderLayout) => {
    if (!layout || !selectedId || !isOwner) return;
    const r = configureRackShelf(layout, selectedId, shelfCount, holderLayout);
    setStatusMsg(r.message);
    if (r.ok) {
      applyLayout(r.layout, true);
      const piece = r.layout.furniture.find((f) => f.id === selectedId);
      if (piece) {
        const n = normalizeShelfPiece(piece);
        const slot = n.slots?.[0];
        setBindSlotId(slot?.id || null);
        setBindForm(slot?.listing ? { ...slot.listing } : makeDemoListing(1));
      }
    }
  };

  const handleAddToCart = (slotId?: string) => {
    const piece = layout?.furniture.find((f) => f.id === storeShelfModal.shelfId || f.id === selectedId);
    if (!piece || !isShelfItemId(piece.itemId)) {
      setStatusMsg('No listing bound to this shelf');
      return;
    }
    const normalized = normalizeShelfPiece(piece);
    const slot =
      (slotId && normalized.slots?.find((s) => s.id === slotId)) ||
      normalized.slots?.find((s) => s.id === storeShelfModal.slotId) ||
      normalized.slots?.find((s) => s.listing);
    const listing = slot?.listing;
    if (!listing || !slot) {
      setStatusMsg('No listing bound to this holder');
      return;
    }
    const cartKey = `${piece.id}:${slot.id}`;
    const existing = storeCart.find((l) => `${l.shelfId}:${l.slotId || ''}` === cartKey || (l.shelfId === piece.id && l.slotId === slot.id));
    const next = existing
      ? storeCart.map((l) =>
          l.shelfId === piece.id && l.slotId === slot.id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      : [
          ...storeCart,
          {
            shelfId: piece.id,
            slotId: slot.id,
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

  const handleCartQty = (shelfId: string, quantity: number, slotId?: string) => {
    const next =
      quantity <= 0
        ? storeCart.filter((l) => !(l.shelfId === shelfId && (slotId ? l.slotId === slotId : true)))
        : storeCart.map((l) =>
            l.shelfId === shelfId && (slotId ? l.slotId === slotId : !l.slotId || l.slotId === slotId)
              ? { ...l, quantity }
              : l,
          );
    uiDispatch({ type: 'UPDATE_STORE_CART', storeCart: next });
  };

  const cartTotal = storeCart.reduce((sum, l) => sum + l.price * l.quantity, 0);

  if (!open) return null;

  const shelfModalOpen = Boolean(storeShelfModal?.open);
  const activeShelfRaw = layout?.furniture.find((f) => f.id === (storeShelfModal.shelfId || selectedId));
  const activeShelf =
    activeShelfRaw && isShelfItemId(activeShelfRaw.itemId) ? normalizeShelfPiece(activeShelfRaw) : null;
  const listedProducts = activeShelf ? pieceListedSlots(activeShelf) : [];
  const isRack = activeShelf ? isRackShelfKind(activeShelf.kind) : false;

  return (
    <>
      <div className={`store-hud${buildMode ? ' build-active' : ''}`} aria-label="Store HUD">
        {joining || joinError || (statusMsg && buildMode) ? (
          <div className="store-hud-top hud-panel minimal">
            {joining ? <span>Entering store…</span> : null}
            {joinError ? <span className="err">{joinError}</span> : null}
            {statusMsg && buildMode ? <span className="build-status">{statusMsg}</span> : null}
          </div>
        ) : null}

        {statusMsg && !buildMode ? <p className="status hud-panel">{statusMsg}</p> : null}

        {showCart && !buildMode ? (
          <div className="cart-panel hud-panel">
            <h3>Cart</h3>
            {!storeCart.length ? <p className="hint">Empty — walk to a shelf and press E / Enter.</p> : null}
            <ul>
              {storeCart.map((line) => (
                <li key={`${line.shelfId}:${line.slotId || 'legacy'}`}>
                  <div>
                    <strong>{line.title}</strong>
                    <div className="muted">
                      {line.price} SIM × {line.quantity}
                    </div>
                  </div>
                  <div className="qty">
                    <Button size={2} onClick={() => handleCartQty(line.shelfId, line.quantity - 1, line.slotId)}>
                      −
                    </Button>
                    <span>{line.quantity}</span>
                    <Button size={2} onClick={() => handleCartQty(line.shelfId, line.quantity + 1, line.slotId)}>
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
        <StoreBuildHud
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
            } else if (isShelfItemId(id)) {
              setStatusMsg(`${shelfDisplayName(id)} selected — click a floor tile, then Confirm`);
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
            if (piece) {
              setStoreBuildMode(false);
              setTimeout(() => openShelf(piece), 0);
            }
          }}
          onExit={() => setStoreBuildMode(false)}
        />
      ) : null}

      <Modal
        title={activeShelf ? shelfDisplayName(activeShelf.itemId) : 'Shelf'}
        open={shelfModalOpen}
        onClose={() => uiDispatch({ type: 'UPDATE_STORE_SHELF_MODAL', storeShelfModal: { open: false } })}
        light
      >
        <div className="shelf-modal">
          <h4>Products for sale</h4>
          {listedProducts.length ? (
            <ul className="product-list">
              {listedProducts.map((slot) => (
                <li
                  key={slot.id}
                  className={bindSlotId === slot.id ? 'active' : ''}
                  onClick={() => {
                    setBindSlotId(slot.id);
                    if (slot.listing) setBindForm({ ...slot.listing });
                  }}
                >
                  <div>
                    <strong>{slot.listing!.title}</strong>
                    <div className="muted">
                      {slot.listing!.description || `${slot.size.toUpperCase()} holder`}
                    </div>
                    <div>
                      <strong>
                        {slot.listing!.price} {slot.listing!.currency}
                      </strong>
                    </div>
                  </div>
                  <Button size={2} onClick={() => handleAddToCart(slot.id)}>
                    Add to cart
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No products on this shelf yet.</p>
          )}

          {isOwner && activeShelf ? (
            <div className="bind-form">
              {isRack ? (
                <div className="rack-config">
                  <h4>Rack setup</h4>
                  <div className="bind-actions">
                    {([1, 2, 3] as const).map((n) => (
                      <Button
                        key={n}
                        size={2}
                        secondary={activeShelf.shelfCount !== n}
                        onClick={() => handleRackConfigure(n, activeShelf.holderLayout || '3sm')}
                      >
                        {n} shelf{n > 1 ? 'ves' : ''}
                      </Button>
                    ))}
                  </div>
                  <div className="bind-actions">
                    {(['3sm', '2md', '1lg'] as HolderLayout[]).map((layoutOpt) => (
                      <Button
                        key={layoutOpt}
                        size={2}
                        secondary={activeShelf.holderLayout !== layoutOpt}
                        onClick={() =>
                          handleRackConfigure((activeShelf.shelfCount || 1) as 1 | 2 | 3, layoutOpt)
                        }
                      >
                        {layoutOpt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <h4>Bind listing to holder</h4>
              <div className="slot-picker">
                {(activeShelf.slots || []).map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`slot-chip${bindSlotId === slot.id ? ' active' : ''}`}
                    onClick={() => {
                      setBindSlotId(slot.id);
                      setBindForm(slot.listing ? { ...slot.listing } : makeDemoListing(1));
                    }}
                  >
                    {slot.size.toUpperCase()}
                    {slot.listing ? ' ●' : ''}
                    {isRack ? ` T${slot.tier + 1}` : ''}
                  </button>
                ))}
              </div>
              {bindForm ? (
                <>
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
                    Description
                    <input
                      value={bindForm.description || ''}
                      onChange={(e) => setBindForm({ ...bindForm, description: e.target.value })}
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
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>

      <style jsx>{styles}</style>
    </>
  );
};
