import { Client, Room } from 'colyseus.js';
import GlobalState from 'contexts/GlobalState';
import Players from 'components/phaser/Players';
import { scene as phaserScene } from 'components/controllers/SceneController';
import { SelectedPlayer } from 'types';
import { resolveColyseusMove, isColyseusPositionBlocked } from 'helpers/colyseus.collisions';
import { colyseusSeedParcels, colyseusUpdateCurrentParcel } from 'helpers/colyseus.parcels';
import { colyseusPreloadNearbyInstallations } from 'helpers/colyseus.installations';
import { getParcelSpawnPixels } from 'helpers/parcels.helper';
import { getRealmUrlSync, resolveRealmBaseUrl } from 'helpers/realm.url';
import { toggleFollowGotchi } from 'helpers/phaser.helper';
import { getColyseusMap, setColyseusMap, isColyseusAarenaMap } from 'helpers/colyseus.map';
import { attachColyseusCombat, detachColyseusCombat, colyseusSendCombat as sendCombat } from 'helpers/colyseus.combat';
import { attachFoundryColyseusRoom, detachFoundryColyseusRoom, FoundryNet } from 'helpers/foundry';

function isFoundryPoCEnabled(): boolean {
  try {
    const cfg = GlobalState.GAME?.state?.gameConfig as { enableParcelFoundryPoC?: boolean } | undefined;
    return Boolean(cfg?.enableParcelFoundryPoC) || process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true';
  } catch {
    return process.env.NEXT_PUBLIC_ENABLE_FOUNDRY_POC === 'true';
  }
}

function isCitaadelMap(): boolean {
  return getColyseusMap() !== 'aarena';
}

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
let intentionalLeave = false;
let keyMoveTimer: ReturnType<typeof setInterval> | null = null;
let keyDirection: { x: number; y: number } | null = null;
let keySprint = false;
let lastKeyMoveSent = 0;
/** Fallback when the Phaser sprite isn't addressable yet. */
let lastLocalPos: { x: number; y: number } | null = null;
let rushTimer: ReturnType<typeof setInterval> | null = null;
let rushUntil = 0;
let rushSettleTimer: ReturnType<typeof setTimeout> | null = null;

const WALK_SPEED = 220;
const SPRINT_SPEED = 360;
const KEY_TICK_MS = 50;
/** Matches BE registerCombat max rush — used to avoid post-dash hard snaps. */
const MAX_RUSH_DISTANCE_PX = 24 * 64;
const RUSH_SETTLE_MS = 450;

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
    // While driving with keys or predicting a rush, keep client motion authoritative.
    if (keyDirection || isLocalRushing()) return;
    const sprite = getLocalSprite();
    if (sprite && typeof sprite.x === 'number') {
      const dist = Math.hypot(sprite.x - player.x, sprite.y - player.y);
      // Never hard-snap the local gotchi to a stale server spot after a dash — that
      // looked like a random teleport back to the plaza spawn. Prefer client and settle.
      if (dist > 32) {
        sendRushSettle(sprite.x, sprite.y);
      }
    }
    return;
  }
  Players.handlePositions([{ id: player.gotchiId, x: player.x, y: player.y } as any]);
}

function sendRushSettle(x: number, y: number): void {
  if (!room) return;
  room.send('move', { x: Math.round(x), y: Math.round(y), rushSettle: true });
}

function isLocalRushing(): boolean {
  return Boolean(rushTimer) || Date.now() < rushUntil;
}

function clearRushTimerOnly() {
  if (rushTimer) {
    clearInterval(rushTimer);
    rushTimer = null;
  }
  if (rushSettleTimer) {
    clearTimeout(rushSettleTimer);
    rushSettleTimer = null;
  }
}

function stopRushLoop() {
  clearRushTimerOnly();
  // Keep hard-sync suppressed briefly so the server can finish its rush / accept settle.
  rushUntil = Date.now() + RUSH_SETTLE_MS;
  const live = getLocalSprite();
  // Settle immediately at dash end (don't wait) — delayed-only settle left a window
  // where poll sync could still fight the predicted position.
  if (live) sendRushSettle(live.x, live.y);
  rushSettleTimer = setTimeout(() => {
    rushSettleTimer = null;
    const again = getLocalSprite();
    if (again) sendRushSettle(again.x, again.y);
  }, RUSH_SETTLE_MS);
}

