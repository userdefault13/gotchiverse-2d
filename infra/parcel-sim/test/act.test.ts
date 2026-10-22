import assert from 'node:assert/strict';
import { test } from 'node:test';
import { budgetLeft, claimedFromLogs, decide, parseGoals, pullable, reinvestOwed, spendProblems, stepsFor, type Goals, type Ledger, type ParcelGoal, type Wallet } from '../src/act.ts';
import { REALM_DIAMOND } from '../src/chain.ts';
import { parseUpgradeQueue, type ParcelInfo } from '../src/read-parcel.ts';
import { ALTAR_L1, FUD_HARVESTER_L1, FUD_RESERVOIR_L1, typeOf } from '../src/rules.ts';

const OWNER = '0x2127AA7265D573Aa467f1D73554D17890b872E76';
const STEWARD = '0x00000000000000000000000000000000000000b0';
const NOW = 1_800_000_000;
const goals: Goals = { name: 'parcel-steward', owner: OWNER, steward: STEWARD, gotchiId: '3033', parcels: {} };
const maxGoal: ParcelGoal = { alchemica: [true, true, true, true], mode: 'max', budget: [2000, 1000, 100, 50], reinvestShare: 0.5, horizonDays: 365, since: '2027-01-15' };
const extractGoal: ParcelGoal = { ...maxGoal, mode: 'extract', budget: [0, 0, 0, 0] };

const parcel: ParcelInfo = {
  parcelId: '22361', name: 't', district: 1, owner: OWNER, size: 0, surveyRound: 10,
  remaining: [26_000, 13_000, 7_000, 2_800], available: [40, 0, 0, 0], lastClaimed: NOW - 9 * 3600,
  installations: [
    { typeId: ALTAR_L1, x: 0, y: 0 },
    { typeId: FUD_RESERVOIR_L1, x: 2, y: 0 },
    { typeId: FUD_HARVESTER_L1, x: 4, y: 0 },
  ],
  unknownTypes: [], mismatches: [], upgradeQueue: [], block: 1_000_000,
};
const e18 = (n: number) => BigInt(Math.round(n * 1e6)) * 10n ** 12n;
const wallet = (allowance = 0n): Wallet => ({
  alchemica: ['0x' + '1'.repeat(40), '0x' + '2'.repeat(40), '0x' + '3'.repeat(40), '0x' + '4'.repeat(40)],
  balance: [e18(5000), e18(5000), e18(500), e18(500)],
  allowance: [allowance, allowance, allowance, allowance],
  held: new Map(),
  ownerAllowance: [e18(1e6), e18(1e6), e18(1e6), e18(1e6)],
  ownerBalance: [e18(1e6), e18(1e6), e18(1e6), e18(1e6)],
});
const ledger = (l: Partial<Ledger> = {}): Ledger => ({ spent: {}, claimed: {}, pulled: {}, entries: [], ...l });

test('goals: rejects bad addresses, ids and modes', () => {
  const ok = { owner: OWNER, steward: STEWARD, gotchiId: 3033, parcels: { '22361': maxGoal } };
  assert.equal(parseGoals(JSON.stringify(ok)).gotchiId, '3033');
  assert.throws(() => parseGoals(JSON.stringify({ ...ok, steward: '0x123' })));
  assert.throws(() => parseGoals(JSON.stringify({ ...ok, gotchiId: '1; rm -rf' })));
  assert.throws(() => parseGoals(JSON.stringify({ ...ok, parcels: { '1x': maxGoal } })));
  assert.throws(() => parseGoals(JSON.stringify({ ...ok, parcels: { '1': { ...maxGoal, mode: 'yolo' } } })));
  assert.throws(() => parseGoals(JSON.stringify({ ...ok, parcels: { '1': { ...maxGoal, live: 'yes' } } })));
});

test('budget left: spent comes off the budget, pulled reinvest adds to it; extract mode has none', () => {
  assert.deepEqual(budgetLeft(maxGoal, ledger({ spent: { '1': [500, 1200, 0, 0] } }), '1'), [1500, 0, 100, 50]);
  assert.deepEqual(budgetLeft(maxGoal, ledger({ spent: { '1': [500, 0, 0, 0] }, pulled: { '1': [300, 0, 0, 0] } }), '1'), [1800, 1000, 100, 50]);
  assert.deepEqual(budgetLeft(extractGoal, ledger(), '1'), [0, 0, 0, 0]);
});

