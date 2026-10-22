import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseWhitelist, pickParcels, signUrl, siteMode, unsettled, type Right } from '../src/steward-setup.ts';
import { parseGoals } from '../src/act.ts';

const OWNER = '0x2127AA7265D573Aa467f1D73554D17890b872E76';
const STEWARD = '0xb7ce47e7727Ae13430894eC11519e025438cA760';

test('parseWhitelist: owner, name and members from cast output', () => {
  const w = parseWhitelist('70', `(${OWNER}, "parcel-steward", [${STEWARD}])`);
  assert.deepEqual(w, { id: '70', owner: OWNER, name: 'parcel-steward', members: [STEWARD] });
  assert.deepEqual(parseWhitelist('3', `(${OWNER}, "", [])`).members, []);
});

test('pickParcels: keeps owned ids, reports the rest, "all" takes every one', () => {
  const owned = ['7565', '44113', '22361'];
  assert.deepEqual(pickParcels('44113, 7565 7565', owned), { ids: ['44113', '7565'], unknown: [] });
  assert.deepEqual(pickParcels('44113,99', owned), { ids: ['44113'], unknown: ['99'] });
  assert.deepEqual(pickParcels('ALL', owned).ids, owned);
});

test('signUrl: the Steward tab with steward, parcels, site mode and whitelist name', () => {
  const u = new URL(signUrl('https://aarcadeghst.com', STEWARD, ['44113', '7565'], 'max', 'parcel-steward-owned-3033'));
  assert.equal(u.pathname, '/mypaarcel');
  assert.equal(u.searchParams.get('tab'), 'steward');
  assert.equal(u.searchParams.get('steward'), STEWARD);
  assert.equal(u.searchParams.get('parcels'), '44113,7565');
  assert.equal(u.searchParams.get('mode'), 'build');
  assert.equal(u.searchParams.get('wl'), 'parcel-steward-owned-3033');
  assert.equal(siteMode('extract'), 'extract');
  assert.equal(siteMode('budget'), 'build');
});

test('unsettled: a parcel is done only when every right its mode needs points at the whitelist', () => {
  const rights = new Map<string, Right>([
    ['44113:1', { mode: 2, whitelistId: '70' }],
    ['44113:2', { mode: 0, whitelistId: '0' }],
    ['44113:6', { mode: 0, whitelistId: '0' }],
    ['7565:1', { mode: 2, whitelistId: '71' }],
  ]);
  assert.deepEqual(unsettled(['44113'], 'extract', '70', rights), []);
  assert.deepEqual(unsettled(['44113'], 'max', '70', rights), ['44113']);
  assert.deepEqual(unsettled(['7565'], 'extract', '70', rights), ['7565']);
});

test('parseGoals: name defaults to parcel-steward, is validated, and whitelistId must be digits', () => {
  const base = { owner: OWNER, steward: STEWARD, gotchiId: '3033', parcels: {} };
  assert.equal(parseGoals(JSON.stringify(base)).name, 'parcel-steward');
  assert.equal(parseGoals(JSON.stringify({ ...base, name: 'parcel-steward-owned-3033', whitelistId: 70 })).whitelistId, '70');
  assert.throws(() => parseGoals(JSON.stringify({ ...base, name: '../evil' })));
  assert.throws(() => parseGoals(JSON.stringify({ ...base, whitelistId: '7; rm' })));
});
