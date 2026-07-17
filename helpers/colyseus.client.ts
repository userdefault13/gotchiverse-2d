import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { SelectedPlayer } from 'types';

type RemotePlayer = {
  sessionId: string;
  address: string;
  gotchiId: string;
  name: string;
  x: number;
  y: number;
  onChange?: (cb: () => void) => void;
};

let client: Client | null = null;
let room: Room | null = null;
let localGotchiId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function isColyseusNetcode(): boolean {
  return process.env.NEXT_PUBLIC_NETCODE === 'colyseus';
}

function endpoint(): string {
  return (
    process.env.NEXT_PUBLIC_COLYSEUS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:2567'
  ).replace(/\/$/, '');
}

function toPlayerPayload(p: RemotePlayer) {
  return {
    id: p.gotchiId,
    name: p.name || `Gotchi #${p.gotchiId}`,
    x: p.x,
    y: p.y,
    health: 1000,
    maxHealth: 1000,
    isSpectator: false,
  };
}

function setConnected(connected: boolean) {
  try {
    GlobalState.PHASER.dispatch({
      type: 'UPDATE_CONNECTED',
      connected,
    });
    if (GlobalState.PHASER.state) {
      (GlobalState.PHASER.state as { socketConnected?: boolean }).socketConnected = connected;
    }
  } catch (e) {
    console.warn('Failed to update Phaser connected state', e);
  }
}

function syncPlayerPosition(player: RemotePlayer) {
  if (!player?.gotchiId) return;
  if (String(player.gotchiId) === String(localGotchiId)) {
    const sprite = (globalThis as { scene?: Record<string, { x: number; y: number }> }).scene?.[player.gotchiId];
    if (sprite && typeof sprite.x === 'number') {
      const dist = Math.hypot(sprite.x - player.x, sprite.y - player.y);
      if (dist > 200) {
        Players.handlePositions([{ id: player.gotchiId, x: player.x, y: player.y } as any]);
      }
    }
    return;
  }
  Players.handlePositions([{ id: player.gotchiId, x: player.x, y: player.y } as any]);
}

function bindRoomHandlers(activeRoom: Room) {
  const players = activeRoom.state.players;

  players.onAdd((player: RemotePlayer, sessionId: string) => {
    const payload = toPlayerPayload({ ...player, sessionId });
    void Players.addPlayers([payload as any]);
    if (typeof player.onChange === 'function') {
      player.onChange(() => syncPlayerPosition(player));
    }
  });

  // Fallback poll for schema clients that don't expose onChange per instance
  const poll = setInterval(() => {
    if (!room) {
      clearInterval(poll);
      return;
    }
    room.state.players.forEach((p: RemotePlayer) => syncPlayerPosition(p));
  }, 100);
  activeRoom.onLeave(() => {
    clearInterval(poll);
    setConnected(false);
    room = null;
  });

  players.onRemove((player: RemotePlayer) => {
    try {
      const sceneObj = (globalThis as { scene?: Record<string, { destroy?: (a?: boolean) => void }> }).scene;
      const id = player.gotchiId;
      if (sceneObj?.[id]) {
        sceneObj[id].destroy?.(true);
        sceneObj[`${id}_top`]?.destroy?.(true);
        sceneObj[`${id}_bottom`]?.destroy?.(true);
        delete sceneObj[id];
      }
    } catch (e) {
      console.warn('Failed to remove remote player', e);
    }
  });

  activeRoom.onError((code, message) => {
    console.warn('Colyseus room error', code, message);
  });
}

export async function colyseusConnect(selectedPlayer: SelectedPlayer): Promise<boolean> {
  const token = selectedPlayer.authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (!token) {
    console.warn('Colyseus connect missing authToken');
    return false;
  }

  localGotchiId = String(selectedPlayer.id);
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (room) {
    try {
      await room.leave(true);
    } catch {
      /* ignore */
    }
    room = null;
  }

  client = new Client(endpoint());
  try {
    room = await client.joinOrCreate('citaadel', {
      token,
      gotchiId: String(selectedPlayer.id),
      name: selectedPlayer.name || `Gotchi #${selectedPlayer.id}`,
    });
    bindRoomHandlers(room);
    setConnected(true);

    let me: RemotePlayer | undefined;
    room.state.players.forEach((p: RemotePlayer) => {
      if (String(p.gotchiId) === String(selectedPlayer.id)) me = p;
    });
    if (me) {
      void Players.addPlayers([toPlayerPayload(me) as any]);
    }
    return true;
  } catch (e) {
    console.warn('Colyseus join failed', e);
    setConnected(false);
    return false;
  }
}

export function colyseusSendMove(x: number, y: number): void {
  if (!room) return;
  room.send('move', { x: Math.round(x), y: Math.round(y) });
}

export function colyseusSendPing(): void {
  if (!room) return;
  room.send('ping', {});
}

export function colyseusDisconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (room) {
    room.leave(true).catch(() => undefined);
    room = null;
  }
  setConnected(false);
}

export function colyseusIsConnected(): boolean {
  return Boolean(room);
}
