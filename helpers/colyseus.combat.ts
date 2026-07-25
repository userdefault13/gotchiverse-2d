import Melee from 'components/phaser/Melee';
import Missiles from 'components/phaser/Missiles';
import Players from 'components/phaser/Players';
import { scene } from 'components/controllers/SceneController';
import { MeleeShape, Missile } from 'types';

type RoomLike = {
  send: (type: string, message?: unknown) => void;
  onMessage: (type: string, callback: (message: unknown) => void) => void;
};

type CombatMeleeEnter = MeleeShape & {
  distance?: number;
  speed?: number;
};

type CombatEnterMsg = {
  missile?: Missile[];
  melee?: CombatMeleeEnter[];
};

type CombatPositionsMsg = {
  missile?: { id: string; x: number; y: number }[];
  melee?: { id: string; x: number; y: number }[];
};

type CombatLeaveMsg = {
  missile?: { id: string }[];
  melee?: { id: string }[];
};

type CombatIntent = {
  direction?: { x?: number; y?: number };
  chargeDuration?: number;
};

type RushPredict = (opts: {
  gotchiId?: string;
  direction: { x: number; y: number };
  distance?: number;
  speed?: number;
}) => void;

let room: RoomLike | null = null;
let predictRush: RushPredict | null = null;

function selectedGotchiId(): string {
  try {
    return String(Players.selectedPlayer?.id || '');
  } catch {
    return '';
  }
}

function localPlayerSprite(): { x: number; y: number } | undefined {
  const id = selectedGotchiId();
  if (!id || !scene) return undefined;
  const sprite = scene[id] || scene[String(Number(id))];
  if (sprite && typeof sprite.x === 'number' && typeof sprite.y === 'number') return sprite;
  return undefined;
}

/** True when melee id belongs to the local gotchi (server `id_N` or optimistic `id_local_…`). */
function isLocalGotchiMeleeId(id: string | undefined): boolean {
  const localId = selectedGotchiId();
  if (!localId || !id) return false;
  return String(id).startsWith(`${localId}_`);
}

function predictLocalMelee(data: unknown): void {
  const intent = data as CombatIntent;
  const player = localPlayerSprite();
  const playerId = selectedGotchiId();
  const dir = intent?.direction;
  if (!player || !playerId || dir?.x == null || dir?.y == null) return;
  if (Number(dir.x) === 0 && Number(dir.y) === 0) return;
  if (!scene?.meleeGroup) return;

  const rawCharge = Number(intent.chargeDuration);
  const chargeDuration = Number.isFinite(rawCharge) && rawCharge > 0 ? rawCharge : 0;
  const isRush = chargeDuration > 0;
  const distance = isRush ? Math.max(0.08, Math.min(chargeDuration, 2) / 2) * (24 * 64) : 0;
  const id = `${playerId}_local_${Date.now()}`;
  Melee.create([
    {
      id,
      x: Math.round(player.x),
      y: Math.round(player.y),
      size: 64,
      isRush,
      direction: { x: Number(dir.x), y: Number(dir.y) },
      created: true,
      distance: Math.round(distance),
      speed: 720,
    } as CombatMeleeEnter,
  ]);
  if (isRush && distance > 0 && predictRush) {
    predictRush({
      gotchiId: playerId,
      direction: { x: Number(dir.x), y: Number(dir.y) },
      distance,
      speed: 720,
    });
  }
}

export function attachColyseusCombat(
  activeRoom: RoomLike | null,
  opts?: { predictRush?: RushPredict },
): void {
  room = activeRoom;
  predictRush = opts?.predictRush || null;
  if (!activeRoom) return;

  activeRoom.onMessage('combat.enter', (raw) => {
    try {
      const msg = raw as CombatEnterMsg;
      // Missiles: always use server enter + positions (client has no flight loop).
      // Melee: skip our own server echo — already shown via predictLocalMelee.
      const missiles = msg?.missile || [];
      const melees = (msg?.melee || []).filter((m) => !isLocalGotchiMeleeId(m?.id));
      if (missiles.length) Missiles.create(missiles);
      if (melees.length) {
        Melee.create(melees);
        for (const melee of melees) {
          if (!melee?.isRush || !melee.direction || !predictRush) continue;
          const gotchiId = String(melee.id || '').split('_')[0];
          predictRush({
            gotchiId,
            direction: melee.direction,
            distance: melee.distance,
            speed: melee.speed,
          });
        }
      }
    } catch (e) {
      console.warn('@combat.enter handler', e);
    }
  });

  activeRoom.onMessage('combat.positions', (raw) => {
    try {
      const msg = raw as CombatPositionsMsg;
      // Never filter positions — missiles only move via this stream.
      if (msg?.missile?.length) Missiles.updatePosition(msg.missile as Missile[]);
    } catch (e) {
      console.warn('@combat.positions handler', e);
    }
  });

  activeRoom.onMessage('combat.leave', (raw) => {
    try {
      const msg = raw as CombatLeaveMsg;
      if (msg?.missile?.length) Missiles.destroy(msg.missile as Missile[]);
      if (msg?.melee?.length) Melee.destroy(msg.melee as MeleeShape[]);
    } catch (e) {
      console.warn('@combat.leave handler', e);
    }
  });
}

export function detachColyseusCombat(): void {
  room = null;
  predictRush = null;
}

export function colyseusSendCombat(action: 'melee' | 'fire', data: unknown): boolean {
  if (!room) {
    console.warn('@colyseusSendCombat: no combat room attached');
    return false;
  }
  if (action === 'melee') {
    room.send('combat.melee', data);
    try {
      predictLocalMelee(data);
    } catch (e) {
      console.warn('@predictLocalMelee', e);
    }
    return true;
  }
  if (action === 'fire') {
    // Server-authoritative VFX — Missiles.updatePosition drives flight.
    room.send('combat.fire', data);
    return true;
  }
  return false;
}
