# parcel-sim

Seeded, headless sim of one Gotchiverse parcel on Base, for training and scoring a GotchiBot parcel steward.
The steward is whitelisted by the parcel owner for action rights 1 (claim), 2 (equip installations) and
6 (upgrade installations) on the Realm diamond. It harvests to the owner's gotchi and builds from an
alchemica budget the owner funds.

No dependencies: runs on Node ≥ 23.6 type stripping.

```bash
npm run sim -- --seeds 20 --days 90        # rank policies on the same seeds
npm run sim -- --export runs.json          # also write every episode (actions + stats) as replays
npm test
npm run fixtures                           # refresh installation types from Base (needs Foundry cast)
npm run gen -- --seeds 3000                # record planner decisions on all cores -> data/planner.jsonl (resumable)
npm run fit                                # train the steward net on them -> models/steward.json
npm run sim -- --model models/steward.json # score the net alongside the other policies
node src/train/eval.ts --model models/steward.json  # net vs heuristic vs planner on 64 unseen wide-range configs
scripts/train-round.sh 1500 750            # full unattended round: planner data, model A, DAgger data, final model, evals
```

## Training

Each seed gets its own config from `src/train/configs.ts`: 30-730 days, 0.25x-4x starting budget, humble or
reasonable parcel. On a fixed config the seed barely matters (survey randomness never runs a small parcel dry within
two years), so varying the config is what teaches the net different situations.

1. `gen` plays the planner and records each moment it re-plans: one feature row per candidate (wait, each legal
   build and upgrade) and the index it chose.
2. `fit` trains the net to pick the same candidate (softmax cross-entropy, Adam). Seeds ending in 0 are held out.
3. `gen --learner` lets the trained net drive while the planner labels every situation the net gets into (DAgger),
   so the next net also learns to recover from its own mistakes.
4. `eval` compares owner net on unseen configs, and the time per game.

## Plan for an owner

`npm run plan` turns an owner's goals for one parcel into a schedule and projection, simulated from the parcel's state.

```bash
npm run plan -- --mode extract                          # claim with what's equipped (right 1 only)
npm run plan -- --mode budget --alchemica fud --budget 1000,500,100,20 --days 180
npm run plan -- --mode max --alchemica fomo --reinvest 0.5 --days 730
npm run plan -- --parcel parcel.json --survey-rest      # a real parcel; assume the owner surveys the missing rounds
npm run plan -- --parcel-id 44113 --mode extract        # read the parcel from Base first
npm run plan -- --json                                  # the full plan, with a daily series
```

- **mode**: `extract` builds nothing; `budget` builds from the owner's budget only, then extracts; `max` also
  reinvests a share of each claim and keeps building while it pays back within the horizon or before the alchemica
  runs out.
- **alchemica**: which types to develop. Claims always collect every type the parcel is harvesting.
- **parcel.json**: `{ parcelId, size, surveyRound, remaining: [FUD,FOMO,ALPHA,KEK], installations: [{typeId,x,y}] }`.
  Surveying is owner-only, so for a partly surveyed parcel the plan counts what is found so far and says how much
  the missing rounds should add; `--survey-rest` plans as if the owner surveys them now at their expected yield.
- Output: rights to whitelist, warnings, build/upgrade schedule with costs, output per day, harvester levels, wasted
  harvest, what the owner sends and gets back, run-out day per alchemica, owner net vs extracting as-is, break-even day,
  and for a partly surveyed parcel the survey-by day: the first run-out of something it harvests, after which that
  output stops unless the owner surveys more rounds.

## Read real parcels (read-only)

```bash
node src/read-parcel.ts --owner 0x...                     # every parcel an address owns: size, survey round, remaining, installations
node src/read-parcel.ts --parcel 44113 --out parcel.json  # one parcel as plan input
npm run plan -- --parcel parcel.json --mode extract
```

Calls the Realm and Installation diamonds on Base with `cast call` (no keys, nothing sent). Installations come from
the parcel's build grid (type ids over each footprint, rows by y) and are cross-checked against the Installation
diamond's equipped balances; any disagreement is reported in `mismatches`. Deprecated types (old decorations) are
kept because they still take up grid space. The upgrade queue and the block are read too (used by `act`); plans
still start from an empty queue.

