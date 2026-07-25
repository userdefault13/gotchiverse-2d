import { AntennaEntity, WallReceiverDef } from './types';

type GraphNode = { id: string; x: number; y: number };

function dist(a: GraphNode, b: GraphNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Tesla daisy-chain: powered antennas with hp>0 must form a path to a wall receiver
 * within linkRangePx between hops. Optional start position acts as the cargo origin hop.
 */
export function canReachReceiver(
  antennas: AntennaEntity[],
  receivers: WallReceiverDef[],
  linkRangePx: number,
  start?: { x: number; y: number },
): boolean {
  if (!receivers.length) return false;
  const live = antennas.filter((a) => a.powered && a.hp > 0);
  if (!live.length && !start) return false;

  const nodes: GraphNode[] = [
    ...live.map((a) => ({ id: a.id, x: a.x, y: a.y })),
    ...receivers.map((r) => ({ id: `recv:${r.id}`, x: r.x, y: r.y })),
  ];

  const startId = '__start__';
  if (start) {
    nodes.unshift({ id: startId, x: start.x, y: start.y });
  }

  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (dist(nodes[i], nodes[j]) <= linkRangePx) {
        adj.get(nodes[i].id)!.push(nodes[j].id);
        adj.get(nodes[j].id)!.push(nodes[i].id);
      }
    }
  }

  const seeds = start ? [startId] : live.map((a) => a.id);
  const goals = new Set(receivers.map((r) => `recv:${r.id}`));
  const seen = new Set<string>();
  const queue = [...seeds];

  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (goals.has(id)) return true;
    for (const next of adj.get(id) || []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return false;
}

export function netherlinkFromMesh(reachable: boolean, antennas: AntennaEntity[]): 'green' | 'amber' | 'black' {
  if (!antennas.length) return 'black';
  const live = antennas.filter((a) => a.powered && a.hp > 0);
  if (!live.length) return 'black';
  if (!reachable) return 'amber';
  const damaged = live.some((a) => a.hp < 100);
  return damaged ? 'amber' : 'green';
}
