import Melee from 'components/phaser/Melee';
import Missiles from 'components/phaser/Missiles';
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

type RushPredict = (opts: {
  gotchiId?: string;
  direction: { x: number; y: number };
  distance?: number;
  speed?: number;
}) => void;

let room: RoomLike | null = null;
let predictRush: RushPredict | null = null;

export function attachColyseusCombat(
  activeRoom: RoomLike | null,
  opts?: { predictRush?: RushPredict },
): void {
  room = activeRoom;
  predictRush = opts?.predictRush || null;
  if (!activeRoom) return;

  activeRoom.onMessage('combat.enter', (raw) => {
    const msg = raw as CombatEnterMsg;
    if (msg?.missile?.length) Missiles.create(msg.missile);
    if (msg?.melee?.length) {
      Melee.create(msg.melee);
      for (const melee of msg.melee) {
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
  });

  activeRoom.onMessage('combat.positions', (raw) => {
    const msg = raw as CombatPositionsMsg;
    if (msg?.missile?.length) Missiles.updatePosition(msg.missile as Missile[]);
    // Melee slap/rush sprites are player-attached; rush body motion is via Player schema + predictRush.
  });

  activeRoom.onMessage('combat.leave', (raw) => {
    const msg = raw as CombatLeaveMsg;
    if (msg?.missile?.length) Missiles.destroy(msg.missile as Missile[]);
    if (msg?.melee?.length) Melee.destroy(msg.melee as MeleeShape[]);
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
    return true;
  }
  if (action === 'fire') {
    room.send('combat.fire', data);
    return true;
  }
  return false;
}