test('max mode: owes its share of claimed alchemica less what was pulled; other modes owe nothing', () => {
  const l = ledger({ claimed: { '1': [1000, 200, 0, 0] }, pulled: { '1': [100, 0, 0, 0] } });
  assert.deepEqual(reinvestOwed(maxGoal, l, '1'), [400, 100, 0, 0]);
  assert.deepEqual(reinvestOwed({ ...maxGoal, mode: 'budget' }, l, '1'), [0, 0, 0, 0]);
});

test('max mode: pulls only what the owner allows and holds, rounded down', () => {
  const w = { ...wallet(), ownerAllowance: [e18(50), e18(1e6), 0n, 0n], ownerBalance: [e18(1e6), 30_123_456_789_000_000_000n, 0n, 0n] };
  assert.deepEqual(pullable([400, 100, 5, 0], w), [50, 30.123456, 0, 0]);
});

test('max mode: reinvest is pulled before building once it is worth the gas, and never more than owed', () => {
  const next = decide({ ...parcel, available: [0, 0, 0, 0] }, maxGoal, [2000, 1000, 100, 50], NOW, [40, 0, 0, 0]);
  assert.deepEqual(next.kind === 'act' && next.action, { kind: 'reinvest', amounts: [40, 0, 0, 0] });
  const small = decide({ ...parcel, available: [0, 0, 0, 0] }, maxGoal, [2000, 1000, 100, 50], NOW, [1, 0, 0, 0]);
  assert.notEqual(small.kind === 'act' && small.action.kind, 'reinvest');
  const steps = stepsFor({ kind: 'reinvest', amounts: [40, 0, 0, 0] }, parcel, goals, wallet(), new Map());
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0].args, [OWNER, STEWARD, (40n * 10n ** 18n).toString()]);
  assert.deepEqual(spendProblems(steps, [0, 0, 0, 0], wallet(), maxGoal, { kind: 'reinvest', amounts: [40, 0, 0, 0] }, [40, 0, 0, 0]), []);
  assert.match(spendProblems(steps, [0, 0, 0, 0], wallet(), maxGoal, { kind: 'reinvest', amounts: [40, 0, 0, 0] }, [10, 0, 0, 0])[0], /more than the owner owes/);
  assert.ok(spendProblems(steps, [0, 0, 0, 0], wallet(), { ...maxGoal, mode: 'budget' }, { kind: 'reinvest', amounts: [40, 0, 0, 0] }, [40, 0, 0, 0]).some((p) => /only max/.test(p)));
});

test('claim receipts: sums AlchemicaClaimed amounts for this parcel only', () => {
  const topic = '0xcd37debf8c15afccf3b196a970f20863139e242a2d78e43638a536d375cf4adb';
  const word = (n: bigint) => n.toString(16).padStart(64, '0');
  const log = (parcelId: bigint, type: bigint, amount: bigint, address = REALM_DIAMOND) => ({
    address,
    topics: [topic, '0x' + word(parcelId), '0x' + word(3033n), '0x' + word(type)],
    data: '0x' + word(amount) + word(0n) + word(0n),
  });
  const logs = [log(22361n, 0n, 80n * 10n ** 18n), log(22361n, 1n, 5n * 10n ** 17n), log(999n, 0n, 10n ** 21n), log(22361n, 0n, 10n ** 21n, '0x' + '9'.repeat(40))];
  assert.deepEqual(claimedFromLogs(logs, '22361'), [80, 0.5, 0, 0]);
});

test('decide: claims when the cooldown is over and the reservoirs hold something', () => {
  const next = decide(parcel, extractGoal, [0, 0, 0, 0], NOW);
  assert.equal(next.kind, 'act');
  assert.equal(next.kind === 'act' && next.action.kind, 'claim');
});

test('decide: waits for the cooldown, and never claims empty reservoirs', () => {
  const cooling = decide({ ...parcel, lastClaimed: NOW - 3600 }, extractGoal, [0, 0, 0, 0], NOW);
  assert.equal(cooling.kind, 'wait');
  assert.equal(cooling.kind === 'wait' && cooling.until, NOW + 7 * 3600);
  const empty = decide({ ...parcel, available: [0, 0, 0, 0] }, extractGoal, [0, 0, 0, 0], NOW);
  assert.equal(empty.kind, 'wait');
});

test('decide: finished upgrades get finalized first', () => {
  const queued = { ...parcel, upgradeQueue: [{ index: 7, owner: STEWARD, x: 4, y: 0, readyBlock: 999_000, installationId: FUD_HARVESTER_L1 }] };
  const next = decide(queued, maxGoal, [2000, 1000, 100, 50], NOW);
  assert.deepEqual(next.kind === 'act' && next.action, { kind: 'finalize', indexes: [7] });
});

