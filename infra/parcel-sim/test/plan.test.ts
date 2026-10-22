import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALTAR_L1, DEFAULT_CONFIG, FUD_HARVESTER_L1, FUD_RESERVOIR_L1, TOTAL_ALCHEMICAS } from '../src/rules.ts';
import { expectedUnsurveyed, makePlan, type Goal, type ParcelState } from '../src/plan.ts';

const parcel: ParcelState = {
  size: 0,
  surveyRound: 10,
  remaining: [26_000, 13_000, 7_000, 2_800],
  installations: [
    { typeId: ALTAR_L1, x: 0, y: 0 },
    { typeId: FUD_RESERVOIR_L1, x: 2, y: 0 },
    { typeId: FUD_HARVESTER_L1, x: 4, y: 0 },
  ],
};
const goal: Goal = {
  alchemica: [true, true, true, true],
  mode: 'max',
  budget: DEFAULT_CONFIG.startingBudget,
  reinvestShare: 0.5,
  horizonDays: 180,
  surveyRest: false,
};

test('extract only needs just the claim right, builds nothing and asks for no budget', () => {
  const plan = makePlan(parcel, { ...goal, mode: 'extract' });
  assert.deepEqual(plan.rights, [1]);
  assert.equal(plan.steps.length, 0);
  assert.deepEqual(plan.fundedByOwner, [0, 0, 0, 0]);
  assert.equal(plan.ownerNet, plan.extractOnlyNet);
});

test('building needs claim, equip and upgrade rights and beats extracting as-is', () => {
  const plan = makePlan(parcel, goal);
  assert.deepEqual(plan.rights, [1, 2, 6]);
  assert.ok(plan.steps.length > 0);
  assert.ok(plan.ownerNet > plan.extractOnlyNet);
  assert.notEqual(plan.breakEvenDay, null);
});

test('only the alchemica the owner picked gets developed', () => {
  const plan = makePlan(parcel, { ...goal, alchemica: [false, true, false, false] });
  const built = plan.finalLayout.length - parcel.installations.length;
  assert.ok(built > 0);
  for (const s of plan.steps) assert.match(s.action, /FOMO|Aaltar/);
});

test('budget mode never reinvests, so the owner sends only the budget', () => {
  const plan = makePlan(parcel, { ...goal, mode: 'budget' });
  assert.deepEqual(plan.fundedByOwner, goal.budget);
});

test('an unsurveyed parcel warns, and survey-rest adds the expected yield of the missing rounds', () => {
  const partial = { ...parcel, surveyRound: 1, remaining: [5_000, 3_000, 1_500, 600] as ParcelState['remaining'] };
  assert.ok(makePlan(partial, goal).warnings.some((w) => w.includes('Surveyed 1 of 10')));
  const assumed = makePlan(partial, { ...goal, surveyRest: true });
  assert.equal(assumed.estimated, true);
  const extra = expectedUnsurveyed(0, 1);
  assumed.startRemaining.forEach((r, i) => assert.ok(Math.abs(r - (partial.remaining[i] + extra[i])) < 1e-6));
  // All 10 rounds average the full total: 25% in round 0, 75%/9 in each of the other nine.
  expectedUnsurveyed(0, 0).forEach((v, i) => assert.ok(Math.abs(v - TOTAL_ALCHEMICAS[0][i]) < 1e-6));
});

test('the plan stops building for alchemica that is about to run out', () => {
  const dry = { ...parcel, remaining: [600, 13_000, 7_000, 2_800] as ParcelState['remaining'] };
  const plan = makePlan(dry, { ...goal, alchemica: [true, false, false, false], horizonDays: 365 });
  assert.equal(plan.steps.filter((s) => s.action.includes('FUD Harvester')).length, 0);
  assert.notEqual(plan.runOutDay[0], null);
});

test('a partly surveyed parcel that runs dry says when to survey; a fully surveyed one does not', () => {
  const dry = { ...parcel, surveyRound: 3, remaining: [600, 13_000, 7_000, 2_800] as ParcelState['remaining'] };
  const plan = makePlan(dry, { ...goal, mode: 'extract', horizonDays: 365 });
  assert.equal(plan.surveyBy, plan.runOutDay[0]);
  assert.ok(plan.warnings.some((w) => w.startsWith(`Survey before day ${plan.surveyBy}`)));
  const done = makePlan({ ...dry, surveyRound: 10 }, { ...goal, mode: 'extract', horizonDays: 365 });
  assert.equal(done.surveyBy, null);
  assert.ok(done.warnings.some((w) => w.includes('fully surveyed')));
});