## Steward intake (read-only)

What the `parcel-steward` GotchiBot pack runs when an owner assigns it parcels.

```bash
node src/steward.ts parcels --owner 0x...   # each parcel: output per day, run-out days, survey-by day, owner's next step
node src/steward.ts rights --parcels 22361,44113 --mode build --whitelist-id 12 --from 0xOWNER --steward 0xSTEWARD
node src/steward.ts allowance --goals stewards/<name>/parcel-goals.json   # max mode: approvals the owner signs for reinvest pulls
```

`rights` prints the `setParcelsAccessRightWithWhitelists` calldata for the owner to sign (right 1 for `extract`;
1, 2 and 6 for `build`; all whitelist-only), simulates it from `--from`, and shows the whitelist's owner and members.
The Realm diamond accepts any whitelist id, so it warns when the owner doesn't own the whitelist, when the steward
isn't on it, and when other addresses would get the same rights. Nothing is signed or sent.

## Steward wizard (`steward-setup.ts`)

Sets up one steward end to end. GotchiBot runs it when the `parcel-steward` template is applied to a bot
(`templates apply parcel-steward --hero <id> --yes`); the owner re-runs it to give a steward more parcels.

```bash
node src/steward-setup.ts --agent owned-3033        # steward name parcel-steward-owned-3033
node src/steward-setup.ts --name parcel-steward     # or any name
```

1. **Wallet**: the steward's own x402 wallet in abra project `<name>` and keystore `~/.foundry/keystores/<name>`
   (`wallet.ts`, Touch ID once; reused when it exists).
2. **Parcels and goal**: the owner's parcels, with the ones another steward holds flagged; which go to this steward,
   and their mode, alchemica, budget and reinvest share.
3. **Harvest gotchi**: one of the owner's unlent gotchis.
4. **Sign**: opens `aarcadeghst.com/mypaarcel?tab=steward&steward=…&parcels=…&mode=…&wl=<name>`, where the owner's
   browser wallet creates the steward's whitelist (only the steward on it) and grants the rights.
5. **Confirm**: polls Base until the whitelist and every parcel's rights are in place.
6. **Save**: `stewards/<name>/parcel-goals.json`, every parcel `"live": false`; parcels moved off another steward are
   removed from its file.
7. **Gas**: waits for the steward's Base ETH, then runs `act check` on each parcel.

Several stewards can serve one owner. Each has its own wallet, keystore, whitelist and goals file, and a parcel's
rights point at one whitelist, so each parcel belongs to one steward. `stewards/` is gitignored.

## Acting on a parcel (`act`)

```bash
G=stewards/parcel-steward/parcel-goals.json
node src/act.ts check --goals $G --parcel 44113   # guards only
node src/act.ts next  --goals $G --parcel 44113   # next action, its transactions, simulated
DRY_RUN=0 abra run parcel-steward -k STEWARD_KEYSTORE_PASSWORD -- node src/act.ts next --goals $G --parcel 44113 --send
```

`next` reads the parcel from Base, lets the plan's brain pick one action (claim-only for `extract`, the rollout
planner otherwise) and turns it into transactions:

- **finalize**: `finalizeUpgrades` for queued upgrades that are done (anyone may call it).
- **claim**: `claimAvailableAlchemica(parcel, gotchiId, 0x)`. The Realm mints the harvest to the owner of the gotchi
  passed in (or the lending escrow if it's lent), and any whitelisted caller may pass any gotchi. So the goals file
  pins one of the parcel owner's gotchis, and every run checks it is still theirs and not lent. Empty reservoirs are
  never claimed.
- **build**: exact `approve` to the Installation diamond if the allowance is short, `craftInstallations` (level-1
  craft time is 0, so it mints at once), then `equipInstallation`. A level-1 installation already in the steward's
  wallet skips the craft.
- **upgrade**: `approve` if needed, then `upgradeInstallation` from the steward.
- **reinvest** (max mode): `transferFrom(owner, steward, …)` for the share of the steward's own claims not yet
  pulled. Claims record what they minted from the receipt's `AlchemicaClaimed` logs; pulls are capped by that, the
  owner's allowance (`steward.ts allowance`, sized from the plans' projected reinvest) and the owner's balance, and
  skipped when worth less than 25 FUD-equivalent of gas. Pulled alchemica raises the parcel's budget.

