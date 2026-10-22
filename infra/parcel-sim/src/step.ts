import { BUILDABLE, CLAIM_COOLDOWN, DECISION_TICK, GRID, MAX_HARVESTERS, typeOf } from './rules.ts';
import { altarLevel, available, settle, survey, upgradeQueueCapacity } from './world.ts';
import type { Action, Alch, InstallationType, SimConfig, World } from './types.ts';

export type StepResult = { ok: true } | { ok: false; reason: string };

/** Not a contract rule: the owner's goal leaves this alchemica type undeveloped. */
export const GOAL_EXCLUDED = 'alchemica type not in owner goal';

function affordable(budget: Alch, cost: Alch): boolean {
  return budget.every((b, i) => b + 1e-9 >= cost[i]);
}

function pay(world: World, cost: Alch): void {
  for (let i = 0; i < 4; i++) {
    world.budget[i] -= cost[i];
    world.stats.spent[i] += cost[i];
  }
}

function occupied(world: World): Set<string> {
  const cells = new Set<string>();
  for (const p of world.placed) {
    const t = typeOf(p.typeId);
    for (let x = p.x; x < p.x + t.width; x++) for (let y = p.y; y < p.y + t.height; y++) cells.add(`${x},${y}`);
  }
  return cells;
}

/** LibRealm.placeInstallation bounds and "Invalid spot" checks */
function placementError(world: World, t: InstallationType, x: number, y: number, cells = occupied(world)): string | null {
  const g = GRID[world.size];
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return 'bad coordinates';
  if (x > g.w - t.width) return 'x exceeding width';
  if (y > g.h - t.height) return 'y exceeding height';
  for (let cx = x; cx < x + t.width; cx++) for (let cy = y; cy < y + t.height; cy++) if (cells.has(`${cx},${cy}`)) return 'Invalid spot';
  return null;
}

/** RealmFacet.equipInstallation + LibAlchemica.increaseTraits checks, everything except placement */
function buildError(world: World, t: InstallationType | undefined): string | null {
  if (!t || !BUILDABLE.includes(t)) return 'not a buildable level-1 harvester or reservoir';
  if (!world.goalAlchemica[t.alchemicaType]) return GOAL_EXCLUDED;
  if (t.craftTime > 0) return 'craft queue not modeled';
  if (world.currentRound < 1) return 'Must survey before equipping';
  if (altarLevel(world) < t.prerequisites[0]) return 'Altar Tech Tree Reqs not met';
  if (t.kind === 'harvester') {
    const sameReservoir = world.placed.some((p) => {
      const pt = typeOf(p.typeId);
      return pt.kind === 'reservoir' && pt.alchemicaType === t.alchemicaType;
    });
    if (!sameReservoir) return 'Must equip reservoir of type';
    const harvesters = world.placed.filter((p) => typeOf(p.typeId).kind === 'harvester').length;
    if (harvesters >= MAX_HARVESTERS[world.size]) return 'Too many harvesters';
  }
  if (!affordable(world.budget, t.alchemicaCost)) return 'insufficient budget';
  return null;
}

/** InstallationUpgradeFacet.upgradeInstallation + LibInstallation.checkUpgrade */
function upgradeError(world: World, x: number, y: number): string | null {
  const p = world.placed.find((q) => q.x === x && q.y === y);
  if (!p) return 'wrong installationId';
  if (world.upgradeQueue.some((u) => u.x === x && u.y === y)) return 'already in upgrade queue';
  const cur = typeOf(p.typeId);
  if (cur.nextLevelId === 0) return 'Maximum upgrade reached';
  const next = typeOf(cur.nextLevelId);
  if (next.deprecated) return 'Installation deprecated';
  if (next.kind !== 'altar' && !world.goalAlchemica[next.alchemicaType]) return GOAL_EXCLUDED;
  if (next.prerequisites[0] > altarLevel(world)) return 'Altar Tech Tree Reqs not met';
  if (world.upgradeQueue.length >= upgradeQueueCapacity(world)) return 'upgrade queue full';
  if (!affordable(world.budget, next.alchemicaCost)) return 'insufficient budget';
  return null;
}

/** First free spot for a type, scanning row by row on its own footprint. */
export function firstFreeSpot(world: World, t: InstallationType, cells = occupied(world)): { x: number; y: number } | null {
  const g = GRID[world.size];
  for (let y = 0; y <= g.h - t.height; y += t.height)
    for (let x = 0; x <= g.w - t.width; x += t.width) if (!placementError(world, t, x, y, cells)) return { x, y };
  return null;
}

