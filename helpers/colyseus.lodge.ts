import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';

type LodgeRemotePlayer = {
  sessionId: string;
  gotchiId: string;
  name: string;
  x: number;
  y: number;
};

type LodgeRoomState = {
  lodgeId: string;
  cartridgeId: string;
  ownerAddress: string;
  interiorW: number;
  interiorH: number;
  layoutJson: string;
  players: {
    forEach: (cb: (p: LodgeRemotePlayer, sessionId: string) => void) => void;
    size?: number;
    onAdd?: (cb: (p: LodgeRemotePlayer, sessionId: string) => void) => void;
    onRemove?: (cb: (p: LodgeRemotePlayer, sessionId: string) => void) => void;
  };
  onChange?: (cb: () => void) => void;
};

let lodgeClient: Client | null = null;
let lodgeRoom: Room<LodgeRoomState> | null = null;
let occupancyListeners = new Set<(n: number) => void>();

function endpoint(): string {
  return (
    getRealmUrlSync() ||
    process.env.NEXT_PUBLIC_COLYSEUS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:2567'
  ).replace(/\/$/, '');
}

function countPlayers(room: Room<LodgeRoomState> | null): number {
  if (!room?.state?.players) return 0;
  let n = 0;
  room.state.players.forEach(() => {
    n += 1;
  });
  return n;
}

function notifyOccupancy() {
  const n = countPlayers(lodgeRoom);
  occupancyListeners.forEach((cb) => cb(n));
}

export type JoinLodgeOpts = {
  lodgeId: string;
  cartridgeId?: string | null;
  ownerAddress?: string | null;
};

/** Secondary Colyseus room — stays in citaadel while shopping. */
export async function joinLodgeRoom(opts: JoinLodgeOpts): Promise<Room<LodgeRoomState> | null> {
  const selected = Players.selectedPlayer;
  if (!selected?.id) {
    console.warn('joinLodgeRoom: no selected player');
    return null;
  }
  const token =
    selected.authToken ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (!token) {
    console.warn('joinLodgeRoom: missing authToken');
    return null;
  }

  await leaveLodgeRoom();

  try {
    await resolveRealmBaseUrl();
  } catch (e) {
    console.warn('joinLodgeRoom: realm URL resolve failed', e);
  }

  lodgeClient = new Client(endpoint());
  const cartridgeId =
    opts.cartridgeId ||
    (typeof GlobalState !== 'undefined' ? GlobalState.USER?.state?.cartridgeId : null) ||
    '';

  try {
    lodgeRoom = await lodgeClient.joinOrCreate('lodge', {
      token,
      gotchiId: String(selected.id),
      name: selected.name || `Gotchi #${selected.id}`,
      lodgeId: String(opts.lodgeId),
      cartridgeId: String(cartridgeId || ''),
      ownerAddress: String(opts.ownerAddress || '').toLowerCase(),
    });

    lodgeRoom.state.players.onAdd = () => notifyOccupancy();
    lodgeRoom.state.players.onRemove = () => notifyOccupancy();
    lodgeRoom.onLeave(() => {
      lodgeRoom = null;
      notifyOccupancy();
    });
    notifyOccupancy();
    return lodgeRoom;
  } catch (e) {
    console.warn('joinLodgeRoom failed', e);
    lodgeRoom = null;
    notifyOccupancy();
    return null;
  }
}

export async function leaveLodgeRoom(): Promise<void> {
  if (!lodgeRoom) return;
  try {
    lodgeRoom.send('lodge.leave');
  } catch {
    /* ignore */
  }
  try {
    await lodgeRoom.leave(true);
  } catch {
    /* ignore */
  }
  lodgeRoom = null;
  notifyOccupancy();
}

export function getLodgeRoom(): Room<LodgeRoomState> | null {
  return lodgeRoom;
}

export function getLodgeOccupancy(): number {
  return countPlayers(lodgeRoom);
}

export function subscribeLodgeOccupancy(cb: (n: number) => void): () => void {
  occupancyListeners.add(cb);
  cb(countPlayers(lodgeRoom));
  return () => {
    occupancyListeners.delete(cb);
  };
}

export function sendLodgeMove(x: number, y: number): void {
  if (!lodgeRoom) return;
  lodgeRoom.send('move', { x: Math.round(x), y: Math.round(y) });
}

export function seedLodgeLayout(layoutJson: string): void {
  if (!lodgeRoom || !layoutJson) return;
  lodgeRoom.send('lodge.layout.seed', { layoutJson });
}

export function publishLodgeLayout(layoutJson: string): void {
  if (!lodgeRoom || !layoutJson) return;
  lodgeRoom.send('lodge.layout.update', { layoutJson });
}

export function getLodgeLayoutJson(): string {
  return String(lodgeRoom?.state?.layoutJson || '');
}

export function subscribeLodgeLayout(cb: (layoutJson: string) => void): () => void {
  if (!lodgeRoom) {
    cb('');
    return () => undefined;
  }
  const room = lodgeRoom;
  const push = () => cb(String(room.state?.layoutJson || ''));
  push();
  const onMsg = (msg: { layoutJson?: string }) => {
    if (msg?.layoutJson) cb(String(msg.layoutJson));
  };
  room.onMessage('lodge.layout.changed', onMsg);
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
      room.onMessage('lodge.layout.changed', () => undefined);
    } catch {
      /* ignore */
    }
    void unbindChange;
  };
}
