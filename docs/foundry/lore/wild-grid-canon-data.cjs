/**
 * Wild Grid Logistics — Hybrid Foundry canon expansion.
 *
 * Premise: Citaadel parcels = safe dense baseload Foundry.
 * Wild Grid (outside walls) = richer veins + salvage mats (antenna parts,
 * dish shards, slag kits) — NOT a second currency pantheon.
 * Logistics triangle: Walk Ledger, Bounce Freight, Antenna Spine.
 *
 * Nested under gameplay/farming-alchemica/grid-power/wild-grid.
 * Marked canon-expansion / game-design — not litepaper text.
 */

const WILD_GRID_ROOT = 'gameplay/farming-alchemica/grid-power/wild-grid';
const GRID_POWER_PARENT = 'gameplay/farming-alchemica/grid-power';

/** Lore pages for gotchiverse-canon (lore_pages collection). */
const WILD_GRID_PAGES = [
  {
    pageKey: WILD_GRID_ROOT,
    title: 'Wild Grid — Hybrid Foundry',
    templateId: 'default',
    parentKey: GRID_POWER_PARENT,
    tags: [
      { label: 'alchemica', color: 'gold' },
      { label: 'wild-grid', color: 'cyan' },
      { label: 'canon-expansion', color: 'cyan' },
    ],
    content: `The Foundry is two geographies cooperating — not two economies.

**Citaadel parcels** are the safe dense Alchemica Foundry: primary **baseload** inside the Force Field. Reliable FUD and FOMO throughput, limited expansion, Portal-adjacent tithe rhythm.

**Wild Grid** (outside the walls) is the enrichment frontier: richer and rarer Alchemica veins **plus** salvage mats — antenna parts, dish shards, slag kits. Still the four elements. Salvage feeds Installations; it is not a new currency pantheon.

Wild yield must reach the Portal. Three paths form the **logistics triangle**:
• **Walk Ledger** — caravan when the mesh is dark
• **Bounce Freight** — mid-grid Bounce Gate hops for physical lots
• **Antenna Spine** — daisy-chain powered Antennas to Citaadel **wall receivers**

Antennas are hard to obtain. A lone wild Antenna does nothing until it daisy-chains home. Biome factions beyond the walls destroy relays, bounce windows, and salvage convoys.

See child pages for spine rules, bounce doctrine, wall receivers, biome yields, and faction jobs.`,
  },
  {
    pageKey: `${WILD_GRID_ROOT}/antenna-spine`,
    title: 'Antenna Spine — Daisy-Chain to Wall Receivers',
    templateId: 'installation',
    parentKey: WILD_GRID_ROOT,
    runes: { type: 'Logistics', utility: 'Tesla daisy-chain → Citaadel wall receivers' },
    tags: [
      { label: 'wild-grid', color: 'cyan' },
      { label: 'grid-power', color: 'cyan' },
    ],
    content: `The **Antenna Spine** is a powered daisy-chain of Antennas from wild relays to Citaadel **wall receivers** — Guild slang for "Tesla towers pointing home."

**Build rules:**
• Antennas are scarce; salvage mats (antenna parts, dish shards) reduce craft cost
• Each hop has **range** and **power** requirements — underpowered hops desync
• A wild Antenna without upstream power and downstream handshake is scenic scrap
• Transmute clearance requires spine + compute stack green end-to-end

**Failure:** break any hop → packets rain → **Walk Ledger** opens for the stranded lot.

**Tuning fantasy:** 3-hop mesh is the vertical-slice sweet spot (wild parcel → mid relay → wall receiver). Great Battle eve may divert power from spine hops to Citaadel Towers — deliberate blackout pressure.

Linkers worship the spine. Walkers keep the Ledger current anyway.`,
  },
  {
    pageKey: `${WILD_GRID_ROOT}/bounce-freight`,
    title: 'Bounce Freight — Mid-Grid Hops',
    templateId: 'default',
    parentKey: WILD_GRID_ROOT,
    tags: [
      { label: 'wild-grid', color: 'cyan' },
      { label: 'game-design', color: 'cyan' },
    ],
    content: `**Bounce Gates** are mid-grid freight relays — not full Netherlink nodes. They accept a sealed Alchemica or salvage lot, hold one cycle, and **bounce** it toward the next hop or wall receiver.

Doctrine:
• **Bounce** moves **physical** lots (barrels, slag kits, dish crates)
• **Antenna Spine** enables **transmute** batches once compute is online
• KEK Vapor stabilizes bounce handshakes — desync sounds like meme-static volleyball

Each hop pays toll (ALPHA or salvage barter). **Desert Link-breakers** win by attacking the bounce **window**, not always the cargo — cargo falls to Walk Ledger when timing breaks.

PoC route: Yield Fields lot → DeFi Desert mid-relay → South Beach west-gate receiver.`,
  },
  {
    pageKey: `${WILD_GRID_ROOT}/wall-receivers`,
    title: 'Citaadel Wall Receivers',
    templateId: 'default',
    parentKey: WILD_GRID_ROOT,
    tags: [
      { label: 'wild-grid', color: 'cyan' },
      { label: 'grid-power', color: 'cyan' },
    ],
    content: `**Wall receivers** terminate the Antenna Spine on the Citaadel perimeter — Keeper posts where inbound transmute and tithe carving happen.

Politics:
• **Integrationists** want more receivers open — Wild Grid enrichment feeds the Portal
• **Isolationists** throttle gates — fear Grid independence and Corestack glow
• **Tithe Wardens** care only that tithe clears by cycle end

Handshake requirements mirror grid-power transmute chain: power, RPC quorum, indexer freshness, miner finality, tithe bit set.

South Beach / **west-gate receiver** is the demo terminus in Guild training parables: wild surplus lands, Nettle weighs Portal share, Vael logs the pulse.

Receiver shutter during blackout forces Walk Ledger even if wild parcels still produce.`,
  },
  {
    pageKey: `${WILD_GRID_ROOT}/biomes`,
    title: 'Wild Biomes — Veins & Salvage',
    templateId: 'default',
    parentKey: WILD_GRID_ROOT,
    tags: [
      { label: 'wild-grid', color: 'cyan' },
      { label: 'alchemica', color: 'gold' },
    ],
    content: `Wild biomes enrich the four elements and drop **salvage mats** — installation inputs, not new currencies.

| Biome | Vein bias | Salvage |
|-------|-----------|---------|
| **Yield Fields** | FOMO topsoil; ALPHA trace | Slag kits |
| **DeFi Desert** | FOMO spikes; dry ALPHA | Dish shards |
| **Daark Forest** | FUD roots; KEK spores | Antenna parts |
| **Maagma Springs** | FUD/FOMO vents | Slag kits |
| **Laughing Peaks** | KEK vapor; thin FOMO | Dish shards |
| **Liquidator Ruins** | ALPHA from dead tech | Antenna parts + dish shards |
| **Genesis Blocks** | Balanced four-element bedrock | Slag kits |
| **Poly Lakes** | KEK shallows; FUD silt | Antenna parts |

Citaadel parcels remain **baseload** — do not expect ruin-tier ALPHA or dish salvage inside the Force Field.`,
  },
  {
    pageKey: `${WILD_GRID_ROOT}/factions`,
    title: 'Wild Grid Factions — Jobs Beyond the Walls',
    templateId: 'default',
    parentKey: WILD_GRID_ROOT,
    tags: [
      { label: 'wild-grid', color: 'cyan' },
      { label: 'faction', color: 'purple' },
    ],
    content: `Biome factions destroy progress beyond the walls — PvE pressure on logistics, not a second economy.

| Faction | Biome | Job |
|---------|-------|-----|
| **Desert Link-breakers** | DeFi Desert | Cut mid-hop relays; desync Bounce windows |
| **Daark Host** | Daark Forest | Ambush Antenna daisy-chains; salt forest relays |
| **Ruin Wardens** | Liquidator Ruins | Raid salvage hauls; defend dead tech |
| **Lickquidators** | All wild biomes | Hunt Spillover plumes and bright spine hops |
| **Peak Raiders** | Laughing Peaks | Toll high-elevation hops; bait KEK festivals |

Guild response: redundant hops, Black Hole decoys on salvage roads, KEK-rich Lodge escorts, and always — always — a current Walk Ledger.`,
  },
];