/** Client-side rush dash to match server Player movement (aarena combat). */
export function colyseusPredictRush(opts: {
  gotchiId?: string;
  direction: { x: number; y: number };
  distance?: number;
  speed?: number;
}): void {
  if (!localGotchiId) return;
  if (opts.gotchiId && String(opts.gotchiId) !== String(localGotchiId)) return;

  const dirLen = Math.hypot(opts.direction.x, opts.direction.y);
  if (!dirLen) return;
  const dir = { x: opts.direction.x / dirLen, y: opts.direction.y / dirLen };
  const speed = Math.max(120, Number(opts.speed) || 720);
  let remaining = Math.max(0, Number(opts.distance) || 0);
  if (remaining <= 0) return;

  stopKeyMoveLoop();
  clearRushTimerOnly();
  rushUntil = Date.now() + Math.max(200, Math.round((remaining / speed) * 1000));

  const tickMs = 50;
  rushTimer = setInterval(() => {
    if (remaining <= 0 || Date.now() > rushUntil) {
      stopRushLoop();
      return;
    }
    const sprite = getLocalSprite();
    if (!sprite) return;
    const step = Math.min(remaining, (speed * tickMs) / 1000);
    remaining -= step;
    const proposedX = sprite.x + dir.x * step;
    const proposedY = sprite.y + dir.y * step;
    const resolved = resolveColyseusMove(sprite.x, sprite.y, proposedX, proposedY);
    applyLocalPosition(resolved.x, resolved.y, dir, true);
    if (resolved.blocked || (resolved.x === sprite.x && resolved.y === sprite.y && step > 0)) {
      // Hit a solid — end local dash; server will settle.
      stopRushLoop();
    }
  }, tickMs);
}

