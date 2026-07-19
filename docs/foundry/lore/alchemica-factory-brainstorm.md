# Gotchus Alchemica + Factorio-Like Factory Mode

Design brainstorm for deepening Alchemica lore and shipping a factory-automation fantasy that stays faithful to Gotchiverse canon.

**Related canon seed:** `/workspace/scripts/alchemica-canon-data.cjs`  
**Parent lore page:** `gameplay/farming-alchemica`

---

## Why This Fits

Canon already has the Factorio skeleton:

| Canon piece | Factory analogue |
|-------------|------------------|
| REALM Parcel | Factory chunk / plot |
| FUD / FOMO / ALPHA / KEK | Four ore types with different tempers |
| Alchemical Channeling | Manual mining / pump jack kickstart |
| Haarvester + Reservoir | Drill + chest (overflow = spill) |
| Installations | Assemblers / turrets / walls |
| Spillover | Pollution that attracts biters |
| Lickquidators | Biters / raids |
| Great Portal tithe | End-game sink (not a one-shot rocket) |
| Great Battles (×9) | Scheduled mega-raids + map refresh |
| GLMR | Speed modules / craft haste |
| Citaadel Tower limits | Safe-zone build restrictions |

You do not need a new resource pantheon — you need clearer ecology, machine roles, and a loop fantasy.

---

## Lore Thesis

**Alchemica is the world-power economy.** Spirit Force powers Gotchis; Alchemica powers land, craft, and the Force Field (via Portal tithe).

Burned Ether Realm matter decays in the Burn Address → becomes Alchemica → becomes Gotchis and Parcel veins. Farming is therefore not strip-mining a dead planet; it is negotiating with living residue.

---

## Hybrid Geography (Citaadel + Wild Grid)

**Hybrid thesis (locked):** The Foundry is not one map — it is two cooperating geographies.

| Zone | Role | Yield profile |
|------|------|---------------|
| **Citaadel parcels** | Safe dense Alchemica Foundry — primary **baseload** | Reliable FUD/FOMO throughput inside Force Field; limited expansion |
| **Wild Grid** (outside walls) | Enrichment + salvage frontier | Richer/rarer veins **plus** salvage mats (antenna parts, dish shards, slag kits) — **not** a second currency pantheon |

Wild surplus must still reach the Portal. Three logistics paths form the **logistics triangle**:

1. **Walk Ledger** — caravan contingency when mesh is dark
2. **Bounce Freight** — relay hops through Bounce Gates (mid-grid freight)
3. **Antenna Spine** — Tesla-style daisy-chain from wild relays to Citaadel **wall receivers**

Antennas are hard to obtain and must daisy-chain back to the Citaadel to work. Biome factions beyond the walls actively destroy progress (Link-breakers, ruin wardens, peak raiders).

See **[wild-grid-logistics.md](./wild-grid-logistics.md)** for biome tables, faction jobs, and demo routes.  
See **[grid-power-transmute-lore.md](./grid-power-transmute-lore.md)** for power/compute/transmute chain.

---

## Element Temperaments (Design-Facing)

Use these as recipe and UX flavor, not only flavor text:

1. **FUD** — Defense, foundations, slow reliable throughput. High density, low spill.
2. **FOMO** — Speed, antennas, aggressive extract. High spill risk.
3. **ALPHA** — Tech unlocks, catalysts, precision craft. Bottleneck resource.
4. **KEK** — Social / communal bonuses, Lodge pulses, soft defense. Anti-grimdark stabilizer.

**Rule of thumb:** Every mid-tier recipe needs at least two elements. Every late-tier defense recipe needs FUD + one other. Every communal pulse needs KEK.

---

## Core Loop (One Sentence)

Wake veins → buffer without spilling → refine ratios → craft perimeter → pay the Portal → survive the Force Field drop → optimize the refill.

```
SURVEY → CHANNEL → EXTRACT → STORE → REFINE → CRAFT → DEFEND → TITHE → REPLENISH
```

---

## Mode Concepts (Pick a Vertical Slice)

### A. Parcel Foundry (solo / async)
- **Primary floor:** Citaadel REALM parcels — safe dense baseload Foundry inside the Force Field
- **Enrichment layer:** Wild Grid veins + salvage hauls (antenna parts, dish shards, slag kits) feed back through the logistics triangle — not a parallel ore economy
- Place Haarvesters, Reservoirs, Waalls, Towers (Grid parcels add raid/faction pressure)
- Channeling is the only "player character" verb on cooldown
- Goal: sustain tithe quota across N in-game days without bankruptcy of Kinship

### B. Grid Megabase (multiplayer)
- Adjacent parcels share logistics radius via Antennas
- Guild Lodges enable Communal Channeling windows
- Spillover is visible to Liquidator players (asymmetric threat)

