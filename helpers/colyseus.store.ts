import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';

type StoreRemotePlayer = {
  sessionId: string;
  gotchiId: string;
  name: string;
  x: number;
  y: number;
};

type StoreRoomState = {
  storeId: string;
  cartridgeId: string;
  ownerAddress: string;
  interiorW: number;
  interiorH: number;
  layoutJson: string;
  players: {
    forEach: (cb: (p: StoreRemotePlayer, sessionId: string) => void) => void;
    size?: number;
    onAdd?: (cb: (p: StoreRemotePlayer, sessionId: string) => void) => void;
    onRemove?: (cb: (p: StoreRemotePlayer, sessionId: string) => void) => void;
  };
  onChange?: (cb: () => void) => void;
};

let storeClient: Client | null = null;
let storeRoom: Room<StoreRoomState> | null = null;
let occupancyListeners = new Set<(n: number) => void>();

function endpoint(): string {
  return (
    getRealmUrlSync() ||
    process.env.NEXT_PUBLIC_COLYSEUS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:2567'
  ).replace(/\/$/, '');
}

function countPlayers(room: Room<StoreRoomState> | null): number {
  if (!room?.state?.players) return 0;
  let n = 0;
  room.state.players.forEach(() => {
    n += 1;
  });
  return n;
}

function notifyOccupancy() {
  const n = countPlayers(storeRoom);
  occupancyListeners.forEach((cb) => cb(n));
}

export type JoinStoreOpts = {
  storeId: string;
  cartridgeId?: string | null;
  ownerAddress?: string | null;
};

/** Secondary Colyseus room — stays in citaadel while shopping. */
export async function joinStoreRoom(opts: JoinStoreOpts): Promise<Room<StoreRoomState> | null> {
  const selected = Players.selectedPlayer;
  if (!selected?.id) {
    console.warn('joinStoreRoom: no selected player');
    return null;
  }
  const token =
    selected.authToken ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (!token) {
    console.warn('joinStoreRoom: missing authToken');
    return null;
  }

  await leaveStoreRoom();

  try {
    await resolveRealmBaseUrl();
  } catch (e) {
    console.warn('joinStoreRoom: realm URL resolve failed', e);
  }

  storeClient = new Client(endpoint());
  const cartridgeId =
    opts.cartridgeId ||
    (typeof GlobalState !== 'undefined' ? GlobalState.USER?.state?.cartridgeId : null) ||
    '';

  try {
    storeRoom = await storeClient.joinOrCreate('store', {
      token,
      gotchiId: String(selected.id),
      name: selected.name || `Gotchi #${selected.id}`,
      storeId: String(opts.storeId),
      cartridgeId: String(cartridgeId || ''),
      ownerAddress: String(opts.ownerAddress || '').toLowerCase(),
    });

    storeRoom.state.players.onAdd = () => notifyOccupancy();
    storeRoom.state.players.onRemove = () => notifyOccupancy();
    storeRoom.onLeave(() => {
      storeRoom = null;
      notifyOccupancy();
    });
    notifyOccupancy();
    return storeRoom;
  } catch (e) {
    console.warn('joinStoreRoom failed', e);
    storeRoom = null;
    notifyOccupancy();
    return null;
  }
}

export async function leaveStoreRoom(): Promise<void> {
  if (!storeRoom) return;
  try {
    storeRoom.send('store.leave');
  } catch {
    /* ignore */
  }
  try {
    await storeRoom.leave(true);
  } catch {
    /* ignore */
  }
  storeRoom = null;
  notifyOccupancy();
}

export function getStoreRoom(): Room<StoreRoomState> | null {
  return storeRoom;
}

export function getStoreOccupancy(): number {
  return countPlayers(storeRoom);
}

export function subscribeStoreOccupancy(cb: (n: number) => void): () => void {
  occupancyListeners.add(cb);
  cb(countPlayers(storeRoom));
  return () => {
    occupancyListeners.delete(cb);
  };
}

export function sendStoreMove(x: number, y: number): void {
  if (!storeRoom) return;
  storeRoom.send('move', { x: Math.round(x), y: Math.round(y) });
}

export function seedStoreLayout(layoutJson: string): void {
  if (!storeRoom || !layoutJson) return;
  storeRoom.send('store.layout.seed', { layoutJson });
}

export function publishStoreLayout(layoutJson: string): void {
  if (!storeRoom || !layoutJson) return;
  storeRoom.send('store.layout.update', { layoutJson });
}

export function getStoreLayoutJson(): string {
  return String(storeRoom?.state?.layoutJson || '');
}

export function subscribeStoreLayout(cb: (layoutJson: string) => void): () => void {
  if (!storeRoom) {
    cb('');
    return () => undefined;
  }
  const room = storeRoom;
  const push = () => cb(String(room.state?.layoutJson || ''));
  push();
  const onMsg = (msg: { layoutJson?: string }) => {
    if (msg?.layoutJson) cb(String(msg.layoutJson));
  };
  room.onMessage('store.layout.changed', onMsg);
  const unbindChange =
    typeof room.state?.onChange === 'function'
      ? (() => {
          room.state.onChange(push);
          return () => undefined;
        })()
      : undefined;
  const poll = setInterval(push, 500);
  return () => {
    clearInterval(poll);
    try {
      room.onMessage('store.layout.changed', () => undefined);
    } catch {
      /* ignore */
    }
    void unbindChange;
  };
}
