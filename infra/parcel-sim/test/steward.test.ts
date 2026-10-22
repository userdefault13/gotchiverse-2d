import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rightsCall, summarize } from '../src/steward.ts';
import { ALTAR_L1, FUD_HARVESTER_L1, FUD_RESERVOIR_L1 } from '../src/rules.ts';
import type { ParcelInfo } from '../src/read-parcel.ts';

test('rights: extract grants only claim, build grants claim, equip and upgrade, all whitelist-only', () => {
  assert.deepEqual(rightsCall(['7565'], 'extract', '12').args, ['[7565]', '[1]', '[2]', '[12]']);
  assert.deepEqual(rightsCall(['7565', '44113'], 'build', '12').args, [
    '[7565,7565,7565,44113,44113,44113]',
    '[1,2,6,1,2,6]',
    '[2,2,2,2,2,2]',
    '[12,12,12,12,12,12]',
  ]);
});

test('rights: rejects anything that is not a plain number', () => {
  assert.throws(() => rightsCall(['7565;rm'], 'build', '12'));
  assert.throws(() => rightsCall(['7565'], 'build', '0x1'));
});

const base: ParcelInfo = {
  parcelId: '1', name: 'test', district: 1, owner: '0x0', size: 0, surveyRound: 2,
  remaining: [600, 0, 0, 0], available: [0, 0, 0, 0], lastClaimed: 0, unknownTypes: [], mismatches: [], upgradeQueue: [], block: 0,
  installations: [
    { typeId: ALTAR_L1, x: 0, y: 0 },
    { typeId: FUD_RESERVOIR_L1, x: 2, y: 0 },
    { typeId: FUD_HARVESTER_L1, x: 4, y: 0 },
  ],
};

test('summary: a harvesting parcel that runs dry says when to survey', () => {
  const s = summarize(base, 365);
  assert.ok(s.ratePerDay[0] > 0);
  assert.equal(s.surveyBy, s.runOutDay[0]);
  assert.match(s.status, /survey before day \d+/);
});

test('summary: unsurveyed and altar-less parcels point the owner at their own step', () => {
  assert.match(summarize({ ...base, surveyRound: 0 }, 365).status, /never surveyed/);
  assert.match(summarize({ ...base, installations: [] }, 365).status, /no altar/);
});