export function apply(world: World, action: Action, config: SimConfig): StepResult {
  switch (action.kind) {
    case 'claim': {
      if (world.time < world.lastClaimedAt + CLAIM_COOLDOWN) return { ok: false, reason: '8 hours claim cooldown' };
      const avail = available(world);
      for (let i = 0; i < 4; i++) settle(world, i);
      for (let i = 0; i < 4; i++) {
        const amount = Math.min(world.alchemicaRemaining[i], avail[i]);
        world.alchemicaRemaining[i] -= amount;
        world.unclaimed[i] = 0;
        world.lastUpdate[i] = world.time;
        world.stats.harvested[i] += amount;
        const back = amount * config.reinvestShare;
        world.budget[i] += back;
        world.stats.fundedByOwner[i] += back;
      }
      world.lastClaimedAt = world.time;
      world.stats.claims++;
      return { ok: true };
    }
    case 'build': {
      const t = (() => {
        try {
          return typeOf(action.typeId);
        } catch {
          return undefined;
        }
      })();
      const err = buildError(world, t) ?? placementError(world, t!, action.x, action.y);
      if (err) return { ok: false, reason: err };
      settle(world, t!.alchemicaType);
      pay(world, t!.alchemicaCost);
      world.placed.push({ typeId: t!.id, x: action.x, y: action.y });
      world.stats.builds++;
      return { ok: true };
    }
    case 'upgrade': {
      const err = upgradeError(world, action.x, action.y);
      if (err) return { ok: false, reason: err };
      const p = world.placed.find((q) => q.x === action.x && q.y === action.y)!;
      const next = typeOf(typeOf(p.typeId).nextLevelId);
      pay(world, next.alchemicaCost);
      world.upgradeQueue.push({
        x: p.x,
        y: p.y,
        fromTypeId: p.typeId,
        toTypeId: next.id,
        readyAt: world.time + next.craftTime * config.blockTimeSec,
      });
      world.stats.upgrades++;
      return { ok: true };
    }
    case 'wait':
      advance(world, config, action.until);
      return { ok: true };
  }
}

/** Jump the clock to the next moment something can change, then process it. */
export function advance(world: World, config: SimConfig, until?: number): void {
  const events = [world.horizon, world.nextSurveyAt, ...world.upgradeQueue.map((u) => u.readyAt)];
  const claimAt = world.lastClaimedAt + CLAIM_COOLDOWN;
  if (claimAt > world.time) events.push(claimAt);
  if (until !== undefined && until > world.time) events.push(until);
  else events.push(world.time + DECISION_TICK);
  world.time = Math.min(world.horizon, Math.min(...events.filter((e) => e > world.time)));

  for (const u of world.upgradeQueue.filter((q) => q.readyAt <= world.time)) {
    const p = world.placed.find((q) => q.x === u.x && q.y === u.y)!;
    settle(world, typeOf(u.toTypeId).alchemicaType);
    p.typeId = u.toTypeId;
  }
  world.upgradeQueue = world.upgradeQueue.filter((q) => q.readyAt > world.time);
  if (world.time >= world.nextSurveyAt) survey(world, config);
}

/** Everything legalActions depends on besides the clock. */
function legalKey(world: World): string {
  const claimable = world.time >= world.lastClaimedAt + CLAIM_COOLDOWN;
  const placed = world.placed.map((p) => `${p.typeId}@${p.x},${p.y}`).join();
  const queue = world.upgradeQueue.map((u) => `${u.x},${u.y}`).join();
  return `${claimable}|${world.size}|${world.currentRound}|${world.budget.join()}|${placed}|${queue}|${world.goalAlchemica}`;
}

// Most decision ticks change nothing but the clock, so reuse the last list per world until the key changes.
const legalCache = new WeakMap<World, { key: string; actions: Action[] }>();

/** Every action that would succeed right now. Builds use the first free spot. */
export function legalActions(world: World): Action[] {
  const key = legalKey(world);
  const hit = legalCache.get(world);
  if (hit?.key === key) return hit.actions.slice();
  const out: Action[] = [{ kind: 'wait' }];
  if (world.time >= world.lastClaimedAt + CLAIM_COOLDOWN) out.push({ kind: 'claim' });
  const cells = occupied(world);
  for (const t of BUILDABLE) {
    if (buildError(world, t)) continue;
    const spot = firstFreeSpot(world, t, cells);
    if (spot) out.push({ kind: 'build', typeId: t.id, ...spot });
  }
  for (const p of world.placed) if (!upgradeError(world, p.x, p.y)) out.push({ kind: 'upgrade', x: p.x, y: p.y });
  legalCache.set(world, { key, actions: out });
  return out.slice();
}
