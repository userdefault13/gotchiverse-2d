# Lighting the Grid — Power, Compute & Transmute Logistics

Lore + design for the **Hybrid Foundry**: Citaadel parcels produce baseload Alchemica; the Wild Grid supplies richer veins and salvage mats that must be hauled home via the logistics triangle.

**Canon seed:** `/workspace/scripts/grid-power-canon-data.cjs` + `/workspace/scripts/wild-grid-canon-data.cjs`  
**Parent:** `gameplay/farming-alchemica/grid-power`  
**Related:** [alchemica-factory-brainstorm.md](./alchemica-factory-brainstorm.md) · [wild-grid-logistics.md](./wild-grid-logistics.md)

---

## One-Line Premise

**Citaadel baseload** keeps the Portal fed. **Wild Grid surplus + salvage** (antenna parts, dish shards, slag kits) powers the enrichment layer. Refine Alchemica → plants → compute → **Netherlink** → transmute to wall receivers — or **Walk Ledger** when the mesh breaks.

---

## Logistics Triangle

Three paths home; every Foundry plans all three:

| Path | Role | Fail-over |
|------|------|-----------|
| **Walk Ledger** | Caravan contingency — barrels and salvage crates on foot/ROFL | Always available; slow; Lickquidator pressure |
| **Bounce Freight** | Mid-grid **Bounce Gates** hop sealed lots toward wall receivers | Link-breakers desync hops → Walk Ledger |
| **Antenna Spine** | Daisy-chain powered Antennas (Tesla-style) to Citaadel **wall receivers** | Break any hop → Walk Ledger; transmute requires full spine + compute |

**Antenna rules:** Antennas are scarce. A wild Antenna alone does nothing — it must daisy-chain hop-by-hop until a Citaadel wall receiver accepts the handshake. Range and power per hop are tuning knobs; salvage mats reduce build cost.

Full biome tables, faction jobs, and demo route: **[wild-grid-logistics.md](./wild-grid-logistics.md)**

---

## Vocabulary

| Term | Meaning |
|------|---------|
| **The Grid** | Canon geography outside the Citaadel |
| **Lighting the Grid** | Project to bring powered internet (Netherlink) to that geography |
| **Netherlink** | Mesh internet: Antennas, Callspires, relays → Citaadel receivers |
| **Transmute** | Convert physical Alchemica into packet-form for digital shipping |
| **Walk Ledger** | Contingency: travel cost home if Netherlink is dark |
| **Bounce Freight** | Mid-grid Bounce Gate hops for physical salvage/Alchemica lots |
| **Antenna Spine** | Daisy-chain Antennas → Citaadel wall receivers (transmute path) |
| **Sparkworks → Dynamo → Netherforge → Corestack** | Plant tiers 1–4 |

---

## Why It Fits Canon

- Alchemica already fuels Installations and Portal tithe
- Antennas already imply signal / logistics
- Grid vs Citaadel already encodes frontier logistics tension
- Lickquidators already hunt Spillover and Portal stores
- AGITHE’s origin is internet hunger — Netherlink can rhyme without retconning

New layer (expansion, not litepaper): **compute as logistics infrastructure**, not a separate sci-fi setting.

---

## Resource → Fuel Mapping

| Alchemica | Fuel grade | Job |
|-----------|------------|-----|
| FUD | FUD Slag | Baseload plants, blackout survival |
| FOMO | FOMO Plasma | Peak load, miners, fast Antenna boot |
| ALPHA | ALPHA Flux | RPC honesty, indexer schema, metering |
| KEK | KEK Vapor | Mesh handshake stability, operator morale |

---

## Dependency Chain (Gameplay Truth)

```
Power Plant online
    → Coreforges (Pulsecores / CPU) + Remembrane Mills (MoteBanks / memory)
        → Servers (Haunthosts)
            → RPC Nodes (Callspires)
                → Indexers (Lorelooms)
                    → Miner quorum (Proof Halls)
                        → Transmute clearance
                            → Citaadel receiver accepts
                                → Portal tithe carved
                                    → Credits arrive in Citaadel
```

Break any link → fall back to **caravan**.

