import { Room } from 'colyseus.js';
import { FoundryNet } from './net';
import * as FoundryStore from './store';
import { AntennaEntity, EMPTY_MATERIALS, FoundryEnemyEntity, MaterialKey } from './types';

let syncPoll: ReturnType<typeof setInterval> | null = null;
let attachedRoom: Room | null = null;

const MATERIAL_KEYS = Object.keys(EMPTY_MATERIALS()) as MaterialKey[];

type SchemaCargo = {
  fud?: number;
  fomo?: number;
  alpha?: number;
  kek?: number;
  titheAccrued?: number;
} & Partial<Record<MaterialKey, number>>;

type SchemaAntenna = {
  id?: string;
  ownerSessionId?: string;
  x?: number;
  y?: number;
  hp?: number;
  powered?: boolean;
};

type SchemaEnemy = {
  id?: string;
  x?: number;
  y?: number;
  hp?: number;
  maxHp?: number;
  kind?: string;
};

type SchemaWildNode = {
  id?: string;
  remaining?: number;
};

function syncFromRoom(room: Room): void {
  const sessionId = room.sessionId;
  const state = room.state as {
    cargos?: { get: (id: string) => SchemaCargo | undefined };
    antennas?: { forEach: (cb: (a: SchemaAntenna, id: string) => void) => void };
    enemies?: { forEach: (cb: (e: SchemaEnemy, id: string) => void) => void };
    wildNodes?: { forEach: (cb: (n: SchemaWildNode, id: string) => void) => void };
  };

  const cargo = state.cargos?.get(sessionId);
  if (cargo) {
    const payload: SchemaCargo = {
      fud: cargo.fud,
      fomo: cargo.fomo,
      alpha: cargo.alpha,
      kek: cargo.kek,
      titheAccrued: cargo.titheAccrued,
    };
    for (const key of MATERIAL_KEYS) {
      if (cargo[key] != null) payload[key] = cargo[key];
    }
    FoundryStore.syncFromServerCargo(payload);
  }

  const antennas: AntennaEntity[] = [];
  state.antennas?.forEach((a) => {
    if (!a?.id) return;
    antennas.push({
      id: a.id,
      x: a.x ?? 0,
      y: a.y ?? 0,
      hp: a.hp ?? 100,
      powered: Boolean(a.powered),
      ownerId: a.ownerSessionId,
    });
  });
  FoundryStore.syncFromServerAntennas(antennas);

  const enemies: FoundryEnemyEntity[] = [];
  state.enemies?.forEach((e) => {
    if (!e?.id) return;
    enemies.push({
      id: e.id,
      x: e.x ?? 0,
      y: e.y ?? 0,
      hp: e.hp ?? 0,
      maxHp: e.maxHp ?? 100,
      kind: e.kind || 'linkbreaker',
    });
  });
  FoundryStore.syncFromServerEnemies(enemies);

  const remainingById: Record<string, number> = {};
  state.wildNodes?.forEach((n, id) => {
    const nodeId = n?.id || id;
    if (nodeId && n?.remaining != null) remainingById[nodeId] = n.remaining;
  });
  if (Object.keys(remainingById).length) {
    FoundryStore.syncWildNodeRemaining(remainingById);
  }
}

export function attachFoundryColyseusRoom(room: Room): void {
  attachedRoom = room;
  FoundryNet.attachRoom(room);
  FoundryStore.setFoundryEnabled(true);

  syncFromRoom(room);
  if (syncPoll) clearInterval(syncPoll);
  syncPoll = setInterval(() => {
    if (attachedRoom) syncFromRoom(attachedRoom);
  }, 100);
}

export function detachFoundryColyseusRoom(): void {
  if (syncPoll) {
    clearInterval(syncPoll);
    syncPoll = null;
  }
  attachedRoom = null;
  FoundryNet.attachRoom(null);
}
