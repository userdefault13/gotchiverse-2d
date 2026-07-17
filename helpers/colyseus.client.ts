import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { scene as phaserScene } from 'components/controllers/SceneController';
import { SelectedPlayer } from 'types';
import { resolveColyseusMove } from 'helpers/colyseus.collisions';
import { colyseusSeedParcels, colyseusUpdateCurrentParcel } from 'helpers/colyseus.parcels';
import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';

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
let keyMoveTimer: ReturnType<typeof setInterval> | null = null;
let keyDirection: { x: number; y: number } | null = null;
let keySprint = false;
let lastKeyMoveSent = 0;
/** Fallback when the Phaser sprite isn't addressable yet. */
let lastLocalPos: { x: number; y: number } | null = null;

const WALK_SPEED = 220;
const SPRINT_SPEED = 360;
const KEY_TICK_MS = 50;

export function isColyseusNetcode(): boolean {
  return process.env.NEXT_PUBLIC_NETCODE === 'colyseus';
}

function endpoint(): string {
  return (
    getRealmUrlSync() ||
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

function getLocalSprite(): { x: number; y: number } | undefined {
  if (!localGotchiId || !phaserScene) return lastLocalPos || undefined;
  // Player containers live on the Phaser SceneController scene, not globalThis.
  const sceneObj = phaserScene as unknown as Record<string, { x?: number; y?: number } | undefined>;
  const sprite = sceneObj[localGotchiId] || sceneObj[String(Number(localGotchiId))];
  if (sprite && typeof sprite.x === 'number' && typeof sprite.y === 'number') {
    lastLocalPos = { x: sprite.x, y: sprite.y };
    return lastLocalPos;
  }
  return lastLocalPos || undefined;
}

function applyLocalPosition(
  x: number,
  y: number,
  direction?: { x: number; y: number },
  noTween = false,
) {
  if (!localGotchiId) return;
  const next = { x: Math.round(x), y: Math.round(y) };
  lastLocalPos = next;
  Players.handlePositions([
    {
      id: localGotchiId,
      x: next.x,
      y: next.y,
      direction,
      // Key prediction must snap; stacked tweens stall sprite.x for the next tick.
      noTween,
    } as any,
  ]);
}

function syncPlayerPosition(player: RemotePlayer) {
  if (!player?.gotchiId) return;
  if (String(player.gotchiId) === String(localGotchiId)) {
    // While driving with keys, keep client prediction authoritative.
    if (keyDirection) return;
    const sprite = getLocalSprite();
    if (sprite && typeof sprite.x === 'number') {
      const dist = Math.hypot(sprite.x - player.x, sprite.y - player.y);
      // Only hard-correct meaningful desync; tiny diffs are prediction noise.
      if (dist > 64) {
        Players.handlePositions([{ id: player.gotchiId, x: player.x, y: player.y, noTween: dist > 200 } as any]);
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
    stopKeyMoveLoop();
    setConnected(false);
    room = null;
  });

  players.onRemove((player: RemotePlayer) => {
    try {
      if (!phaserScene) return;
      const sceneObj = phaserScene as unknown as Record<
        string,
        { destroy?: (a?: boolean) => void } | undefined
      >;
      const id = String(player.gotchiId);
      if (sceneObj[id]) {
        sceneObj[id]?.destroy?.(true);
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

function directionToVector(direction: string | undefined): { x: number; y: number } | null {
  switch (String(direction || '').toLowerCase()) {
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
    case 'none':
    case '':
      return null;
    default:
      return null;
  }
}

function stopKeyMoveLoop() {
  if (keyMoveTimer) {
    clearInterval(keyMoveTimer);
    keyMoveTimer = null;
  }
  keyDirection = null;
  keySprint = false;
}

function tickKeyMove() {
  if (!room || !keyDirection || !localGotchiId) return;
  const sprite = getLocalSprite();
  if (!sprite) return;

  const speed = keySprint ? SPRINT_SPEED : WALK_SPEED;
  const step = (speed * KEY_TICK_MS) / 1000;
  const proposedX = sprite.x + keyDirection.x * step;
  const proposedY = sprite.y + keyDirection.y * step;
  const resolved = resolveColyseusMove(sprite.x, sprite.y, proposedX, proposedY);
  if (resolved.blocked) return;

  applyLocalPosition(resolved.x, resolved.y, keyDirection, true);
  colyseusSeedParcels(resolved.x, resolved.y);
  colyseusUpdateCurrentParcel(resolved.x, resolved.y);

  const now = Date.now();
  // Send a bit less often than the render tick to stay under server rate limits.
  if (now - lastKeyMoveSent >= 80) {
    lastKeyMoveSent = now;
    room.send('move', { x: Math.round(resolved.x), y: Math.round(resolved.y) });
  }
}

export function colyseusHandleKeyMove(direction: string, sprint = false): void {
  if (!room) return;
  const vector = directionToVector(direction);
  keySprint = Boolean(sprint);

  if (!vector) {
    stopKeyMoveLoop();
    return;
  }

  keyDirection = vector;
  if (!keyMoveTimer) {
    keyMoveTimer = setInterval(tickKeyMove, KEY_TICK_MS);
    tickKeyMove();
  }
}

export async function colyseusConnect(
  selectedPlayer: SelectedPlayer,
  opts?: { spawnLocId?: string },
): Promise<boolean> {
  const token = selectedPlayer.authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  if (!token) {
    console.warn('Colyseus connect missing authToken');
    return false;
  }

  localGotchiId = String(selectedPlayer.id);
  lastLocalPos = null;
  stopKeyMoveLoop();
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

  // Resolve a live tunnel URL at connect time (smoke URLs rotate).
  try {
    await resolveRealmBaseUrl();
  } catch (e) {
    console.warn('REALM URL resolve failed before Colyseus join', e);
  }
  client = new Client(endpoint());
  try {
    const joinOpts: Record<string, string> = {
      token,
      gotchiId: String(selectedPlayer.id),
      name: selectedPlayer.name || `Gotchi #${selectedPlayer.id}`,
    };
    if (opts?.spawnLocId) {
      joinOpts.spawnLocId = opts.spawnLocId;
    }
    room = await client.joinOrCreate('citaadel', joinOpts);
    bindRoomHandlers(room);
    setConnected(true);

    let me: RemotePlayer | undefined;
    room.state.players.forEach((p: RemotePlayer) => {
      if (String(p.gotchiId) === String(selectedPlayer.id)) me = p;
    });
    if (me) {
      lastLocalPos = { x: me.x, y: me.y };
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
  // Reject click targets that land inside a solid installation.
  if (resolveColyseusMove(x, y, x, y).blocked) return;

  applyLocalPosition(x, y);
  colyseusSeedParcels(x, y);
  colyseusUpdateCurrentParcel(x, y);
  room.send('move', { x: Math.round(x), y: Math.round(y) });
}

export function colyseusSendPing(): void {
  if (!room) return;
  room.send('ping', {});
}

export function colyseusDisconnect(): void {
  stopKeyMoveLoop();
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

/** Spawn coords from the room state when available (else FE fallback). */
export function colyseusLocalSpawn(): { x: number; y: number } | null {
  if (!room || !localGotchiId) return null;
  let me: RemotePlayer | undefined;
  room.state.players.forEach((p: RemotePlayer) => {
    if (String(p.gotchiId) === String(localGotchiId)) me = p;
  });
  return me ? { x: me.x, y: me.y } : null;
}
