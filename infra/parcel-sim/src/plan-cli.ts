// Print an extraction plan for one parcel and the owner's goals.
// Usage: node src/plan-cli.ts [--parcel parcel.json | --parcel-id 7565] [--alchemica all|fud,fomo,...] [--mode extract|budget|max]
//        [--budget 1000,500,100,20] [--reinvest 0.5] [--days 365] [--survey-rest] [--json]
// --parcel-id reads the parcel from Base first (src/read-parcel.ts). Without either it plans for the sim's default parcel: humble, fully surveyed, altar + FUD reservoir + FUD harvester.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DEFAULT_CONFIG } from './rules.ts';
import { createWorld } from './world.ts';
import { readParcel } from './read-parcel.ts';
import { ALCHEMICA, makePlan, type Goal, type Mode, type ParcelState } from './plan.ts';
import type { Alch } from './types.ts';

const { values } = parseArgs({
  options: {
    parcel: { type: 'string' },
    'parcel-id': { type: 'string' },
    alchemica: { type: 'string', default: 'all' },
    mode: { type: 'string', default: 'max' },
    budget: { type: 'string', default: DEFAULT_CONFIG.startingBudget.join() },
    reinvest: { type: 'string', default: String(DEFAULT_CONFIG.reinvestShare) },
    days: { type: 'string', default: '365' },
    'survey-rest': { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

function defaultParcel(): ParcelState {
  const world = createWorld(DEFAULT_CONFIG, 1);
  return { size: 0, surveyRound: world.currentRound, remaining: world.alchemicaRemaining, installations: world.placed };
}

const mode = values.mode as Mode;
if (!['extract', 'budget', 'max'].includes(mode)) throw new Error(`--mode must be extract, budget or max, not ${mode}`);
const picked = values.alchemica!.toUpperCase().split(',');
const alchemica = ALCHEMICA.map((a) => picked.includes('ALL') || picked.includes(a)) as Goal['alchemica'];
if (!alchemica.some(Boolean)) throw new Error(`--alchemica must be all or a list of ${ALCHEMICA.join(', ')}`);
const budget = values.budget!.split(',').map(Number) as Alch;
if (budget.length !== 4 || budget.some((b) => !(b >= 0))) throw new Error('--budget needs 4 amounts: FUD,FOMO,ALPHA,KEK');

const parcel: ParcelState = values['parcel-id']
  ? await readParcel(values['parcel-id'])
  : values.parcel
    ? JSON.parse(readFileSync(values.parcel, 'utf8'))
    : defaultParcel();
const goal: Goal = {
  alchemica,
  mode,
  budget,
  reinvestShare: Number(values.reinvest),
  horizonDays: Number(values.days),
  surveyRest: values['survey-rest']!,
};
const plan = makePlan(parcel, goal);

if (values.json) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  const n = (v: number) => Math.round(v).toLocaleString('en-US');
  const alch = (a: Alch, decimals = 0) =>
    a
      .map((v, i) => (v > 1e-9 ? `${decimals ? v.toFixed(decimals) : n(v)} ${ALCHEMICA[i]}` : null))
      .filter(Boolean)
      .join(', ') || 'none';
  const day = (d: number | null) => (d === null ? '—' : `day ${Math.floor(d)}`);
  const modeText = { extract: 'extract only', budget: 'build from budget, then extract', max: 'reinvest until max output' }[mode];

  console.log(`Parcel ${parcel.parcelId ?? '(sim default)'}: size ${parcel.size}, surveyed ${parcel.surveyRound}/10`);
  console.log(`Goal: ${modeText}; develop ${alchemica.every(Boolean) ? 'all alchemica' : ALCHEMICA.filter((_, i) => alchemica[i]).join(' + ')}; ${goal.horizonDays} days`);
  if (mode !== 'extract') console.log(`Budget from owner: ${alch(budget)}${mode === 'max' ? `, plus ${goal.reinvestShare * 100}% of each claim` : ''}`);
  console.log(`Access rights to whitelist: ${plan.rights.join(', ')} (${plan.rights.map((r) => ({ 1: 'claim', 2: 'equip installations', 6: 'upgrade' })[r]).join(', ')})`);
  for (const w of plan.warnings) console.log(`! ${w}`);

  console.log(`\nAlchemica left to extract${plan.estimated ? ' (includes estimate)' : ''}: ${alch(plan.startRemaining)}`);
  console.log(`\nSchedule (${plan.steps.length} steps):`);
  if (plan.steps.length === 0) console.log('  nothing to build: claim every 8 hours');
  for (const s of plan.steps) {
    const ready = s.readyDay - s.day > 0.01 ? `, ready ${day(s.readyDay)}` : '';
    console.log(`  ${day(s.day).padEnd(8)} ${s.action}: ${alch(s.cost)}${ready}`);
  }

  console.log('\nProjection:');
  console.log(`  output/day    start ${alch(plan.startRatePerDay, 1)}  →  end ${alch(plan.endRatePerDay, 1)}`);
  const h = plan.harvesters;
  const levels = h.levels.length ? `, levels ${h.levels.join('/')} of max ${h.topLevel}` : '';
  console.log(`  layout final  ${day(plan.finalLayoutDay)}; harvesters ${h.used}/${h.max}${levels}`);
  if (mode === 'max' && h.levels.some((l) => l < h.topLevel))
    console.log(`                further upgrades would not pay back within ${goal.horizonDays} days or before the alchemica runs out`);
  console.log(`  extracted     ${alch(plan.extracted)}`);
  if (plan.wasted.some((v) => v > 1)) console.log(`  wasted        ${alch(plan.wasted)} (reservoirs full between claims)`);
  if (mode !== 'extract') {
    console.log(`  spent         ${alch(plan.spent)}`);
    console.log(`  owner sent    ${alch(plan.fundedByOwner)}`);
    console.log(`  unspent       ${alch(plan.leftoverBudget)} (returned to the owner)`);
  }
  const runOut = plan.runOutDay.map((d, i) => (d !== null ? `${ALCHEMICA[i]} ${day(d)}` : null)).filter(Boolean);
  console.log(`  runs out      ${runOut.length ? runOut.join(', ') : `nothing within ${goal.horizonDays} days`}`);
  if (plan.surveyBy !== null) console.log(`  survey by     ${day(plan.surveyBy)} (owner-only) or output stops`);
  console.log(`  owner net     ${n(plan.ownerNet)} FUD-equivalent (extract only: ${n(plan.extractOnlyNet)})`);
  if (mode !== 'extract') console.log(`  break-even    ${plan.breakEvenDay === null ? `not within ${goal.horizonDays} days` : day(plan.breakEvenDay)} vs extract only`);
}
