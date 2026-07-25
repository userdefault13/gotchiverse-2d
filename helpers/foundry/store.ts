import { FOUNDRY_DEFAULTS, FOUNDRY_DEMO_NODES, FOUNDRY_WALL_RECEIVERS, FoundryRemoteConfig } from './config';
import { canReachReceiver, netherlinkFromMesh } from './graph';
import { getFoundryRecipe } from './recipes';
import {
  AntennaEntity,
  EMPTY_ALCHEMICA,
  EMPTY_MATERIALS,
  FOUNDRY_STORAGE_KEY,
  FoundryAlchemica,
  FoundryEnemyEntity,
  FoundryMaterials,
  FoundryState,
  MaterialKey,
  VeinType,
} from './types';

type Listener = (state: FoundryState) => void;

const listeners = new Set<Listener>();

const MATERIAL_KEYS = Object.keys(EMPTY_MATERIALS()) as MaterialKey[];

function cloneNodes() {
  return FOUNDRY_DEMO_NODES.map((n) => ({ ...n }));
}

function seedLocalEnemies(): FoundryEnemyEntity[] {
  return FOUNDRY_DEMO_NODES.filter((n) => n.veinType !== 'yield').map((n, i) => ({
    id: `${n.id}-scout`,
    x: n.x + 1500,
    y: n.y - 1200,
    hp: FOUNDRY_DEFAULTS.enemyHp,
    maxHp: FOUNDRY_DEFAULTS.enemyHp,
    kind: 'linkbreaker',
  }));
}

function defaultState(enabled = false): FoundryState {
  return {
    enabled,
    pollution: 0,
    titheAccrued: 0,
    powerGen: 1,
    powerDraw: 0,
    netherlink: 'black',
    cargo: EMPTY_ALCHEMICA(),
    materials: EMPTY_MATERIALS(),
    wildNodes: cloneNodes(),
    wallReceivers: FOUNDRY_WALL_RECEIVERS.map((r) => ({ ...r })),
    antennas: [],
    enemies: seedLocalEnemies(),
    walkLedgerHint: 'Mesh dark — open Walk Ledger to South Rim Receiver.',
    maxAntennas: FOUNDRY_DEFAULTS.maxAntennas,
    antennaLinkRangePx: FOUNDRY_DEFAULTS.antennaLinkRangePx,
  };
}

let state: FoundryState = load() || defaultState(false);

function load(): FoundryState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FOUNDRY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FoundryState>;
    return {
      ...defaultState(Boolean(parsed.enabled)),
      ...parsed,
      cargo: { ...EMPTY_ALCHEMICA(), ...(parsed.cargo || {}) },
      materials: { ...EMPTY_MATERIALS(), ...(parsed.materials || {}) },
      enemies: parsed.enemies?.length ? parsed.enemies : seedLocalEnemies(),
    };
  } catch {
    return null;
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOUNDRY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function refreshMesh() {
  const reachable = canReachReceiver(state.antennas, state.wallReceivers, state.antennaLinkRangePx);
  state.netherlink = netherlinkFromMesh(reachable, state.antennas);
  if (state.netherlink === 'green') {
    state.walkLedgerHint = 'Netherlink green — mesh transfer available.';
  } else if (state.netherlink === 'amber') {
    state.walkLedgerHint = 'Mesh unstable — Walk Ledger recommended.';
  } else {
    state.walkLedgerHint = 'Mesh dark — walk cargo to South Rim Receiver.';
  }
}

function emit() {
  refreshMesh();
  persist();
  const snapshot = getState();
  listeners.forEach((l) => l(snapshot));
}

export function getState(): FoundryState {
  return {
    ...state,
    cargo: { ...state.cargo },
    materials: { ...state.materials },
    wildNodes: state.wildNodes.map((n) => ({ ...n })),
    wallReceivers: state.wallReceivers.map((r) => ({ ...r })),
    antennas: state.antennas.map((a) => ({ ...a })),
    enemies: state.enemies.map((e) => ({ ...e })),
  };
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setFoundryEnabled(enabled: boolean) {
  state.enabled = enabled;
  emit();
}

export function applyRemoteConfig(cfg: FoundryRemoteConfig) {
  state.enabled = cfg.enableParcelFoundryPoC;
  state.antennaLinkRangePx = cfg.antennaLinkRangePx || state.antennaLinkRangePx;
  state.maxAntennas = cfg.maxAntennasPerPlayer || state.maxAntennas;
  if (cfg.wildNodes?.length) {
    state.wildNodes = cfg.wildNodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      veinType: n.veinType,
      label: n.label || n.id,
      remaining: n.remaining ?? 500,
    }));
  }
  if (cfg.wallReceivers?.length) {
    state.wallReceivers = cfg.wallReceivers.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      label: r.label || r.id,
    }));
  }
  emit();
}