| Maker | Product | Fuel bias | Fail state |
|-------|---------|-----------|------------|
| **Coreforge** | Pulsecores (CPU) | ALPHA Flux + FOMO Plasma | Racks dark; no compute |
| **Remembrane Mill** | MoteBanks (memory) | FUD Slag + KEK Vapor | Packet rain; disputed hauls |

---

## Plant Escalation

1. **Sparkworks** — parcel generator; no transmute alone  
2. **Foundry Dynamo** — multi-parcel bus; local RPC possible  
3. **Netherforge** — regional data center power; high raid scent  
4. **Corestack** — nuclear-scale Alchemica reactor; district Netherlink or catastrophe  

---

## Main Objective

Sustain **Netherlink transmute** from Citaadel baseload + Wild Grid enrichment to Citaadel wall receivers at a rate that keeps Portal tithe healthy — using the **logistics triangle** (Walk / Bounce / Antenna Spine) without relying on caravans alone — through Great Battle pressure and biome faction sabotage.

Secondary objectives:
- Keep Citaadel parcels as reliable baseload Foundries
- Haul wild surplus and salvage (antenna parts, dish shards, slag kits) home — not a second currency pantheon
- Keep RPC honesty (ALPHA Flux)
- Keep indexer freshness (dispute prevention)
- Survive raids on plants, mid-hop relays, and Bounce Gates
- Maintain Walk Ledger readiness for blackouts

---

## Faction Tension

| Faction | Stance |
|---------|--------|
| **Linkers** | Netherlink or death; build Corestacks |
| **Walkers** | Trust boots; automation is hubris |
| **Tithe Wardens** | Either path is fine if Portal is paid |
| **Citaadel Isolationists** | Throttle receivers; fear Grid independence |
| **Lickquidators** | Eat the brightest plant |

---

## Campaign: Light the Haul

**Tome seed:** `LIGHT_THE_HAUL_CAMPAIGN_NODES` in `scripts/grid-power-canon-data.cjs` (wired via `seed-canon-campaign.mjs`)

| Chapter | Beats |
|---------|--------|
| 1 Citaadel Spark | Citaadel baseload → first wild Yield Fields vein → Walk vs haul decision |
| 2 Rim Sparkworks | Fuel grades on Citaadel rim; plant online; failed transmute (no spine) |
| 3 Spine & Bounce | Antenna Spine + Bounce Freight → first mesh transmute of wild surplus |
| 4 Mid-Hop Raid | Desert Link-breakers break desert relay — not only Gloam on plant |
| 5 Miner Quorum & Dynamo | Proof Halls → Citaadel notices Grid independence |
| 6 Corestack Gambit | License vs freeboot → containment night |
| 7 Blackout March | Mesh dies → Walk Ledger through Grid to west gate |
| 8 Receiver Gate | Citaadel / DAO vote on inbound transmute |
| 9 Stable Haul | Tithe-sustain victory check + epilogue |

**Named roles:** Pip, Wattz, Nettle, Echo-9, Loommother Brii, Rex Spill, Keeper Vael, Gloam — see lore page `.../roles`.

---

## Vertical Slice (Build Order)

Playable prototype order (maps to Chapters 1–4 + 7):

1. Citaadel baseload + Yield Fields wild vein (teach hybrid geography) — Ch.1
2. Rim Sparkworks + Antenna stub (power, still no ship) — Ch.2
3. Antenna Spine + Bounce hop + first wild-surplus transmute — Ch.3
4. Desert Link-breakers raid mid-hop relay — Ch.4
5. Blackout + Walk Ledger march through Grid to gate — Ch.7

---

## Open Questions

1. Are Corestacks DAO-banned, licensed, or freeboot-only?
2. Can Spirit-Bonded humans operate Callspires remotely from Ether Realm?
3. Does Baazaar settlement require indexer proofs, or only Citaadel receivers?
4. Is skimmed packet Alchemica (mesh piracy) recoverable, or permanently corrupted?

---

## Files

- Seed pages: `scripts/grid-power-canon-data.cjs` + `scripts/wild-grid-canon-data.cjs`
- Wild logistics: `docs/wild-grid-logistics.md`
- Factory loop context: `docs/alchemica-factory-brainstorm.md`
- Quick ref: Alchemica + Grid Power sections in `lore-quick-reference.md`