test('decide: with budget in max mode it builds or upgrades instead of waiting', () => {
  const next = decide({ ...parcel, available: [0, 0, 0, 0] }, maxGoal, [2000, 1000, 100, 50], NOW);
  assert.equal(next.kind, 'act');
  assert.ok(next.kind === 'act' && ['build', 'upgrade'].includes(next.action.kind));
});

test('steps: a claim always names the owner\'s pinned gotchi', () => {
  const [claim] = stepsFor({ kind: 'claim' }, parcel, goals, wallet(), new Map());
  assert.equal(claim.sig, 'claimAvailableAlchemica(uint256,uint256,bytes)');
  assert.deepEqual(claim.args, ['22361', '3033', '0x']);
});

test('steps: a build approves exactly the cost, crafts, then equips; a held installation skips the craft', () => {
  const t = typeOf(FUD_HARVESTER_L1);
  const cost = [e18(125), e18(63), 0n, 0n];
  const costs = new Map([[t.id, cost]]);
  const steps = stepsFor({ kind: 'build', typeId: t.id, x: 6, y: 0 }, parcel, goals, wallet(), costs);
  assert.deepEqual(steps.map((s) => s.sig.split('(')[0]), ['approve', 'approve', 'craftInstallations', 'equipInstallation']);
  assert.equal(steps[0].args[1], cost[0].toString());
  assert.deepEqual(steps[2].cost, [125, 63, 0, 0]);
  const enough = stepsFor({ kind: 'build', typeId: t.id, x: 6, y: 0 }, parcel, goals, wallet(e18(10_000)), costs);
  assert.deepEqual(enough.map((s) => s.sig.split('(')[0]), ['craftInstallations', 'equipInstallation']);
  const held = { ...wallet(), held: new Map([[t.id, 1]]) };
  assert.deepEqual(stepsFor({ kind: 'build', typeId: t.id, x: 6, y: 0 }, parcel, goals, held, costs).map((s) => s.sig.split('(')[0]), ['equipInstallation']);
});

test('steps: an upgrade queues from the steward with the current installation id', () => {
  const next = typeOf(FUD_HARVESTER_L1).nextLevelId;
  const steps = stepsFor({ kind: 'upgrade', x: 4, y: 0 }, parcel, goals, wallet(e18(1e9)), new Map([[next, [e18(10), 0n, 0n, 0n]]]));
  assert.equal(steps.length, 1);
  assert.equal(steps[0].args[0], `(${STEWARD},4,0,0,false,22361,${FUD_HARVESTER_L1})`);
});

test('spend: blocks going over the parcel budget, the wallet, or the alchemica goal', () => {
  const t = typeOf(FUD_HARVESTER_L1);
  const steps = stepsFor({ kind: 'build', typeId: t.id, x: 6, y: 0 }, parcel, goals, wallet(e18(1e9)), new Map([[t.id, [e18(125), e18(63), 0n, 0n]]]));
  const action = { kind: 'build' as const, typeId: t.id, x: 6, y: 0 };
  assert.deepEqual(spendProblems(steps, [2000, 1000, 100, 50], wallet(), maxGoal, action), []);
  assert.match(spendProblems(steps, [100, 1000, 100, 50], wallet(), maxGoal, action)[0], /over this parcel's budget/);
  assert.match(spendProblems(steps, [2000, 1000, 100, 50], { ...wallet(), balance: [0n, 0n, 0n, 0n] }, maxGoal, action)[0], /steward holds/);
  assert.ok(spendProblems(steps, [2000, 1000, 100, 50], wallet(), { ...maxGoal, alchemica: [false, true, false, false] }, action).some((p) => /outside/.test(p)));
  assert.ok(spendProblems(steps, [2000, 1000, 100, 50], wallet(), extractGoal, action).some((p) => /extract mode/.test(p)));
});

test('upgrade queue: parses cast output and drops finalized entries', () => {
  const out = `[(${STEWARD}, 4, 0, 52890000, false, 22361, 56), (${STEWARD}, 6, 0, 52880000, true, 22361, 92)]\n[12, 9]`;
  assert.deepEqual(parseUpgradeQueue(out), [{ index: 12, owner: STEWARD, x: 4, y: 0, readyBlock: 52890000, installationId: 56 }]);
  assert.deepEqual(parseUpgradeQueue('[]\n[]'), []);
});
