# Wild Grid Logistics — Hybrid Foundry Haul

Lore + design for moving Wild Grid enrichment (richer veins + salvage mats) home to the Citaadel without inventing a second currency pantheon.

**Canon seed:** `/workspace/scripts/wild-grid-canon-data.cjs`  
**Parent:** `gameplay/farming-alchemica/grid-power/wild-grid`  
**Related:** [grid-power-transmute-lore.md](./grid-power-transmute-lore.md) · [alchemica-factory-brainstorm.md](./alchemica-factory-brainstorm.md)

---

## Hybrid Overview

| Geography | Job | What you get |
|-----------|-----|--------------|
| **Citaadel parcels** | Safe dense Alchemica Foundry | Primary **baseload** — reliable FUD/FOMO throughput inside Force Field |
| **Wild Grid** (outside walls) | Enrichment + salvage frontier | Richer/rarer Alchemica veins **plus** salvage mats: antenna parts, dish shards, slag kits |

Wild yield is still the four elements (FUD / FOMO / ALPHA / KEK). Salvage mats are **installation inputs**, not new currencies.

**Logistics triangle** — every Wild Foundry must plan all three:

| Path | When | Cost / risk |
|------|------|-------------|
| **Walk Ledger** | Mesh dark, relay broken, political blackout | Slow; honest; Lickquidator roadmaps |
| **Bounce Freight** | Mid-grid hops when spine is incomplete | Gate tolls; faction sabotage on hops |
| **Antenna Spine** | Daisy-chain powered Antennas → Citaadel **wall receivers** | Antennas scarce; range limits; power hungry |

**Rule:** Antennas are hard to obtain. A lone wild Antenna does nothing — it must **daisy-chain** hop-by-hop until a Citaadel wall receiver accepts the handshake. Break any hop → fall back to Walk Ledger.

Biome factions beyond the walls destroy progress: cut relays, raid Bounce Gates, salt salvage routes.

---

## Biome → Vein / Salvage Table

| Biome | Alchemica vein bias | Salvage mats | Notes |
|-------|---------------------|--------------|-------|
| **Yield Fields** | FOMO-rich topsoil; steady ALPHA trace | Slag kits (field crucible scrap) | Tutorial wild vein; shallow raids |
| **DeFi Desert** | FOMO spikes; dry ALPHA pockets | Dish shards (old relay dishes) | Link-breaker territory; blackout caravan washes |
| **Daark Forest** | FUD-dense roots; rare KEK spores | Antenna parts (tree-mounted relays) | Tree of FUD omens; Host ambushes |
| **Maagma Springs** | FUD/FOMO thermal vents | Slag kits (cooled vent plates) | Heat plumes attract Lickquidators |
| **Laughing Peaks** | KEK vapor vents; thin FOMO | Dish shards (wind-scoured arrays) | Peak Raiders toll the high hops |
| **Liquidator Ruins** | ALPHA salvage from dead tech | Antenna parts + dish shards | Forward-base raids; highest risk |
| **Genesis Blocks** | Balanced four-element bedrock | Slag kits (primordial forge stone) | Slow channel; stable ratios |
| **Poly Lakes** | KEK-rich shallows; FUD silt | Antenna parts (drowned mesh buoys) | Bounce Gate anchor biome |

Salvage feeds Sparkworks boot, Antenna Spine construction, and Crucible repair — not a parallel mint.

---

## Faction Jobs (Beyond the Walls)

| Faction | Biome | What they destroy |
|---------|-------|-------------------|
| **Desert Link-breakers** | DeFi Desert | Mid-hop relays; Bounce Gate timing windows |
| **Daark Host** | Daark Forest | Antenna daisy-chains; forest relay camouflage |
| **Ruin Wardens** | Liquidator Ruins | Salvage hauls; dish-shard convoys |
| **Lickquidators** | All wild biomes | Spillover plumes; bright Antenna chains |
| **Peak Raiders** | Laughing Peaks | High-elevation hops; KEK festival bait |

Citaadel politics still throttle **wall receivers** — Wild Grid independence scares Isolationists.

---

## Bounce Gate (Freight Hop)

**Bounce Gates** are mid-grid freight relays — not full Netherlink nodes. They accept a sealed salvage/Alchemica lot, hold it one cycle, and **bounce** it toward the next hop or wall receiver.

- Requires KEK handshake stability (operators joke about "frenly packet volleyball")
- Each hop pays a toll (ALPHA or salvage mat barter)
- Link-breakers win by desyncing the bounce window — cargo falls to Walk Ledger
- Bounce does **not** replace Antenna Spine for transmute clearance; it moves **physical** lots until a powered spine can transmute

Doctrine: Bounce for bulk salvage; Spine for digital tithe batches.

---

## Demo Route (PoC Narrative)

**Yield Fields → DeFi Desert mid-relay → South Beach / west-gate receiver → Great Portal**

1. **Yield Fields** — crew channels a wild FOMO vein; loads slag kits + motes into Bounce crates
2. **DeFi Desert mid-relay** — Bounce Gate hop; Desert Link-breakers scout the timing window
3. **South Beach / west-gate receiver** — Antenna Spine daisy-chain terminates at Citaadel wall; Keeper Vael's post accepts handshake
4. **Great Portal** — Nettle carves tithe; Force Field ledger ticks green

Failure branch: Link-breakers break the desert hop → Pip opens Walk Ledger through the Grid to the west gate.

---

## PoC Notes (Off-Chain, Feature-Flagged)

- Logistics sim can run **off-chain** for vertical slice — no on-chain salvage token
- Feature flag: `wildGridLogistics` gates Bounce + Spine UI until DAO review
- Minimum viable: one Citaadel baseload parcel + one wild biome + one Bounce hop + one wall receiver
- Faction raids as PvE events on mid-hop timers, not full open-world sim
- Salvage mats map to existing Installation recipes (Antenna, Sparkworks repair) — no new currencies

**Seed pages:** `scripts/wild-grid-canon-data.cjs` (merged in `seed-canon-world.mjs`)

---

_"Baseload in the Citaadel. Enrichment in the wild. Pay the hop, or walk the Ledger."_  
— Alchemical Guild freight proverb
