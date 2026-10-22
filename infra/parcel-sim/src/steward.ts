// What a parcel steward bot runs during owner intake. Read-only: nothing here signs or sends a transaction.
// Usage: node src/steward.ts parcels --owner 0x... [--days 730] [--json]
//          every parcel the owner holds, what it harvests now and when each harvested alchemica runs out
//        node src/steward.ts rights --parcels 7565,44113 --mode extract|build --whitelist-id 12 [--from 0x...] [--steward 0x...]
//          the access-right transaction the owner signs to let the steward's whitelist claim (and build/upgrade)
//        node src/steward.ts allowance --goals parcel-goals.json [--amounts F,FO,A,K]
//          max mode: the approvals the owner signs so the steward can pull its reinvest share; by default the
//          amounts are what the max-mode parcels' plans project to reinvest over their horizon
import { parseArgs } from 'node:util';
import { AAVEGOTCHI_DIAMOND, assertAddress, assertUint, callAt, callRealm, cast, pool, REALM_DIAMOND, sameAddress } from './chain.ts';
import { ALCHEMICA, makePlan, type Goal } from './plan.ts';
import { readFileSync } from 'node:fs';
import { parseGoals } from './act.ts';
import { ownedParcels, readParcel, type ParcelInfo } from './read-parcel.ts';
import { typeOf } from './rules.ts';

const SIZES = ['humble', 'reasonable', 'spacious V', 'spacious H', 'paartner'];
/** Realm action rights: 1 claim, 2 equip installations, 6 upgrade installations. */
const RIGHTS = { extract: [1], build: [1, 2, 6] } as const;
const WHITELIST_ONLY = 2;

export type ParcelSummary = {
  id: string;
  name: string;
  size: string;
  surveyed: number;
  harvesters: number;
  hasAltar: boolean;
  ratePerDay: number[];
  runOutDay: (number | null)[];
  surveyBy: number | null;
  /** short next step for the owner */
  status: string;
};

export function summarize(p: ParcelInfo, days: number): ParcelSummary {
  const kinds = p.installations.map((i) => typeOf(i.typeId).kind);
  const harvesters = kinds.filter((k) => k === 'harvester').length;
  const hasAltar = kinds.includes('altar');
  const goal: Goal = { alchemica: [true, true, true, true], mode: 'extract', budget: [0, 0, 0, 0], reinvestShare: 0, horizonDays: days, surveyRest: false };
  const plan = p.surveyRound > 0 ? makePlan(p, goal) : null;
  const rate = plan?.startRatePerDay ?? [0, 0, 0, 0];
  const runOutDay = (plan?.runOutDay ?? [null, null, null, null]).map((d, i) => (rate[i] > 0 ? d : null));
  const surveyBy = plan?.surveyBy ?? null;
  const status =
    p.surveyRound === 0 ? 'never surveyed: owner surveys first'
    : !hasAltar ? 'no altar: owner equips one before the steward can build'
    : harvesters === 0 ? 'altar, no harvesters: budget or max mode'
    : surveyBy !== null ? `harvesting; survey before day ${surveyBy}`
    : runOutDay.some((d) => d !== null) ? 'harvesting; fully surveyed, runs dry'
    : 'harvesting';
  return { id: p.parcelId!, name: p.name, size: SIZES[p.size], surveyed: p.surveyRound, harvesters, hasAltar, ratePerDay: rate, runOutDay, surveyBy, status };
}

/** The setParcelsAccessRightWithWhitelists call for these parcels: one entry per parcel per right, all whitelist-only. */
export function rightsCall(parcels: string[], mode: keyof typeof RIGHTS, whitelistId: string) {
  for (const id of parcels) assertUint(id, 'parcel id');
  assertUint(whitelistId, 'whitelist id');
  const ids: string[] = [];
  const actions: number[] = [];
  for (const id of parcels) for (const r of RIGHTS[mode]) (ids.push(id), actions.push(r));
  const list = (xs: (string | number)[]) => `[${xs.join(',')}]`;
  return {
    sig: 'setParcelsAccessRightWithWhitelists(uint256[],uint256[],uint256[],uint32[])',
    args: [list(ids), list(actions), list(actions.map(() => WHITELIST_ONLY)), list(actions.map(() => whitelistId))],
  };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!);
