import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';

type DaoOfficeRemotePlayer = {
  sessionId: string;
  gotchiId: string;
  name: string;
  x: number;
  y: number;
};

type DaoOfficeRoomState = {
  daoOfficeId: string;
  cartridgeId: string;
  ownerAddress: string;
  interiorW: number;
  interiorH: number;
  layoutJson: string;
  players: {
    forEach: (cb: (p: DaoOfficeRemotePlayer, sessionId: string) => void) => void;
    size?: number;
    onAdd?: (cb: (p: DaoOfficeRemotePlayer, sessionId: string) => void) => void;
    onRemove?: (cb: (p: DaoOfficeRemotePlayer, sessionId: string) => void) => void;
  };
  onChange?: (cb: () => void) => void;
};

let daoOfficeClient: Client | null = null;
let daoOfficeRoom: Room<DaoOfficeRoomState> | null = null;
let occupancyListeners = new Set<(n: number) => void>();

function endpoint(): string {
  return (
    getRealmUrlSync() ||
    process.env.NEXT_PUBLIC_COLYSEUS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:2567'
  ).replace(/\/$/, '');
}

function countPlayers(room: Room<DaoOfficeRoomState> | null): number {
  if (!room?.state?.players) return 0;
  let n = 0;
  room.state.players.forEach(() => {
    n += 1;
  });
  return n;
}

function notifyOccupancy() {
  const n = countPlayers(daoOfficeRoom);
  occupancyListeners.forEach((cb) => cb(n));
}

export type JoinDaoOfficeOpts = {
  daoOfficeId: string;
  cartridgeId?: string | null;
  ownerAddress?: string | null;
};

/** Secondary Colyseus room — stays in citaadel while shopping the DAO Office. */
export async function joinDaoOfficeRoom(opts: JoinDaoOfficeOpts): Promise<Room<DaoOfficeRoomState> | null> {
  const selected = Players.selectedPlayer;
  if (!selected?.id) {
    console.warn('joinDaoOfficeRoom: no selected player');
    return null;
  }
  const token =
    selected.authToken ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (!token) {
    console.warn('joinDaoOfficeRoom: missing authToken');
    return null;
  }

  await leaveDaoOfficeRoom();

  try {
    await resolveRealmBaseUrl();
  } catch (e) {
    console.warn('joinDaoOfficeRoom: realm URL resolve failed', e);
  }

  daoOfficeClient = new Client(endpoint());
  const cartridgeId =
    opts.cartridgeId ||
    (typeof GlobalState !== 'undefined' ? GlobalState.USER?.state?.cartridgeId : null) ||
    '';

  try {
    daoOfficeRoom = await daoOfficeClient.joinOrCreate('dao_office', {
      token,
      gotchiId: String(selected.id),
      name: selected.name || `Gotchi #${selected.id}`,
      daoOfficeId: String(opts.daoOfficeId),
      cartridgeId: String(cartridgeId || ''),
      ownerAddress: String(opts.ownerAddress || '').toLowerCase(),
    });

    daoOfficeRoom.state.players.onAdd = () => notifyOccupancy();
    daoOfficeRoom.state.players.onRemove = () => notifyOccupancy();
    daoOfficeRoom.onLeave(() => {
      daoOfficeRoom = null;
      notifyOccupancy();
    });
    notifyOccupancy();
    return daoOfficeRoom;
  } catch (e) {
    console.warn('joinDaoOfficeRoom failed', e);
    daoOfficeRoom = null;
    notifyOccupancy();
    return null;
  }
}

export async function leaveDaoOfficeRoom(): Promise<void> {
  if (!daoOfficeRoom) return;
  try {
    daoOfficeRoom.send('dao_office.leave');
  } catch {
    /* ignore */
  }
  try {
    await daoOfficeRoom.leave(true);
  } catch {
    /* ignore */
  }
  daoOfficeRoom = null;
  notifyOccupancy();
}

export function getDaoOfficeRoom(): Room<DaoOfficeRoomState> | null {
  return daoOfficeRoom;
}

export function getDaoOfficeOccupancy(): number {
  return countPlayers(daoOfficeRoom);
}

export function subscribeDaoOfficeOccupancy(cb: (n: number) => void): () => void {
  occupancyListeners.add(cb);
  cb(countPlayers(daoOfficeRoom));
  return () => {
    occupancyListeners.delete(cb);
  };
}

export function sendDaoOfficeMove(x: number, y: number): void {
  if (!daoOfficeRoom) return;
  daoOfficeRoom.send('move', { x: Math.round(x), y: Math.round(y) });
}

export function seedDaoOfficeLayout(layoutJson: string): void {
  if (!daoOfficeRoom || !layoutJson) return;
  daoOfficeRoom.send('dao_office.layout.seed', { layoutJson });
}

export function publishDaoOfficeLayout(layoutJson: string): void {
  if (!daoOfficeRoom || !layoutJson) return;
  daoOfficeRoom.send('dao_office.layout.update', { layoutJson });
}

export function getDaoOfficeLayoutJson(): string {
  return String(daoOfficeRoom?.state?.layoutJson || '');
}

export function subscribeDaoOfficeLayout(cb: (layoutJson: string) => void): () => void {
  if (!daoOfficeRoom) {
    cb('');
    return () => undefined;
  }
  const room = daoOfficeRoom;
  const push = () => cb(String(room.state?.layoutJson || ''));
  push();
  const onMsg = (msg: { layoutJson?: string }) => {
    if (msg?.layoutJson) cb(String(msg.layoutJson));
  };
  room.onMessage('dao_office.layout.changed', onMsg);
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
      room.onMessage('dao_office.layout.changed', () => undefined);
    } catch {
      /* ignore */
    }
    void unbindChange;
  };
}