export function addPollution(amount = FOUNDRY_DEFAULTS.pollutionPerChannelSpill) {
  state.pollution = Math.min(100, state.pollution + amount);
  emit();
}

function cargoTotal(c: FoundryAlchemica) {
  return c.fud + c.fomo + c.alpha + c.kek;
}

function grantOre(key: MaterialKey, amount: number) {
  state.materials[key] += amount;
}

export function gatherFromNode(nodeId: string): { ok: boolean; message: string } {
  const node = state.wildNodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, message: 'Unknown wild node' };
  if (node.remaining <= 0) return { ok: false, message: 'Vein depleted' };

  const take = Math.min(1, node.remaining);
  node.remaining -= take;

  const ore = FOUNDRY_DEFAULTS.oreGatherAmount;
  const gas = FOUNDRY_DEFAULTS.gasGatherAmount;
  const g = FOUNDRY_DEFAULTS.gatherAmount;

  switch (node.veinType as VeinType) {
    case 'yield':
      state.cargo.fud += g.fud;
      state.cargo.fomo += g.fomo;
      state.cargo.alpha += g.alpha;
      state.cargo.kek += g.kek;
      break;
    case 'iron':
      grantOre('ironOre', ore);
      break;
    case 'copper':
      grantOre('copperOre', ore);
      break;
    case 'aluminum':
      grantOre('aluminumOre', ore);
      break;
    case 'cobalt':
      grantOre('cobaltOre', ore);
      break;
    case 'methane':
      grantOre('methane', gas);
      break;
    case 'noxious':
      grantOre('noxiousGas', gas);
      break;
    default:
      return { ok: false, message: 'Unknown vein type' };
  }

  emit();
  return { ok: true, message: `Gathered from ${node.label}` };
}

export function depositAtReceiver(): { ok: boolean; message: string } {
  const total = cargoTotal(state.cargo);
  if (total <= 0) return { ok: false, message: 'No cargo to deposit' };
  state.titheAccrued += total;
  state.cargo = EMPTY_ALCHEMICA();
  emit();
  return { ok: true, message: `Deposited ${total} Alchemica to tithe` };
}

export function bounceFreight(): { ok: boolean; message: string } {
  const result = depositAtReceiver();
  if (!result.ok) return result;
  return { ok: true, message: 'Bounce Freight hopped cargo to wall receiver' };
}

export function placeAntenna(x: number, y: number, ownerId = 'local'): { ok: boolean; message: string; antenna?: AntennaEntity } {
  if (state.antennas.length >= state.maxAntennas) {
    return { ok: false, message: `Max ${state.maxAntennas} antennas` };
  }
  if (state.materials.antennaRelay < 1) {
    return { ok: false, message: 'Need 1 Antenna Relay (craft or buy kit)' };
  }
  state.materials.antennaRelay -= 1;

  const antenna: AntennaEntity = {
    id: `ant-${Date.now()}-${state.antennas.length}`,
    x,
    y,
    hp: 100,
    powered: true,
    ownerId,
  };
  state.antennas.push(antenna);
  state.powerDraw = state.antennas.length * 0.3;
  emit();
  return { ok: true, message: 'Antenna placed', antenna };
}

export function meshTransfer(from?: { x: number; y: number }): { ok: boolean; message: string } {
  const reachable = canReachReceiver(state.antennas, state.wallReceivers, state.antennaLinkRangePx, from);
  if (!reachable) {
    state.netherlink = 'black';
    state.lastMeshBreakAt = Date.now();
    emit();
    return { ok: false, message: 'Antenna Spine broken — open Walk Ledger' };
  }
  return depositAtReceiver();
}

export function damageAntenna(antennaId: string, amount = FOUNDRY_DEFAULTS.factionDamageHp): { ok: boolean; message: string } {
  const ant = state.antennas.find((a) => a.id === antennaId);
  if (!ant) return { ok: false, message: 'Antenna not found' };
  ant.hp = Math.max(0, ant.hp - amount);
  if (ant.hp <= 0) {
    ant.powered = false;
    state.lastMeshBreakAt = Date.now();
  }
  emit();
  return {
    ok: true,
    message: ant.hp <= 0 ? 'Desert Link-breaker destroyed a hop — Walk Ledger' : `Antenna damaged (${ant.hp} HP)`,
  };
}

export function factionPulse(): { ok: boolean; message: string } {
  const live = state.antennas.filter((a) => a.powered && a.hp > 0);
  if (!live.length) return { ok: false, message: 'No live antennas to raid' };
  const receiver = state.wallReceivers[0];
  live.sort((a, b) => {
    const da = Math.hypot(a.x - receiver.x, a.y - receiver.y);
    const db = Math.hypot(b.x - receiver.x, b.y - receiver.y);
    return db - da;
  });
  return damageAntenna(live[0].id);
}