function bindRoomHandlers(activeRoom: Room) {
  const players = activeRoom.state.players;
  // Combat is aarena-only (citaadel stays walkable / foundry).
  if (isColyseusAarenaMap()) {
    attachColyseusCombat(activeRoom, { predictRush: colyseusPredictRush });
  }

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
  activeRoom.onLeave((code) => {
    console.warn('@colyseus onLeave', code, { intentionalLeave });
    clearInterval(poll);
    stopKeyMoveLoop();
    clearRushTimerOnly();
    rushUntil = 0;
    detachFoundryColyseusRoom();
    detachColyseusCombat();
    room = null;
    if (intentionalLeave) {
      intentionalLeave = false;
      setConnected(false);
      return;
    }
    // Keep `connected` true briefly and try to rejoin — flipping it false overlays
    // the aarena LoadingScene and looks like a full game reset after an attack.
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      const player = GlobalState.REALM?.state?.selectedPlayer as SelectedPlayer | undefined;
      if (!player?.id || !player?.authToken) {
        setConnected(false);
        return;
      }
      void colyseusConnect(player, { map: getColyseusMap() }).then((ok) => {
        if (!ok) setConnected(false);
      });
    }, 400);
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
  if (isCitaadelMap()) {
    colyseusSeedParcels(resolved.x, resolved.y);
    colyseusUpdateCurrentParcel(resolved.x, resolved.y);
    colyseusPreloadNearbyInstallations(resolved.x, resolved.y);
  }

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
  opts?: { spawnLocId?: string; map?: 'citaadel' | 'aarena' },
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
      intentionalLeave = true;
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
  const roomName: 'citaadel' | 'aarena' = opts?.map === 'aarena' ? 'aarena' : 'citaadel';
  setColyseusMap(roomName);
  try {
    const joinOpts: Record<string, string> = {
      token,
      gotchiId: String(selectedPlayer.id),
      name: selectedPlayer.name || `Gotchi #${selectedPlayer.id}`,
    };
    // Parcel spawn is citaadel-only; aarena uses server SPAWN_BOUNDS.
    if (roomName === 'citaadel' && opts?.spawnLocId) {
      joinOpts.spawnLocId = opts.spawnLocId;
    }
    room = await client.joinOrCreate(roomName, joinOpts);
    bindRoomHandlers(room);
    if (roomName === 'aarena') {
      seedColyseusWeapons(selectedPlayer);
    }
    setConnected(true);

    let me: RemotePlayer | undefined;
    room.state.players.forEach((p: RemotePlayer) => {
      if (String(p.gotchiId) === String(selectedPlayer.id)) me = p;
    });
    if (me) {
      lastLocalPos = { x: me.x, y: me.y };
      void Players.addPlayers([toPlayerPayload(me) as any]);
    }
    if (roomName === 'citaadel' && isFoundryPoCEnabled()) {
      void FoundryNet.init(endpoint()).then(() => {
        if (room) attachFoundryColyseusRoom(room);
      });
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
  // Reject click targets that land inside a solid installation / wall.
  if (isColyseusPositionBlocked(x, y)) return;

  applyLocalPosition(x, y);
  if (isCitaadelMap()) {
    colyseusSeedParcels(x, y);
    colyseusUpdateCurrentParcel(x, y);
    colyseusPreloadNearbyInstallations(x, y);
  }
  room.send('move', { x: Math.round(x), y: Math.round(y) });
}

/**
 * If installations just spawned under the local player, slide to the nearest free tile.
 * Prevents the classic "walk onto empty parcel → solids load → trapped" soft-lock.
 */
export function colyseusNudgeIfTrapped(): void {
  if (!room) return;
  const sprite = getLocalSprite();
  if (!sprite) return;
  if (!isColyseusPositionBlocked(sprite.x, sprite.y)) return;

  const spot = freeTeleportSpot(sprite.x, sprite.y);
  if (spot.x === sprite.x && spot.y === sprite.y) return;

  applyLocalPosition(spot.x, spot.y, undefined, true);
  room.send('move', { x: Math.round(spot.x), y: Math.round(spot.y) });
}

function freeTeleportSpot(centerX: number, centerY: number): { x: number; y: number } {
  const UNIT = 64;
  const offsets: Array<[number, number]> = [[0, 0]];
  for (let ring = 1; ring <= 8; ring += 1) {
    for (let ox = -ring; ox <= ring; ox += 1) {
      offsets.push([ox, -ring], [ox, ring]);
    }
    for (let oy = -ring + 1; oy <= ring - 1; oy += 1) {
      offsets.push([-ring, oy], [ring, oy]);
    }
  }
  for (const [ox, oy] of offsets) {
    const x = centerX + ox * UNIT;
    const y = centerY + oy * UNIT;
    if (!isColyseusPositionBlocked(x, y)) return { x, y };
  }
  return { x: centerX, y: centerY };
}

/**
 * Bounce-gate / event travel: snap local player to a parcel and notify the room.
 * Bypasses walk speed clamps and installation click-block (intentional teleport).
 */
export async function colyseusTeleportToParcel(parcelId: string): Promise<boolean> {
  if (!room || !parcelId || parcelId.charAt(0) !== 'C') {
    console.warn('colyseusTeleportToParcel: invalid parcel', parcelId);
    return false;
  }

  const spawn = getParcelSpawnPixels(parcelId);
  if (!spawn) {
    console.warn('colyseusTeleportToParcel: no spawn for', parcelId);
    return false;
  }

  // Stop WASD prediction so server teleport isn't overwritten.
  colyseusHandleKeyMove('none', false);

  colyseusSeedParcels(spawn.x, spawn.y, true);
  colyseusUpdateCurrentParcel(spawn.x, spawn.y);

  try {
    const { colyseusLoadInstallations, colyseusPreloadNearbyInstallations } = await import(
      'helpers/colyseus.installations'
    );
    await colyseusLoadInstallations([parcelId], { force: true });
    colyseusPreloadNearbyInstallations(spawn.x, spawn.y, {
      force: true,
      prioritize: parcelId,
    });
  } catch (e) {
    console.warn('colyseusTeleportToParcel: install hydrate failed', e);
  }

  const spot = freeTeleportSpot(spawn.x, spawn.y);
  applyLocalPosition(spot.x, spot.y, undefined, true);
  try {
    toggleFollowGotchi(true);
  } catch {
    /* camera follow best-effort */
  }

  room.send('teleport', {
    x: Math.round(spot.x),
    y: Math.round(spot.y),
    parcelId,
  });
  return true;
}

export function colyseusSendPing(): void {
  if (!room) return;
  room.send('ping', {});
}

export function colyseusDisconnect(): void {
  stopKeyMoveLoop();
  clearRushTimerOnly();
  rushUntil = 0;
  detachFoundryColyseusRoom();
  detachColyseusCombat();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (room) {
    intentionalLeave = true;
    room.leave(true).catch(() => undefined);
    room = null;
  }
  setColyseusMap('citaadel');
  setConnected(false);
}

export function colyseusIsConnected(): boolean {
  return Boolean(room);
}

/** Aarena-only; no-ops on citaadel. */
export function colyseusSendCombat(action: 'melee' | 'fire', data: unknown): boolean {
  if (!isColyseusAarenaMap()) return false;
  return sendCombat(action, data);
}

/** Prefer wearable types from select screen; default L=melee R=ranged for arcade MVP. */
function seedColyseusWeapons(selectedPlayer: SelectedPlayer): void {
  const weaponType = (hand?: { type?: string }) => {
    if (hand?.type === 'Melee Weapon' || hand?.type === 'Ranged Weapon') return hand.type;
    return null;
  };
  try {
    GlobalState.REALM.dispatch({
      type: 'UPDATE_WEAPON_TYPES',
      leftWeapon: weaponType(selectedPlayer.leftHand) || 'Melee Weapon',
      rightWeapon: weaponType(selectedPlayer.rightHand) || 'Ranged Weapon',
    });
  } catch (e) {
    console.warn('Failed to seed Colyseus weapon types', e);
  }
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