Guards on every run: Base chain id, the parcel still belongs to the goals' owner, the pinned gotchi, each action
right the mode needs (`verifyAccessRight` for the steward), gas. Spending must fit the parcel's budget left (budget
minus `steward-ledger.json`), the steward's balances and the alchemica goal. Every transaction is simulated from the
steward first. Sending needs `"live": true` on the parcel's goal (the owner's switch; without it the steward only
shadows), `--send`, `DRY_RUN=0` and the steward's encrypted keystore (below), `~/.foundry/keystores/<name>` for the goals file's `name`, whose address is the steward; a raw key
in the environment is refused because cast only takes one on its command line. A lock file stops two runs spending
the same budget.

## Steward wallet (`wallet.ts`)

```bash
node src/wallet.ts status --project <name> --account <name>   # abra project, wallet, keystore, Base balances
node src/wallet.ts setup --project <name> --account <name> --new   # just the wallet (the wizard runs this step)
```

The wallet is an abracadabra x402 wallet (`abra keygen foundry <project> --pay-to`: `EVM_ADDRESS`,
`EVM_PRIVATE_KEY`, `PAY_TO_ADDRESS`). Setup then writes an encrypted keystore of the same key to
`~/.foundry/keystores/<name>` in-process (scrypt + AES-128-CTR, Keccak MAC; `src/keccak.ts`), with only
`EVM_PRIVATE_KEY` injected into that one step, checks that cast opens it as the same address, and stores its random
password in abra as `STEWARD_KEYSTORE_PASSWORD`. Live runs inject only that password. Setup never replaces an
existing wallet (keygen would overwrite one) or keystore, and without a terminal it asks the owner to run it.

## Policies

A policy sees an `Observation` and the list of legal actions, and returns one `Action`
(`claim`, `build {typeId,x,y}`, `upgrade {x,y}`, `wait {until?}`).

| policy | what it does |
|---|---|
| `random` | random legal action half the time |
| `daily-claim` | claims once a day, never builds |
| `claim-only` | claims every 8h, never builds |
| `heuristic` | claims on cooldown; buys the build/upgrade with the best bankable gain per alchemica that pays back before the horizon; saves up for much better options |
| `planner(heuristic)` | for each build/upgrade it could make now, plays the heuristic forward 120 days in a copy of the sim (re-seeded, so future surveys stay unknown) and keeps the best; catches multi-step payoffs. The teacher for the network |
| `model` | small network (39 features → 32 → 32 → 1 score per candidate action, softmax over wait + legal builds/upgrades) trained to copy the planner's choices; asked only when the planner would re-plan |

Score is **owner net**: harvest minus everything the owner sent the bot, plus the bot's unspent budget,
in FUD-equivalent (`valueWeights`).

`valueWeights` default to `recipeWeights()`: each alchemica's share of all altar/harvester/reservoir recipe costs
divided by its share of supply (currently FUD 1, FOMO 2.12, ALPHA 1.49, KEK 1.73). Alchemica is valued by what it
builds, not by market price. Pass other weights to score for a different goal.

## Modelled from the verified facets

See `src/rules.ts` for facet addresses.

- Accrual `rate × dt / 1 day`, capped by total reservoir capacity; settle on rate/capacity change; overflow is wasted
- 8h claim cooldown per parcel; claims capped by alchemica remaining
- Survey yields: `BinomialRandomizer` distribution, 10 rounds: round 0 = 25%, rounds 1-9 = 75%/9 each. Owner-only; all rounds
  are released on Base, so by default the owner has surveyed everything before the bot starts (`surveyEveryDays: 0`)
- Equip: level 1 only, survey first, altar prerequisite, reservoir-before-harvester, harvester cap by size, grid bounds and overlap
- Upgrades: right 6, altar tech tree (checked before queue capacity), queue capacity from `upgradeQueueBoost`, `craftTime` blocks × 2s, cost paid up front

## Not modelled yet

- Channeling (right 0; needs a real or lent gotchi)
- GLTR speed-ups, maakers, tiles, lodges, alchemica boosts
- Gas, and crafting with craft time > 0 (all level-1 harvesters and reservoirs craft instantly on Base today)