export function syncFromServerCargo(
  cargo: Partial<FoundryAlchemica & FoundryMaterials & { titheAccrued?: number }>,
) {
  if (cargo.fud != null) state.cargo.fud = cargo.fud;
  if (cargo.fomo != null) state.cargo.fomo = cargo.fomo;
  if (cargo.alpha != null) state.cargo.alpha = cargo.alpha;
  if (cargo.kek != null) state.cargo.kek = cargo.kek;
  for (const key of MATERIAL_KEYS) {
    if (cargo[key] != null) state.materials[key] = cargo[key] as number;
  }
  if (cargo.titheAccrued != null) state.titheAccrued = cargo.titheAccrued;
  emit();
}

export function syncFromServerAntennas(antennas: AntennaEntity[]) {
  state.antennas = antennas.map((a) => ({ ...a }));
  state.powerDraw = state.antennas.length * 0.3;
  emit();
}

export function syncFromServerEnemies(enemies: FoundryEnemyEntity[]) {
  state.enemies = enemies.map((e) => ({ ...e }));
  emit();
}

export function syncWildNodeRemaining(remainingById: Record<string, number>) {
  state.wildNodes = state.wildNodes.map((n) =>
    remainingById[n.id] != null ? { ...n, remaining: remainingById[n.id] } : n,
  );
  emit();
}

export function hitEnemy(enemyId: string): { ok: boolean; message: string } {
  const enemy = state.enemies.find((e) => e.id === enemyId);
  if (!enemy) return { ok: false, message: 'Enemy not found' };
  if (enemy.hp <= 0) return { ok: false, message: 'Already down' };

  enemy.hp = Math.max(0, enemy.hp - FOUNDRY_DEFAULTS.enemyHitDamage);
  if (enemy.hp > 0) {
    emit();
    return { ok: true, message: `Hit link-breaker (${enemy.hp} HP)` };
  }

  // Random alchemica drop (offline)
  const dropChance = 0.75;
  if (Math.random() <= dropChance) {
    const rolls: Array<[keyof FoundryAlchemica, number, number, number]> = [
      ['fud', 0.7, 3, 12],
      ['fomo', 0.55, 2, 8],
      ['alpha', 0.35, 1, 5],
      ['kek', 0.2, 1, 3],
    ];
    const gained: string[] = [];
    for (const [token, chance, min, max] of rolls) {
      if (Math.random() > chance) continue;
      const amt = min + Math.floor(Math.random() * (max - min + 1));
      state.cargo[token] += amt;
      gained.push(`${amt} ${token.toUpperCase()}`);
    }
    state.enemies = state.enemies.filter((e) => e.id !== enemyId);
    // Respawn locally after delay
    window.setTimeout(() => {
      if (state.enemies.some((e) => e.id === enemyId)) return;
      const node = state.wildNodes.find((n) => enemyId.startsWith(n.id));
      state.enemies.push({
        id: enemyId,
        x: (node?.x || enemy.x) + 1500,
        y: (node?.y || enemy.y) - 1200,
        hp: FOUNDRY_DEFAULTS.enemyHp,
        maxHp: FOUNDRY_DEFAULTS.enemyHp,
        kind: 'linkbreaker',
      });
      emit();
    }, 45000);
    emit();
    return {
      ok: true,
      message: gained.length ? `Link-breaker down — looted ${gained.join(', ')}` : 'Link-breaker down — no loot',
    };
  }

  state.enemies = state.enemies.filter((e) => e.id !== enemyId);
  emit();
  return { ok: true, message: 'Link-breaker down — no loot' };
}

export function craftRecipe(recipeId: string): { ok: boolean; message: string } {
  const recipe = getFoundryRecipe(recipeId);
  if (!recipe) return { ok: false, message: 'Unknown recipe' };

  for (const [key, need] of Object.entries(recipe.inputs)) {
    const k = key as MaterialKey;
    if ((state.materials[k] || 0) < (need || 0)) {
      return { ok: false, message: `Need more ${key}` };
    }
  }
  for (const [token, need] of Object.entries(recipe.power)) {
    const t = token as keyof FoundryAlchemica;
    if ((state.cargo[t] || 0) < (need || 0)) {
      return { ok: false, message: `Need more ${token.toUpperCase()} power` };
    }
  }

  for (const [key, need] of Object.entries(recipe.inputs)) {
    state.materials[key as MaterialKey] -= need || 0;
  }
  for (const [token, need] of Object.entries(recipe.power)) {
    state.cargo[token as keyof FoundryAlchemica] -= need || 0;
  }
  for (const [key, gain] of Object.entries(recipe.outputs)) {
    state.materials[key as MaterialKey] += gain || 0;
  }
  emit();
  return { ok: true, message: `Crafted ${recipe.label}` };
}

export function resetFoundryPoC() {
  const enabled = state.enabled;
  state = defaultState(enabled);
  emit();
}
