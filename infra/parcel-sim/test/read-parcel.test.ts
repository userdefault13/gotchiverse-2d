import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALTAR_L1, FUD_HARVESTER_L1, FUD_RESERVOIR_L1 } from '../src/rules.ts';
import { installationsFromGrid } from '../src/read-parcel.ts';

test('the type-id grid decodes back into one installation per footprint, including side-by-side twins', () => {
  // 8x8 humble grid indexed [x][y]: altar at (0,0), two FUD harvesters side by side at (2,0) and (4,0),
  // a reservoir at (0,6), and an id the sim doesn't know at (7,7).
  const grid = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const put = (id: number, x: number, y: number, w = 2, h = 2) => {
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) grid[x + dx][y + dy] = id;
  };
  put(ALTAR_L1, 0, 0);
  put(FUD_HARVESTER_L1, 2, 0);
  put(FUD_HARVESTER_L1, 4, 0);
  put(FUD_RESERVOIR_L1, 0, 6);
  grid[7][7] = 99_999;
  const unknown = new Set<number>();
  assert.deepEqual(installationsFromGrid(grid, unknown), [
    { typeId: ALTAR_L1, x: 0, y: 0 },
    { typeId: FUD_HARVESTER_L1, x: 2, y: 0 },
    { typeId: FUD_HARVESTER_L1, x: 4, y: 0 },
    { typeId: FUD_RESERVOIR_L1, x: 0, y: 6 },
  ]);
  assert.deepEqual([...unknown], [99_999]);
});
