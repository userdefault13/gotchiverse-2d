import { FOUNDRY_DEFAULTS, FOUNDRY_DEMO_NODES, FOUNDRY_WALL_RECEIVERS, FoundryRemoteConfig } from './config';
import { canReachReceiver, netherlinkFromMesh } from './graph';
import {
  AntennaEntity,
  EMPTY_ALCHEMICA,
  EMPTY_SALVAGE,
  FOUNDRY_STORAGE_KEY,
  FoundryAlchemica,
  FoundryState,
  FoundrySalvage,
} from './types';

type Listener = (state: FoundryState) => void;

const listeners = new Set<Listener>();

function cloneNodes() {
  return FOUNDRY_DEMO_NODES.map((n) => ({ ...n }));
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
    salvage: EMPTY_SALVAGE(),
    wildNodes: cloneNodes(),
    wallReceivers: FOUNDRY_WALL_RECEIVERS.map((r) => ({ ...r })),
    antennas: [],
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
    const parsed = JSON.parse(raw) as FoundryState;
    return { ...defaultState(parsed.enabled), ...parsed };
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
    salvage: { ...state.salvage },
    wildNodes: state.wildNodes.map((n) => ({ ...n })),
    wallReceivers: state.wallReceivers.map((r) => ({ ...r })),
    antennas: state.antennas.map((a) => ({ ...a })),
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
      veinType: (n.veinType as 'yield' | 'desert_salvage') || 'yield',
      label: (n as { label?: string }).label || n.id,
      remaining: n.remaining ?? 500,
    }));
  }
  if (cfg.wallReceivers?.length) {
    state.wallReceivers = cfg.wallReceivers.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      label: (r as { label?: string }).label || r.id,
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

export function gatherFromNode(nodeId: string): { ok: boolean; message: string } {
  const node = state.wildNodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, message: 'Unknown wild node' };
  if (node.remaining <= 0) return { ok: false, message: 'Vein depleted' };

  const take = Math.min(1, node.remaining);
  node.remaining -= take;

  if (node.veinType === 'yield') {
    const g = FOUNDRY_DEFAULTS.gatherAmount;
    state.cargo.fud += g.fud;
    state.cargo.fomo += g.fomo;
    state.cargo.alpha += g.alpha;
    state.cargo.kek += g.kek;
  } else {
    const g = FOUNDRY_DEFAULTS.gatherAmount;
    state.cargo.fud += Math.floor(g.fud / 2);
    state.cargo.fomo += g.fomo;
    const s = FOUNDRY_DEFAULTS.salvagePerDesertGather;
    state.salvage.antenna += s.antenna;
    state.salvage.dish += s.dish;
    state.salvage.slag += s.slag;
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
  if (state.salvage.antenna < 1 && state.salvage.dish < 1) {
    // Allow first placement without salvage for demo onboarding
    if (state.antennas.length > 0) {
      return { ok: false, message: 'Need antenna or dish salvage to place relay' };
    }
  } else {
    if (state.salvage.antenna > 0) state.salvage.antenna -= 1;
    else state.salvage.dish -= 1;
  }

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

export function syncFromServerCargo(cargo: Partial<FoundryAlchemica & FoundrySalvage & { titheAccrued?: number }>) {
  if (cargo.fud != null) state.cargo.fud = cargo.fud;
  if (cargo.fomo != null) state.cargo.fomo = cargo.fomo;
  if (cargo.alpha != null) state.cargo.alpha = cargo.alpha;
  if (cargo.kek != null) state.cargo.kek = cargo.kek;
  if (cargo.antenna != null) state.salvage.antenna = cargo.antenna;
  if (cargo.dish != null) state.salvage.dish = cargo.dish;
  if (cargo.slag != null) state.salvage.slag = cargo.slag;
  if (cargo.titheAccrued != null) state.titheAccrued = cargo.titheAccrued;
  emit();
}

export function resetFoundryPoC() {
  const enabled = state.enabled;
  state = defaultState(enabled);
  emit();
}
