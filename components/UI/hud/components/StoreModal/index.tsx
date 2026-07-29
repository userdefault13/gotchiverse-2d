import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'components/UI/component';
import { Button } from 'components/UI/elements';
import { useUI } from 'contexts/UIContexts';
import useAavegotchiSound from 'hooks/useAavegotchiSound';
import InputController from 'components/controllers/inputController';
import { toggleFollowGotchi } from 'helpers/phaser.helper';
import {
  joinStoreRoom,
  leaveStoreRoom,
  subscribeStoreOccupancy,
  getStoreRoom,
  seedStoreLayout,
  publishStoreLayout,
  subscribeStoreLayout,
  sendStoreMove,
} from 'helpers/colyseus.store';
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
  STORE_GRID,
  floorKey,
  floorCellUrl,
  buildRandomFloorMap,
  ensureStoreFloor,
  setFloorTile,
  STORE_BASE_SHADE_IDS,
} from 'helpers/store.layout.helper';
import { consoleLevelFromItemId } from 'helpers/console.installation.helper';
import { useUser } from 'contexts/UserContext';
import Players from 'components/phaser/Players';
import { fetchAavegotchiURL } from 'helpers/gotchi.helper';
import styles from './styles';

const STORE_MAX = 8;
const GRID = STORE_GRID;
/** Bottom-center door opening (2 tiles). */
const DOOR_TX = [7, 8] as const;
/** Top-wall storefront windows. */
const WINDOW_TX = [2, 3, 4, 11, 12, 13] as const;
/** Spawn just inside the front door. */
const SPAWN_TX = 7;
const SPAWN_TY = GRID - 2;

type FurnitureBrush = typeof SHELF_ITEM_ID | typeof CASHIER_ITEM_ID | typeof CONSOLE_ITEM_ID;
type PlaceBrush = FurnitureBrush | null;
type StructureKind = 'floor' | 'wall' | 'door' | 'window';
type StorePlayerTile = {
  sessionId: string;
  tx: number;
  ty: number;
  name: string;
  gotchiId: string;
  isSelf: boolean;
};

const structureAt = (tx: number, ty: number): StructureKind => {
  const onEdge = tx === 0 || tx === GRID - 1 || ty === 0 || ty === GRID - 1;
  if (ty === GRID - 1 && (DOOR_TX as readonly number[]).includes(tx)) return 'door';
  if (ty === 0 && (WINDOW_TX as readonly number[]).includes(tx)) return 'window';
  if (onEdge) return 'wall';
  return 'floor';
};

const isWalkable = (tx: number, ty: number): boolean => {
  if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) return false;
  const kind = structureAt(tx, ty);
  return kind === 'floor' || kind === 'door';
};

const interiorFloorKeys = (): string[] => {
  const keys: string[] = [];
  for (let ty = 0; ty < GRID; ty += 1) {
    for (let tx = 0; tx < GRID; tx += 1) {
      if (structureAt(tx, ty) === 'floor') keys.push(floorKey(tx, ty));
    }
  }
  return keys;
};

const toWorld = (tx: number, ty: number) => ({ x: tx * 64 + 32, y: ty * 64 + 32 });

