import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';

type BazaarRemotePlayer = {
  sessionId: string;
  gotchiId: string;
  name: string;
  x: number;
  y: number;
};

type BazaarRoomState = {
  bazaarId: string;
  cartridgeId: string;
  ownerAddress: string;
  interiorW: number;
  interiorH: number;
  layoutJson: string;
  players: {
    forEach: (cb: (p: BazaarRemotePlayer, sessionId: string) => void) => void;
    size?: number;
    onAdd?: (cb: (p: BazaarRemotePlayer, sessionId: string) => void) => void;
    onRemove?: (cb: (p: BazaarRemotePlayer, sessionId: string) => void) => void;
  };
  onChange?: (cb: () => void) => void;
};

let bazaarClient: Client | null = null;
let bazaarRoom: Room<BazaarRoomState> | null = null;
let occupancyListeners = new Set<(n: number) => void>();
let lastJoinError: string | null = null;

function endpoint(): string {
  return (
    getRealmUrlSync() ||
    process.env.NEXT_PUBLIC_COLYSEUS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:2567'
  ).replace(/\/$/, '');
}

function countPlayers(room: Room<BazaarRoomState> | null): number {
  if (!room?.state?.players) return 0;
  let n = 0;
  room.state.players.forEach(() => {
    n += 1;
  });
  return n;
}

function notifyOccupancy() {
  const n = countPlayers(bazaarRoom);
  occupancyListeners.forEach((cb) => cb(n));
}

export type JoinBazaarOpts = {
  bazaarId: string;
  cartridgeId?: string | null;
  ownerAddress?: string | null;
};

/** Secondary Colyseus room — stays in citaadel while shopping the Bazaar. */
export async function joinBazaarRoom(opts: JoinBazaarOpts): Promise<Room<BazaarRoomState> | null> {
  const selected = Players.selectedPlayer;
  if (!selected?.id) {
    console.warn('joinBazaarRoom: no selected player');
    lastJoinError = 'No selected player';
    return null;
  }
  const token =
    selected.authToken ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (!token) {
    console.warn('joinBazaarRoom: missing authToken');
    lastJoinError = 'Missing auth token — re-enter the REALM';
    return null;
  }

  await leaveBazaarRoom();
  lastJoinError = null;

  try {
    await resolveRealmBaseUrl();
  } catch (e) {
    console.warn('joinBazaarRoom: realm URL resolve failed', e);
    lastJoinError = 'Could not reach REALM server';
  }

  bazaarClient = new Client(endpoint());
  const cartridgeId =
    opts.cartridgeId ||
    (typeof GlobalState !== 'undefined' ? GlobalState.USER?.state?.cartridgeId : null) ||
    '';

  try {
    bazaarRoom = await bazaarClient.joinOrCreate('bazaar', {
      token,
      gotchiId: String(selected.id),
      name: selected.name || `Gotchi #${selected.id}`,
      bazaarId: String(opts.bazaarId),
      cartridgeId: String(cartridgeId || ''),
      ownerAddress: String(opts.ownerAddress || '').toLowerCase(),
    });

    bazaarRoom.state.players.onAdd = () => notifyOccupancy();
    bazaarRoom.state.players.onRemove = () => notifyOccupancy();
    bazaarRoom.onLeave(() => {
      bazaarRoom = null;
      notifyOccupancy();
    });
    notifyOccupancy();
    return bazaarRoom;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('joinBazaarRoom failed', e);
    lastJoinError = msg || 'Join failed';
    bazaarRoom = null;
    notifyOccupancy();
    return null;
  }
}

export function getBazaarJoinError(): string | null {
  return lastJoinError;
}

export async function leaveBazaarRoom(): Promise<void> {
  if (!bazaarRoom) return;
  try {
    bazaarRoom.send('bazaar.leave');
  } catch {
    /* ignore */
  }
  try {
    await bazaarRoom.leave(true);
  } catch {
    /* ignore */
  }
  bazaarRoom = null;
  notifyOccupancy();
}

export function getBazaarRoom(): Room<BazaarRoomState> | null {
  return bazaarRoom;
}

export function getBazaarOccupancy(): number {
  return countPlayers(bazaarRoom);
}

export function subscribeBazaarOccupancy(cb: (n: number) => void): () => void {
  occupancyListeners.add(cb);
  cb(countPlayers(bazaarRoom));
  return () => {
    occupancyListeners.delete(cb);
  };
}

export function sendBazaarMove(x: number, y: number): void {
  if (!bazaarRoom) return;
  bazaarRoom.send('move', { x: Math.round(x), y: Math.round(y) });
}

export function seedBazaarLayout(layoutJson: string): void {
  if (!bazaarRoom || !layoutJson) return;
  bazaarRoom.send('bazaar.layout.seed', { layoutJson });
}

export function publishBazaarLayout(layoutJson: string): void {
  if (!bazaarRoom || !layoutJson) return;
  bazaarRoom.send('bazaar.layout.update', { layoutJson });
}

export function getBazaarLayoutJson(): string {
  return String(bazaarRoom?.state?.layoutJson || '');
}

export function subscribeBazaarLayout(cb: (layoutJson: string) => void): () => void {
  if (!bazaarRoom) {
    cb('');
    return () => undefined;
  }
  const room = bazaarRoom;
  const push = () => cb(String(room.state?.layoutJson || ''));
  push();
  const onMsg = (msg: { layoutJson?: string }) => {
    if (msg?.layoutJson) cb(String(msg.layoutJson));
  };
  room.onMessage('bazaar.layout.changed', onMsg);
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
      room.onMessage('bazaar.layout.changed', () => undefined);
    } catch {
      /* ignore */
    }
    void unbindChange;
  };
}