### C. Great Battle Shift (session raid)
- Force Field lowers on a timer
- Portal Alchemica pool is the raid objective
- Factories that shorted tithe spawn with weaker starting Force Field / higher aggro

**Recommended first slice:** **A → light B.** Prove the four-resource belt fantasy on one parcel, then open Antenna links.

---

## Machine Mapping (Keep Canon Names)

Do not invent "Conveyor Mk3" as lore nouns unless the DAO wants them. Prefer:

- **Mote Streams / Alchemical Runnels** — visual belts between Haarvester and Reservoir (presentation layer)
- **Aaltar** — research + channel hub
- **Haarvester** — typed extractor
- **Reservoir** — buffer with spill threshold
- **Lodge** — multiplayer productivity building
- **Waall / Tower / Black Hole** — defense triangle
- **Antenna** — logistics / warning radius

If you need intermediate craft buildings, name them in-guild:

- **Slurry Crucible** (FUD+FOMO)
- **Alpha Loom** (ALPHA catalysts)
- **Kek Kiln** (social binders)

Mark those as Guild tech (expansion), not litepaper canon, until blessed.

---

## Threat Model

**Spillover = pollution.**  
Lickquidators path to the brightest waste and the richest Portal stores.

Tuning knobs:

| Knob | Effect |
|------|--------|
| Reservoir tier | Higher cap → less spill → less aggro |
| FOMO Haarvester count | More speed → more spill chance |
| Tithe arrears | Increases raid priority |
| Black Hole | Redirects pathing (risky bait) |
| Lodge KEK stock | Soft-mitigates small raids |

---

## Progression Beats (Campaign Skin)

1. **Spark** — First Channeling; learn FUD vs FOMO feel
2. **Buffer** — First Reservoir; see Spillover attract a scout Lickquidator
3. **Ratio** — First dual-element craft fails until ALPHA found
4. **Perimeter** — Waall funnel + Tower killbox
5. **Tithe** — Portal Warden quest: meet quota or Force Field flickers
6. **Guild** — Lodge unlocks Communal Channeling
7. **Battle Eve** — Stockpile for Force Field drop
8. **Aftermath** — Veins replenish; rebuild smarter

Map beats 7–8 onto Hero Protocol / Great Battle cadence.

---

## What Not To Do

- Replace Alchemica with generic iron/copper
- Make Spirit Force a factory fuel (keep it Gotchi-personal)
- Add grimdark oil-spill aesthetics that fight frenly tone
- Soft-delete Portal tithe (it is the moral + economic sink)
- Allow infinite Citaadel turret spam (lore already forbids it)

---

## Implementation Hooks (This Repo)

1. **Canon pages** — `scripts/alchemica-canon-data.cjs` (seeded under `gameplay/farming-alchemica`)
2. **Docs** — this file + updates in `LORE-README.md` / quick reference
3. **Future Tome campaign** — optional chapter: "Foundry of the Four" (Vein-Seer → Tithe Warden)
4. **Future UI** — Parcel planner with mote-stream overlay; not required for lore merge

---

## Open Questions

1. Are intermediate Guild machines (Crucible / Loom / Kiln) DAO-safe, or presentation-only?
2. Should Liquidator-play be the explicit "biter faction" in multiplayer Foundry?
3. Does GLMR stay the only haste currency, or do KEK pulses also shorten crafts during festivals?
4. How visible is tithe debt to other players (leaderboard vs private Force Field health)?

---

## Extended Branch: Lighting the Grid

Refined Alchemica also fuels **power plants and compute** so the Grid can run a Netherlink and transmute shipments to the Citaadel (else caravans walk).

See **[grid-power-transmute-lore.md](./grid-power-transmute-lore.md)** and seed `scripts/grid-power-canon-data.cjs`.

```
STORE → REFINE → POWER → COMPUTE → LINK → TRANSMUTE → CITADEL
                         └──── blackout ────→ WALK CARAVAN
```

---

## Suggested Next Build Steps

1. Seed + review Alchemica ecology pages in canon world
2. Draft recipe spreadsheet: 12 starter Installation recipes with 2–4 element costs
3. **Hybrid PoC:** Citaadel baseload parcel → Yield Fields wild vein → Walk Ledger vs Bounce hop vs Antenna Spine daisy-chain to wall receiver
4. Wire `wild-grid-canon-data.cjs` + feature-flag off-chain logistics sim
5. Write Tome one-shot: Alchemical Guild initiation
6. Prototype Lighting the Grid slice: Citaadel Sparkworks → wild surplus mesh transmute → Desert Link-breaker mid-hop raid → blackout Walk Ledger march
7. Pass through Aarcade / Gotchiverse Lite constraints (Phaser, low-tech, DAO governable)

---

_"The Parcel is a factory floor. The Spillover is a scream. Pay the Portal, or the Force Field will."_  
— Tithe Warden proverb (Guild expansion lore)