export const StoreModal = (): JSX.Element => {
  const [{ storeState, storeCart, storeShelfModal, consoleState }, uiDispatch] = useUI();
  const [{ inventory }] = useUser();
  const { back, click } = useAavegotchiSound();
  const [occupancy, setOccupancy] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [playerTiles, setPlayerTiles] = useState<StorePlayerTile[]>([]);
  const [selfSessionId, setSelfSessionId] = useState<string | null>(null);
  const [selfPos, setSelfPos] = useState({ tx: SPAWN_TX, ty: SPAWN_TY });
  const [selfSpriteUrl, setSelfSpriteUrl] = useState<string | null>(null);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
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

  const applyLayout = (next: StoreLayout, publish: boolean) => {
    const saved = saveStoreLayout(next);
    setLayout(saved);
    if (publish) publishStoreLayout(serializeLayout(saved));
  };

  const withFloor = (next: StoreLayout): StoreLayout => ensureStoreFloor(next, interiorFloorKeys());

  const handleRandomizeFloor = () => {
    if (!layout || !isOwner) return;
    click();
    const next = {
      ...layout,
      floor: buildRandomFloorMap(interiorFloorKeys()),
    };
    applyLayout(next, true);
    setStatusMsg(`Floor randomized from ${STORE_BASE_SHADE_IDS.length} greyscale base shades`);
  };

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

    void (async () => {
      const room = await joinStoreRoom({
        storeId: installationId,
        ownerAddress: storeState?.ownerAddress,
        cartridgeId: storeState?.cartridgeId,
      });
      if (cancelled) return;
      setJoining(false);
      if (!room) {
        setJoinError('Could not join store (full or auth failed).');
        return;
      }
      setSelfSessionId(room.sessionId);
      const spawn = toWorld(SPAWN_TX, SPAWN_TY);
      setSelfPos({ tx: SPAWN_TX, ty: SPAWN_TY });
      sendStoreMove(spawn.x, spawn.y);
      seedStoreLayout(serializeLayout(local));
      const remote = String(room.state?.layoutJson || '');
      if (remote) {
        const parsed = withFloor(parseLayoutJson(remote, installationId));
        if (parsed.furniture.length || parsed.updatedAt >= local.updatedAt || (parsed.floor && Object.keys(parsed.floor).length)) {
          setLayout(parsed);
          if (isOwner) saveStoreLayout(parsed);
        }
      }
    })();

    const unsubOcc = subscribeStoreOccupancy(setOccupancy);
    const unsubLayout = subscribeStoreLayout((json) => {
      if (!json || !installationId) return;
      const parsed = withFloor(parseLayoutJson(json, installationId));
      setLayout(parsed);
    });

    return () => {
      cancelled = true;
      unsubOcc();
      unsubLayout();
      void leaveStoreRoom();
    };
  }, [open, installationId]);

  useEffect(() => {
    if (!open) {
      setSelfSpriteUrl(null);
      return;
    }
    let cancelled = false;
    const selected = Players.selectedPlayer;
    if (!selected) return;
    void (async () => {
      try {
        const urls = await fetchAavegotchiURL(selected);
        if (!cancelled && urls?.url) setSelfSpriteUrl(urls.url);
      } catch (e) {
        console.warn('StoreModal: failed to load gotchi sprite', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const room = getStoreRoom();
      if (!room?.state?.players) {
        setPlayerTiles([]);
        return;
      }
      if (room.sessionId) setSelfSessionId(room.sessionId);
      const tiles: StorePlayerTile[] = [];
      room.state.players.forEach((p, sessionId) => {
        const isSelf = sessionId === room.sessionId;
        // Local position is keyboard/click authoritative — don't rubber-band from room sync.
        if (isSelf) return;
        const tx = Math.max(0, Math.min(GRID - 1, Math.floor((p.x || 0) / 64)));
        const ty = Math.max(0, Math.min(GRID - 1, Math.floor((p.y || 0) / 64)));
        tiles.push({
          sessionId,
          tx,
          ty,
          name: p.name || sessionId,
          gotchiId: String(p.gotchiId || ''),
          isSelf: false,
        });
      });
      setPlayerTiles(tiles);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [open, occupancy]);

  useEffect(() => {
    if (!open || !installationId) return;
    if (!consoleState?.open) {
      setLayout(loadStoreLayout(installationId));
      refreshInv();
    }
  }, [open, installationId, consoleState?.open, consoleState?.itemId, consoleState?.loadedTitles]);

  const openShelf = (piece: StoreFurniturePiece) => {
    if (!isShelfItemId(piece.itemId)) return;
    click();
    setSelectedId(piece.id);
    setBindForm(
      piece.listing
        ? { ...piece.listing }
        : isOwner
          ? makeDemoListing(1)
          : null,
    );
    uiDispatch({
      type: 'UPDATE_STORE_SHELF_MODAL',
      storeShelfModal: { open: true, shelfId: piece.id, isOwner },
    });
  };

  const openConsole = (piece: StoreFurniturePiece) => {
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
  };

  const moveSelf = (dtx: number, dty: number) => {
    const nextTx = selfPos.tx + dtx;
    const nextTy = selfPos.ty + dty;
    if (!isWalkable(nextTx, nextTy)) return;
    if (dtx < 0) setFacing('left');
    if (dtx > 0) setFacing('right');
    setSelfPos({ tx: nextTx, ty: nextTy });
    const w = toWorld(nextTx, nextTy);
    sendStoreMove(w.x, w.y);
    const piece = layout ? furnitureAt(layout, nextTx, nextTy) : null;
    if (piece) setSelectedId(piece.id);
  };

  const interactHere = () => {
    const underfoot = layout ? furnitureAt(layout, selfPos.tx, selfPos.ty) : null;
    const piece = underfoot || layout?.furniture.find((f) => f.id === selectedId);
    if (!piece) return;
    if (isShelfItemId(piece.itemId)) openShelf(piece);
    else if (isCashierItemId(piece.itemId)) {
      setShowCart(true);
      setStatusMsg('Cashier — review cart. Checkout (escrow) lands in phase 1c.');
    } else if (isConsoleItemId(piece.itemId)) openConsole(piece);
  };

  // Arrows / WASD move; Enter or E interact with furniture underfoot / selected.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        moveSelf(0, -1);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        moveSelf(0, 1);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveSelf(-1, 0);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveSelf(1, 0);
        return;
      }
      if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        interactHere();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selectedId, layout, selfPos]);

  const playersByTile = useMemo(() => {
    const map = new Map<string, StorePlayerTile[]>();
    const merged: StorePlayerTile[] = [
      ...playerTiles,
      {
        sessionId: selfSessionId || 'self',
        tx: selfPos.tx,
        ty: selfPos.ty,
        name: Players.selectedPlayer?.name || 'You',
        gotchiId: String(Players.selectedPlayer?.id || ''),
        isSelf: true,
      },
    ];
    merged.forEach((p) => {
      const key = `${p.tx},${p.ty}`;
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    });
    return map;
  }, [playerTiles, selfPos, selfSessionId]);

  const furnitureByTile = useMemo(() => {
    const map = new Map<string, StoreFurniturePiece>();
    layout?.furniture.forEach((f) => map.set(`${f.x},${f.y}`, f));
    return map;
  }, [layout]);

  const setStoreBuildMode = (next: boolean) => {
    click();
    setBuildMode(next);
    if (!next) {
      setPlaceBrush(null);
      setFloorBrush(null);
      setStatusMsg(null);
    } else {
      refreshInv();
      setStatusMsg('Build mode — place furniture & paint floor tiles');
    }
  };

  const handleTileClick = (tx: number, ty: number) => {
    if (!layout || !installationId) return;
    click();

    // Owner build mode: craft/place/paint (parcel build-mode analogue).
    if (isOwner && buildMode) {
      if (floorBrush != null && structureAt(tx, ty) === 'floor') {
        const owned = walletFloorTiles.some((t) => t.itemId === floorBrush);
        if (!owned) {
          setStatusMsg('You do not own that tile in your wallet');
          return;
        }
        applyLayout(setFloorTile(layout, tx, ty, floorBrush, 'wallet'), true);
        setStatusMsg(`Placed wallet tile #${floorBrush}`);
        return;
      }

      if (placeBrush != null) {
        if (structureAt(tx, ty) !== 'floor') {
          setStatusMsg('Furniture goes on the floor');
          return;
        }
        const result = placeFurniture(layout, placeBrush, tx, ty);
        setStatusMsg(result.message);
        refreshInv();
        if (result.ok) {
          applyLayout(result.layout, true);
          setPlaceBrush(null);
        }
        return;
      }

      const piece = furnitureAt(layout, tx, ty);
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
      return;
    }

    if (isWalkable(tx, ty)) {
      if (tx < selfPos.tx) setFacing('left');
      if (tx > selfPos.tx) setFacing('right');
      setSelfPos({ tx, ty });
      sendStoreMove(tx * 64 + 32, ty * 64 + 32);
    }

    const piece = furnitureAt(layout, tx, ty);
    if (!piece) {
      setSelectedId(null);
      return;
    }
    setSelectedId(piece.id);
    if (isShelfItemId(piece.itemId)) openShelf(piece);
    if (isCashierItemId(piece.itemId)) {
      setShowCart(true);
      setStatusMsg('Cashier — review cart. Checkout (escrow) lands in phase 1c.');
    }
    if (isConsoleItemId(piece.itemId)) openConsole(piece);
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

  const handleClose = async () => {
    back();
    await leaveStoreRoom();
    InputController.updateDisableKeyboard(false);
    toggleFollowGotchi(true);
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
  };

  if (!open) return null;

  const shelfModalOpen = Boolean(storeShelfModal?.open);
  const activeShelf = layout?.furniture.find((f) => f.id === (storeShelfModal.shelfId || selectedId));

  return (
    <>
      <Modal
        title="Store"
        open={open}
        onClose={() => {
          if (buildMode) {
            setStoreBuildMode(false);
            return;
          }
          void handleClose();
        }}
        light
        scrollable
      >
        <div className="store-inner">
          <div className="store-meta">
            <span>
              Shoppers {occupancy}/{STORE_MAX}
            </span>
            {isOwner ? <span className="owner-badge">Owner</span> : null}
            {isOwner && buildMode ? <span className="owner-badge build">Build Mode</span> : null}
            {joining ? <span>Joining…</span> : null}
            {joinError ? <span className="err">{joinError}</span> : null}
            <span className="cart-chip" onClick={() => setShowCart((v) => !v)}>
              Cart {storeCart.reduce((n, l) => n + l.quantity, 0)}
            </span>
          </div>

          {isOwner ? (
            <div className="owner-bar">
              <Button
                size={2}
                secondary={!buildMode}
                onClick={() => setStoreBuildMode(!buildMode)}
              >
                {buildMode ? 'Exit Build Mode' : 'Build Mode'}
              </Button>
              {buildMode ? (
                <>
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
                </>
              ) : null}
            </div>
          ) : null}

          {isOwner && buildMode ? (
            <div className="floor-tile-bar">
              <span className="floor-tile-label">Wallet tiles</span>
              {!walletFloorTiles.length ? (
                <span className="muted">None in wallet — random greyscale floor still works</span>
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
          ) : null}

          {statusMsg ? <p className="status">{statusMsg}</p> : null}

          <div className={`store-body${buildMode ? ' is-build' : ''}`}>
            <div className={`store-grid${buildMode ? ' is-build' : ''}`} aria-label="16 by 16 store floor">
              {Array.from({ length: GRID * GRID }).map((_, i) => {
                const tx = i % GRID;
                const ty = Math.floor(i / GRID);
                const occupants = playersByTile.get(`${tx},${ty}`) || [];
                const who = occupants[0];
                const furn = furnitureByTile.get(`${tx},${ty}`);
                const isSelected = furn && furn.id === selectedId;
                const structure = structureAt(tx, ty);
                const floorCell = layout?.floor?.[floorKey(tx, ty)];
                const floorUrl = structure === 'floor' ? floorCellUrl(floorCell) : null;
                let kind = '';
                if (furn && isShelfItemId(furn.itemId)) kind = furn.listing ? 'shelf-bound' : 'shelf';
                if (furn && isCashierItemId(furn.itemId)) kind = 'cashier';
                if (furn && isConsoleItemId(furn.itemId)) kind = 'console';
                const placing = Boolean(buildMode && (placeBrush || floorBrush));
                const selfHere = occupants.some((p) => p.isSelf);
                return (
                  <button
                    type="button"
                    key={`${tx}-${ty}`}
                    className={`cell ${structure}${occupants.length ? ' occupied' : ''}${kind ? ` ${kind}` : ''}${
                      isSelected ? ' selected' : ''
                    }${placing ? ' placeable' : ''}${buildMode ? ' build-mode' : ''}${
                      floorBrush && structure === 'floor' ? ' floor-paint' : ''
                    }${selfHere ? ' self-here' : ''}`}
                    style={
                      floorUrl && !kind
                        ? { backgroundImage: `url(${floorUrl})` }
                        : undefined
                    }
                    title={
                      furn
                        ? isConsoleItemId(furn.itemId)
                          ? `Console L${consoleLevelFromItemId(furn.itemId)} · ${(furn.loadedTitles || []).length} titles`
                          : `${isShelfItemId(furn.itemId) ? 'Shelf' : 'Cashier'}${furn.listing ? `: ${furn.listing.title}` : ''}`
                        : who
                          ? `${who.name} @ ${tx},${ty}`
                          : floorCell
                            ? `Floor tile #${floorCell.tileId} (${floorCell.art}) ${tx},${ty}`
                            : `${structure} ${tx},${ty}`
                    }
                    onClick={() => handleTileClick(tx, ty)}
                  >
                    {occupants.map((p) => (
                      <span
                        key={p.sessionId}
                        className={`player-sprite${p.isSelf ? ' self' : ' remote'}${
                          p.isSelf && facing === 'left' ? ' face-left' : ''
                        }`}
                        style={
                          p.isSelf && selfSpriteUrl
                            ? { backgroundImage: `url(${selfSpriteUrl})` }
                            : undefined
                        }
                        aria-label={p.name}
                      />
                    ))}
                  </button>
                );
              })}
            </div>

            {showCart ? (
              <div className="cart-panel">
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
                <div className="cart-total">Total: {cartTotal} SIM</div>
                <Button
                  onClick={() =>
                    setStatusMsg('Checkout escrow + cReceipt is phase 1c — cart is ready.')
                  }
                  disabled={!storeCart.length}
                >
                  Checkout (soon)
                </Button>
              </div>
            ) : null}
          </div>

          <p className="hint">
            {buildMode
              ? 'Build mode — place furniture / paint tiles · Esc exits'
              : (
                <>
                  <kbd>WASD</kbd> / arrows move · <kbd>E</kbd> / Enter interact
                  {isOwner ? ' · Build Mode to decorate' : ''}
                </>
              )}
            {placeBrush
              ? ` · Placing ${
                  placeBrush === SHELF_ITEM_ID ? 'Shelf' : placeBrush === CASHIER_ITEM_ID ? 'Cashier' : 'Console'
                }`
              : ''}
            {floorBrush != null ? ` · Painting floor with wallet tile #${floorBrush}` : ''}
          </p>
          <div className="actions">
            <Button secondary onClick={() => setShowCart((v) => !v)}>
              {showCart ? 'Hide cart' : 'Show cart'}
            </Button>
            <Button onClick={() => void handleClose()}>Leave Store</Button>
          </div>
        </div>
      </Modal>

      {shelfModalOpen && activeShelf ? (
        <Modal
          title={isOwner ? 'Bind listing' : 'Shelf'}
          open={shelfModalOpen}
          onClose={() => uiDispatch({ type: 'UPDATE_STORE_SHELF_MODAL', storeShelfModal: { open: false } })}
          light
        >
          <div className="shelf-inner">
            {isOwner && bindForm ? (
              <>
                <label>
                  Listing ID
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
                  <textarea
                    rows={3}
                    value={bindForm.description}
                    onChange={(e) => setBindForm({ ...bindForm, description: e.target.value })}
                  />
                </label>
                <label>
                  Price (SIM)
                  <input
                    type="number"
                    min={1}
                    value={bindForm.price}
                    onChange={(e) => setBindForm({ ...bindForm, price: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Chain ID
                  <input
                    type="number"
                    value={bindForm.chainId}
                    onChange={(e) => setBindForm({ ...bindForm, chainId: Number(e.target.value) })}
                  />
                </label>
                <div className="actions">
                  <Button size={2} secondary onClick={() => setBindForm(makeDemoListing(Date.now() % 9 || 1))}>
                    Fill demo
                  </Button>
                  <Button size={2} secondary onClick={handleBindClear}>
                    Clear
                  </Button>
                  <Button onClick={handleBindSave}>Save bind</Button>
                </div>
              </>
            ) : activeShelf.listing ? (
              <>
                <h3>{activeShelf.listing.title}</h3>
                <p>{activeShelf.listing.description}</p>
                <p className="price">
                  {activeShelf.listing.price} {activeShelf.listing.currency}
                </p>
                <p className="muted">Listing {activeShelf.listing.listingId}</p>
                <div className="actions">
                  <Button onClick={handleAddToCart}>Add to cart</Button>
                </div>
              </>
            ) : (
              <p className="hint">This shelf has no listing yet.</p>
            )}
          </div>
        </Modal>
      ) : null}

      <style jsx>{styles}</style>
    </>
  );
};
