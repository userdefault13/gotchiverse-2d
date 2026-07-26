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
  x?: number;
  y?: number;
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

function withLocalOrigin(data: unknown): unknown {
  const player = localPlayerSprite();
  if (!player || !data || typeof data !== 'object') return data;
  return {
    ...(data as Record<string, unknown>),
    x: Math.round(player.x),
    y: Math.round(player.y),
  };
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

  activeRoom.onMessage('combat.prize', (raw) => {
    try {
      const msg = raw as {
        ok?: boolean;
        amount?: string;
        token?: string;
        error?: string;
        message?: string;
      };
      // Lazy import avoids GameController ↔ colyseus cycle.
      void import('components/controllers/GameController').then((mod) => {
        const toastFn = mod.default?.handleToastNotification;
        if (!toastFn) return;
        if (msg?.ok && msg.amount) {
          const human = formatNvdaAmount(msg.amount);
          toastFn({
            message: `+${human} ${String(msg.token || 'nvda').toUpperCase()} credited to cartridge pocket`,
            autoClose: true,
            type: 'success',
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rh-pocket-updated'));
          }
        } else if (msg?.error === 'no_cartridge') {
          toastFn({
            message: msg.message || 'Mint an Aarcade cartridge to earn NVDA pocket prizes.',
            autoClose: true,
            type: 'info',
          });
        } else if (msg?.error === 'test_drop_disabled') {
          toastFn({
            message: msg.message || 'Test drop disabled (set RH_TEST_DROP_ENABLED=true).',
            autoClose: true,
            type: 'info',
          });
        } else if (msg?.error) {
          toastFn({
            message: msg.message || `Prize failed: ${msg.error}`,
            autoClose: true,
            type: 'error',
          });
        }
      });
    } catch (e) {
      console.warn('@combat.prize handler', e);
    }
  });

  activeRoom.onMessage('combat.hit', (raw) => {
    try {
      const msg = raw as {
        victimGotchiId?: string;
        hp?: number;
        maxHp?: number;
        damage?: number;
        evaded?: boolean;
      };
      const id = msg?.victimGotchiId != null ? String(msg.victimGotchiId) : '';
      if (!id) return;
      if (Number.isFinite(Number(msg.maxHp)) && scene?.[id]) {
        scene[id].maxHealth = Math.round(Number(msg.maxHp));
      }
      if (msg.evaded) {
        void import('components/controllers/GameController').then((mod) => {
          // Only toast for local victim to avoid spam in crowded rooms.
          if (String(Players.selectedPlayer?.id) === id) {
            mod.default?.handleToastNotification?.({
              message: 'Evaded!',
              autoClose: true,
              type: 'info',
            });
          }
        });
        return;
      }
      // KO broadcast handles death VFX — avoid double death from hit+ko.
      Players.handleDamage({
        id,
        health: Math.round(Number(msg.hp) || 0),
        damage: Math.round(Number(msg.damage) || 0),
        playerDied: false,
      } as any);
    } catch (e) {
      console.warn('@combat.hit handler', e);
    }
  });

  activeRoom.onMessage('combat.ko', (raw) => {
    try {
      const msg = raw as { victimGotchiId?: string; respawnMs?: number };
      const id = msg?.victimGotchiId != null ? String(msg.victimGotchiId) : '';
      if (!id) return;
      Players.setDeadState(id, true);
      Players.handlePlayerDeath(id);
      if (String(Players.selectedPlayer?.id) === id) {
        const ms = Number(msg.respawnMs) || 2500;
        void import('components/controllers/InputController').then((mod) => {
          mod.default?.updateDisableKeyboard?.(true);
          setTimeout(() => mod.default?.updateDisableKeyboard?.(false), ms);
        });
      }
    } catch (e) {
      console.warn('@combat.ko handler', e);
    }
  });

  let lastApDeniedToast = 0;
  activeRoom.onMessage('combat.ap_denied', (raw) => {
    try {
      const now = Date.now();
      if (now - lastApDeniedToast < 1500) return;
      lastApDeniedToast = now;
      const msg = raw as { message?: string };
      void import('components/controllers/GameController').then((mod) => {
        mod.default?.handleToastNotification?.({
          message: msg?.message || 'Not enough stamina',
          autoClose: true,
          type: 'info',
        });
      });
    } catch (e) {
      console.warn('@combat.ap_denied handler', e);
    }
  });

  activeRoom.onMessage('combat.respawn', (raw) => {
    try {
      const msg = raw as {
        gotchiId?: string;
        x?: number;
        y?: number;
        hp?: number;
        maxHp?: number;
        ap?: number;
        maxAp?: number;
      };
      if (msg?.gotchiId == null || msg.x == null || msg.y == null) return;
      const id = String(msg.gotchiId);
      Players.updatePlayerPosition({ id, x: msg.x, y: msg.y, noTween: true });
      if (Number.isFinite(Number(msg.maxHp)) && scene?.[id]) {
        scene[id].maxHealth = Math.round(Number(msg.maxHp));
      }
      if (Number.isFinite(Number(msg.hp))) {
        Players.updateHealth({ id, health: Math.round(Number(msg.hp)) } as any);
      }
      Players.handleRespawn(id, 2500);
      if (String(Players.selectedPlayer?.id) === id) {
        void import('components/controllers/InputController').then((mod) => {
          mod.default?.updateDisableKeyboard?.(false);
        });
        if (Number.isFinite(Number(msg.ap))) {
          void import('contexts/GlobalState').then((mod) => {
            const GS = mod.default;
            GS.REALM.dispatch({ type: 'UPDATE_PLAYERS_AP', AP: Math.round(Number(msg.ap)) });
          });
        }
      }
    } catch (e) {
      console.warn('@combat.respawn handler', e);
    }
  });
}

function formatNvdaAmount(raw: string): string {
  try {
    const bi = BigInt(String(raw).split('.')[0] || '0');
    const scale = BigInt('1000000000000000000');
    const whole = bi / scale;
    const frac = bi % scale;
    const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '').slice(0, 6);
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return String(raw);
  }
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
    const payload = withLocalOrigin(data);
    room.send('combat.melee', payload);
    try {
      predictLocalMelee(payload);
    } catch (e) {
      console.warn('@predictLocalMelee', e);
    }
    return true;
  }
  if (action === 'fire') {
    // Server-authoritative VFX — Missiles.updatePosition drives flight.
    room.send('combat.fire', withLocalOrigin(data));
    return true;
  }
  return false;
}
