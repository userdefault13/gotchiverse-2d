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
  makeDemoListing,
  isShelfItemId,
  isCashierItemId,
} from 'helpers/store.layout.helper';
import styles from './styles';

const STORE_MAX = 8;
const GRID = 16;

type PlaceBrush = typeof SHELF_ITEM_ID | typeof CASHIER_ITEM_ID | null;

export const StoreModal = (): JSX.Element => {
  const [{ storeState, storeCart, storeShelfModal }, uiDispatch] = useUI();
  const { back, click } = useAavegotchiSound();
  const [occupancy, setOccupancy] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [playerTiles, setPlayerTiles] = useState<Array<{ sessionId: string; tx: number; ty: number; name: string }>>([]);
  const [layout, setLayout] = useState<StoreLayout | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placeBrush, setPlaceBrush] = useState<PlaceBrush>(null);
  const [shelfQty, setShelfQty] = useState(0);
  const [cashierQty, setCashierQty] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [bindForm, setBindForm] = useState<StoreListingBind | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const open = Boolean(storeState?.open);
  const installationId = storeState?.installationId;
  const isOwner = Boolean(storeState?.isOwner);

  const refreshInv = () => {
    setShelfQty(getFurnitureQty(SHELF_ITEM_ID));
    setCashierQty(getFurnitureQty(CASHIER_ITEM_ID));
  };

  const applyLayout = (next: StoreLayout, publish: boolean) => {
    const saved = saveStoreLayout(next);
    setLayout(saved);
    if (publish) publishStoreLayout(serializeLayout(saved));
  };

  useEffect(() => {
    if (!open || !installationId) return;
    let cancelled = false;
    setJoining(true);
    setJoinError(null);
    setSelectedId(null);
    setPlaceBrush(null);
    setShowCart(false);
    setBindForm(null);
    refreshInv();

    const local = loadStoreLayout(installationId);
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
      seedStoreLayout(serializeLayout(local));
      const remote = String(room.state?.layoutJson || '');
      if (remote) {
        const parsed = parseLayoutJson(remote, installationId);
        if (parsed.furniture.length || parsed.updatedAt >= local.updatedAt) {
          setLayout(parsed);
          if (isOwner) saveStoreLayout(parsed);
        }
      }
    })();

    const unsubOcc = subscribeStoreOccupancy(setOccupancy);
    const unsubLayout = subscribeStoreLayout((json) => {
      if (!json || !installationId) return;
      const parsed = parseLayoutJson(json, installationId);
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
    if (!open) return;
    const tick = () => {
      const room = getStoreRoom();
      if (!room?.state?.players) {
        setPlayerTiles([]);
        return;
      }
      const tiles: Array<{ sessionId: string; tx: number; ty: number; name: string }> = [];
      room.state.players.forEach((p, sessionId) => {
        const tx = Math.max(0, Math.min(GRID - 1, Math.floor((p.x || 0) / 64)));
        const ty = Math.max(0, Math.min(GRID - 1, Math.floor((p.y || 0) / 64)));
        tiles.push({ sessionId, tx, ty, name: p.name || sessionId });
      });
      setPlayerTiles(tiles);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [open, occupancy]);

  // S = open selected shelf; E = cashier / cart (StoreModal owns keys while phaser keyboard disabled).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const piece = layout?.furniture.find((f) => f.id === selectedId);

      if (e.key === 's' || e.key === 'S') {
        if (piece && isShelfItemId(piece.itemId)) {
          e.preventDefault();
          openShelf(piece);
        }
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        if (piece && isCashierItemId(piece.itemId)) {
          e.preventDefault();
          setShowCart(true);
          setStatusMsg('Cashier — review cart. Checkout (escrow) lands in phase 1c.');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selectedId, layout]);

  const playerByTile = useMemo(() => {
    const map = new Map<string, string>();
    playerTiles.forEach((p) => map.set(`${p.tx},${p.ty}`, p.name));
    return map;
  }, [playerTiles]);

  const furnitureByTile = useMemo(() => {
    const map = new Map<string, StoreFurniturePiece>();
    layout?.furniture.forEach((f) => map.set(`${f.x},${f.y}`, f));
    return map;
  }, [layout]);

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

  const handleTileClick = (tx: number, ty: number) => {
    if (!layout || !installationId) return;
    click();
    sendStoreMove(tx * 64 + 32, ty * 64 + 32);

    if (isOwner && placeBrush != null) {
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
      type: 'UPDATE_STORE_MODAL',
      storeState: { open: false, installationId: undefined, isOwner: false },
    });
  };

  if (!open) return null;

  const shelfModalOpen = Boolean(storeShelfModal?.open);
  const activeShelf = layout?.furniture.find((f) => f.id === (storeShelfModal.shelfId || selectedId));

  return (
    <>
      <Modal title="Store" open={open} onClose={() => void handleClose()} light>
        <div className="store-inner">
          <div className="store-meta">
            <span>
              Shoppers {occupancy}/{STORE_MAX}
            </span>
            {isOwner ? <span className="owner-badge">Owner</span> : null}
            {joining ? <span>Joining…</span> : null}
            {joinError ? <span className="err">{joinError}</span> : null}
            <span className="cart-chip" onClick={() => setShowCart((v) => !v)}>
              Cart {storeCart.reduce((n, l) => n + l.quantity, 0)}
            </span>
          </div>

          {isOwner ? (
            <div className="owner-bar">
              <Button size={2} onClick={() => handleCraft(SHELF_ITEM_ID)}>
                Craft Shelf ({shelfQty})
              </Button>
              <Button size={2} onClick={() => handleCraft(CASHIER_ITEM_ID)}>
                Craft Cashier ({cashierQty})
              </Button>
              <Button
                size={2}
                secondary={placeBrush !== SHELF_ITEM_ID}
                onClick={() => setPlaceBrush(placeBrush === SHELF_ITEM_ID ? null : SHELF_ITEM_ID)}
              >
                Place Shelf
              </Button>
              <Button
                size={2}
                secondary={placeBrush !== CASHIER_ITEM_ID}
                onClick={() => setPlaceBrush(placeBrush === CASHIER_ITEM_ID ? null : CASHIER_ITEM_ID)}
              >
                Place Cashier
              </Button>
              {selectedId ? (
                <Button size={2} onClick={handleRemoveSelected}>
                  Remove selected
                </Button>
              ) : null}
            </div>
          ) : null}

          {statusMsg ? <p className="status">{statusMsg}</p> : null}

          <div className="store-body">
            <div className="store-grid" aria-label="16 by 16 store floor">
              {Array.from({ length: GRID * GRID }).map((_, i) => {
                const tx = i % GRID;
                const ty = Math.floor(i / GRID);
                const who = playerByTile.get(`${tx},${ty}`);
                const furn = furnitureByTile.get(`${tx},${ty}`);
                const isSelected = furn && furn.id === selectedId;
                let kind = '';
                if (furn && isShelfItemId(furn.itemId)) kind = furn.listing ? 'shelf-bound' : 'shelf';
                if (furn && isCashierItemId(furn.itemId)) kind = 'cashier';
                return (
                  <button
                    type="button"
                    key={`${tx}-${ty}`}
                    className={`cell${who ? ' occupied' : ''}${kind ? ` ${kind}` : ''}${isSelected ? ' selected' : ''}${
                      placeBrush ? ' placeable' : ''
                    }`}
                    title={
                      furn
                        ? `${isShelfItemId(furn.itemId) ? 'Shelf' : 'Cashier'}${furn.listing ? `: ${furn.listing.title}` : ''}`
                        : who || `${tx},${ty}`
                    }
                    onClick={() => handleTileClick(tx, ty)}
                  />
                );
              })}
            </div>

            {showCart ? (
              <div className="cart-panel">
                <h3>Cart</h3>
                {!storeCart.length ? <p className="hint">Empty — open a shelf (S) and add a listing.</p> : null}
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
            Click shelf or press <kbd>S</kbd> · Cashier / <kbd>E</kbd> opens cart
            {placeBrush ? ` · Placing ${placeBrush === SHELF_ITEM_ID ? 'Shelf' : 'Cashier'}` : ''}
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
