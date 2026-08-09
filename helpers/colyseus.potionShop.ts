import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';

type PotionShopRemotePlayer = {
  sessionId: string;
  gotchiId: string;
  name: string;
  x: number;
  y: number;
};

type PotionShopRoomState = {
  potionShopId: string;
  cartridgeId: string;
  ownerAddress: string;
  interiorW: number;
  interiorH: number;
  layoutJson: string;
  players: {
    forEach: (cb: (p: PotionShopRemotePlayer, sessionId: string) => void) => void;
    size?: number;
    onAdd?: (cb: (p: PotionShopRemotePlayer, sessionId: string) => void) => void;
    onRemove?: (cb: (p: PotionShopRemotePlayer, sessionId: string) => void) => void;
  };
  onChange?: (cb: () => void) => void;
};

let potionShopClient: Client | null = null;
let potionShopRoom: Room<PotionShopRoomState> | null = null;
let occupancyListeners = new Set<(n: number) => void>();

function endpoint(): string {
  return (
    getRealmUrlSync() ||
    process.env.NEXT_PUBLIC_COLYSEUS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:2567'
  ).replace(/\/$/, '');
}

function countPlayers(room: Room<PotionShopRoomState> | null): number {
  if (!room?.state?.players) return 0;
  let n = 0;
  room.state.players.forEach(() => {
    n += 1;
  });
  return n;
}

function notifyOccupancy() {
  const n = countPlayers(potionShopRoom);
  occupancyListeners.forEach((cb) => cb(n));
}

export type JoinPotionShopOpts = {
  potionShopId: string;
  cartridgeId?: string | null;
  ownerAddress?: string | null;
};

/** Secondary Colyseus room — stays in citaadel while shopping the Potion Shop. */
export async function joinPotionShopRoom(opts: JoinPotionShopOpts): Promise<Room<PotionShopRoomState> | null> {
  const selected = Players.selectedPlayer;
  if (!selected?.id) {
    console.warn('joinPotionShopRoom: no selected player');
    return null;
  }
  const token =
    selected.authToken ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (!token) {
    console.warn('joinPotionShopRoom: missing authToken');
    return null;
  }

  await leavePotionShopRoom();

  try {
    await resolveRealmBaseUrl();
  } catch (e) {
    console.warn('joinPotionShopRoom: realm URL resolve failed', e);
  }

  potionShopClient = new Client(endpoint());
  const cartridgeId =
    opts.cartridgeId ||
    (typeof GlobalState !== 'undefined' ? GlobalState.USER?.state?.cartridgeId : null) ||
    '';

  try {
    potionShopRoom = await potionShopClient.joinOrCreate('potion_shop', {
      token,
      gotchiId: String(selected.id),
      name: selected.name || `Gotchi #${selected.id}`,
      potionShopId: String(opts.potionShopId),
      cartridgeId: String(cartridgeId || ''),
      ownerAddress: String(opts.ownerAddress || '').toLowerCase(),
    });

    potionShopRoom.state.players.onAdd = () => notifyOccupancy();
    potionShopRoom.state.players.onRemove = () => notifyOccupancy();
    potionShopRoom.onLeave(() => {
      potionShopRoom = null;
      notifyOccupancy();
    });
    notifyOccupancy();
    return potionShopRoom;
  } catch (e) {
    console.warn('joinPotionShopRoom failed', e);
    potionShopRoom = null;
    notifyOccupancy();
    return null;
  }
}

export async function leavePotionShopRoom(): Promise<void> {
  if (!potionShopRoom) return;
  try {
    potionShopRoom.send('potion_shop.leave');
  } catch {
    /* ignore */
  }
  try {
    await potionShopRoom.leave(true);
  } catch {
    /* ignore */
  }
  potionShopRoom = null;
  notifyOccupancy();
}

export function getPotionShopRoom(): Room<PotionShopRoomState> | null {
  return potionShopRoom;
}

export function getPotionShopOccupancy(): number {
  return countPlayers(potionShopRoom);
}

export function subscribePotionShopOccupancy(cb: (n: number) => void): () => void {
  occupancyListeners.add(cb);
  cb(countPlayers(potionShopRoom));
  return () => {
    occupancyListeners.delete(cb);
  };
}

export function sendPotionShopMove(x: number, y: number): void {
  if (!potionShopRoom) return;
  potionShopRoom.send('move', { x: Math.round(x), y: Math.round(y) });
}

export function seedPotionShopLayout(layoutJson: string): void {
  if (!potionShopRoom || !layoutJson) return;
  potionShopRoom.send('potion_shop.layout.seed', { layoutJson });
}

export function publishPotionShopLayout(layoutJson: string): void {
  if (!potionShopRoom || !layoutJson) return;
  potionShopRoom.send('potion_shop.layout.update', { layoutJson });
}

export function getPotionShopLayoutJson(): string {
  return String(potionShopRoom?.state?.layoutJson || '');
}

export function subscribePotionShopLayout(cb: (layoutJson: string) => void): () => void {
  if (!potionShopRoom) {
    cb('');
    return () => undefined;
  }
  const room = potionShopRoom;
  const push = () => cb(String(room.state?.layoutJson || ''));
  push();
  const onMsg = (msg: { layoutJson?: string }) => {
    if (msg?.layoutJson) cb(String(msg.layoutJson));
  };
  room.onMessage('potion_shop.layout.changed', onMsg);
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
      room.onMessage('potion_shop.layout.changed', () => undefined);
    } catch {
      /* ignore */
    }
    void unbindChange;
  };
}