if (isMain) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      owner: { type: 'string' },
      days: { type: 'string', default: '730' },
      json: { type: 'boolean', default: false },
      parcels: { type: 'string' },
      mode: { type: 'string', default: 'build' },
      'whitelist-id': { type: 'string' },
      from: { type: 'string' },
      steward: { type: 'string' },
      goals: { type: 'string' },
      amounts: { type: 'string' },
    },
  });
  const cmd = positionals[0];
  if (cmd === 'parcels' && values.owner) {
    const days = Number(values.days);
    const ids = await ownedParcels(values.owner);
    const rows = (await pool(ids, 4, readParcel)).map((p) => summarize(p, days));
    if (values.json) console.log(JSON.stringify(rows, null, 2));
    else {
      const alch = (xs: (number | null)[], f: (v: number) => string) =>
        xs.map((v, i) => (v !== null && v > 0 ? `${ALCHEMICA[i]} ${f(v)}` : null)).filter(Boolean).join(', ') || '—';
      console.log(`${rows.length} parcels owned by ${values.owner} (run-out within ${days} days, claiming as-is)`);
      console.table(
        rows.map((r) => ({
          id: r.id,
          size: r.size,
          surveyed: `${r.surveyed}/10`,
          'per day': alch(r.ratePerDay, (v) => v.toFixed(v < 10 ? 1 : 0)),
          'runs out': alch(r.runOutDay, (d) => `d${d}`),
          status: r.status,
        })),
      );
    }
  } else if (cmd === 'rights' && values.parcels && values['whitelist-id']) {
    const mode = values.mode as keyof typeof RIGHTS;
    if (!(mode in RIGHTS)) throw new Error('--mode must be extract or build');
    const { sig, args } = rightsCall(values.parcels.split(','), mode, values['whitelist-id']);
    for (const a of [values.from, values.steward]) if (a !== undefined) assertAddress(a);
    const calldata = await cast(['calldata', sig, ...args]);
    const wl = await callAt(AAVEGOTCHI_DIAMOND, 'getWhitelist(uint32)((address,string,address[]))', [values['whitelist-id']]);
    const m = wl.match(/^\((0x[0-9a-fA-F]{40}), "([^"]*)", \[([^\]]*)\]\)$/);
    if (!m) throw new Error(`unexpected getWhitelist output: ${wl.slice(0, 200)}`);
    const [, wlOwner, wlName, wlMembers] = m;
    const members = wlMembers.split(',').map((a) => a.trim()).filter(Boolean);
    console.log(`Whitelist ${values['whitelist-id']} "${wlName}", owned by ${wlOwner}, members:`);
    for (const a of members) console.log(`  ${a}`);
    if (values.from && !sameAddress(wlOwner, values.from))
      console.log(`! ${wlOwner} owns this whitelist, not ${values.from}: they can add anyone to it later and that address could then act on these parcels.`);
    if (values.steward && !members.some((a) => sameAddress(a, values.steward!))) console.log(`! the steward ${values.steward} is not on this whitelist.`);
    if (members.length > 1 && values.steward) console.log(`! ${members.length - 1} other address(es) on this whitelist get the same rights.`);
    console.log('');
    console.log(`Rights ${RIGHTS[mode].join(', ')} (${mode === 'extract' ? 'claim' : 'claim, equip, upgrade'}) to whitelist ${values['whitelist-id']}, whitelist-only, on parcels ${values.parcels}.`);
    console.log(`The parcel owner signs this; the steward never does.\n`);
    console.log(`to:       ${REALM_DIAMOND} (Realm diamond, Base 8453)`);
    console.log(`calldata: ${calldata}\n`);
    if (values.from) {
      try {
        await callAt(REALM_DIAMOND, sig, args, values.from);
        console.log(`simulated from ${values.from}: ok`);
      } catch (e) {
        console.log(`simulated from ${values.from}: REVERTS — ${(e as { stderr?: string }).stderr?.trim().split('\n').pop()}`);
      }
    } else console.log('pass --from <owner address> to simulate it first');
  } else if (cmd === 'allowance' && values.goals) {
    const goals = parseGoals(readFileSync(values.goals, 'utf8'));
    let amounts: number[];
    if (values.amounts) {
      amounts = values.amounts.split(',').map(Number);
      if (amounts.length !== 4 || amounts.some((a) => !(a >= 0))) throw new Error('--amounts needs 4 amounts: FUD,FOMO,ALPHA,KEK');
    } else {
      amounts = [0, 0, 0, 0];
      for (const [id, g] of Object.entries(goals.parcels)) {
        if (g.mode !== 'max') continue;
        const plan = makePlan(await readParcel(id), { ...g, surveyRest: false });
        const reinvest = plan.fundedByOwner.map((f, i) => Math.max(0, f - g.budget[i]));
        console.log(`parcel ${id}: plan reinvests ${reinvest.map((v, i) => `${Math.ceil(v)} ${ALCHEMICA[i]}`).join(', ')} over ${g.horizonDays} days`);
        amounts = amounts.map((a, i) => a + Math.ceil(reinvest[i]));
      }
      if (amounts.every((a) => a === 0)) throw new Error('no max-mode parcel reinvests anything; pass --amounts to set an allowance anyway');
    }
    const tokens = (await callRealm('getAlchemicaAddresses()(address[4])')).match(/0x[0-9a-fA-F]{40}/g)!;
    console.log(`\nThe owner ${goals.owner} signs these. Each one sets (not adds to) how much the steward ${goals.steward} may pull; the steward pulls only its reinvest share of its own claims, and the owner can lower any of them to 0 at any time.\n`);
    for (const [i, token] of tokens.entries()) {
      if (!amounts[i]) continue;
      const wei = (BigInt(Math.round(amounts[i] * 1e6)) * 10n ** 12n).toString();
      const calldata = await cast(['calldata', 'approve(address,uint256)', goals.steward, wei]);
      let sim = 'ok';
      try {
        await callAt(token, 'approve(address,uint256)', [goals.steward, wei], goals.owner);
      } catch (e) {
        sim = `REVERTS: ${(e as { stderr?: string }).stderr?.trim().split('\n').pop()}`;
      }
      console.log(`${ALCHEMICA[i]}: allow ${amounts[i]}\n  to:       ${token}\n  calldata: ${calldata}\n  simulated from the owner: ${sim}`);
    }
  } else {
    console.error('usage: parcels --owner 0x... [--days 730] [--json] | rights --parcels <id,...> --mode extract|build --whitelist-id <n> [--from 0x...] [--steward 0x...] | allowance --goals parcel-goals.json [--amounts F,FO,A,K]');
    process.exit(1);
  }
}