/** Landmark flavor tied to Wild Grid / hybrid logistics framing. */
const WILD_GRID_LANDMARK_BLURBS = {
  'yield-fields':
    'Hybrid tutorial wild vein — FOMO-rich topsoil and slag-kit salvage; first Bounce hop in Guild training parables.',
  'defi-desert':
    'Desert Link-breaker country — dish-shard salvage and mid-relay raids; preferred Walk Ledger wash when the spine breaks.',
  'daark-forest':
    'Daark Host territory — antenna parts in the canopy; spine hops here feel like negotiating with the Tree of FUD.',
  'maagma-springs':
    'Thermal FUD/FOMO vents and cooled slag kits — heat plumes draw Lickquidators to bright relay chains.',
  'laughing-peaks':
    'Peak Raider high hops — KEK vapor vents and wind-scoured dish shards; elevation taxes Bounce timing.',
  'liquidator-ruins':
    'Ruin Warden salvage frontier — dense antenna parts and dish shards; highest risk enrichment run.',
  'genesis-blocks':
    'Primordial four-element bedrock and forge-stone slag kits — slow channel, stable ratios for baseload blending.',
  'poly-lakes':
    'Drowned mesh buoys and KEK shallows — natural Bounce Gate anchor biome on the haul home.',
};

module.exports = {
  WILD_GRID_ROOT,
  WILD_GRID_PAGES,
  WILD_GRID_LANDMARK_BLURBS,
};
