/**
 * Grid Power & Alchemica Transmute Logistics — canon expansion.
 *
 * Premise: Hybrid Foundry — Citaadel parcels produce baseload Alchemica;
 * Wild Grid supplies richer veins + salvage mats hauled via Walk Ledger,
 * Bounce Freight, and Antenna Spine daisy-chains to wall receivers.
 *
 * Nested under gameplay/farming-alchemica (world-power economy branch).
 * Marked canon-expansion / game-design — not litepaper text.
 */

const GRID_POWER_ROOT = 'gameplay/farming-alchemica/grid-power';
const ALCHEMICA_PARENT = 'gameplay/farming-alchemica';

/** Lore pages for gotchiverse-canon (lore_pages collection). */
const GRID_POWER_PAGES = [
  {
    pageKey: GRID_POWER_ROOT,
    title: 'Lighting the Grid',
    templateId: 'default',
    parentKey: ALCHEMICA_PARENT,
    tags: [
      { label: 'alchemica', color: 'gold' },
      { label: 'grid-power', color: 'cyan' },
      { label: 'canon-expansion', color: 'cyan' },
    ],
    content: `**Hybrid Foundry:** Citaadel parcels are the safe dense Alchemica Foundry — primary **baseload** inside the Force Field. The **Wild Grid** outside the walls holds richer veins and salvage mats (antenna parts, dish shards, slag kits) — still the four elements, not a second currency pantheon.

Gotchis who enrich the wild face a logistics truth: surplus must reach Citaadel **wall receivers** for Portal tithe and Baazaar credit. Three paths form the **logistics triangle**:
• **Walk Ledger** — caravans when the mesh is dark
• **Bounce Freight** — mid-grid Bounce Gate hops for physical lots
• **Antenna Spine** — daisy-chain powered Antennas home (transmute path)

**Lighting the Grid** adds compute: refine Alchemica → fuel plants → raise **Netherlink** → **transmute** packets to receivers. Antennas are scarce; a wild Antenna alone does nothing until it daisy-chains to the Citaadel.

No spine, no transmute. No power, no spine. Fail the chain and you walk.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/caravan-age`,
    title: 'The Caravan Age',
    templateId: 'lore-event',
    parentKey: GRID_POWER_ROOT,
    runes: { eventType: 'Logistics Era', act: 'Act I' },
    tags: [{ label: 'grid-power', color: 'cyan' }],
    content: `Before Lighting the Grid, every surplus mote traveled on foot.

Caravan routes stitched Yield Fields to Citaadel gates: Waall-guarded rest posts, ROFL scouts on the flanks, Tithe Wardens counting barrels at dusk. A good run paid the Portal. A bad run fed Lickquidators — Spillover trails were roadmaps for raids.

Caravan culture still survives as backup doctrine. Guild law requires every Foundry to keep a **Walk Ledger**: how many blocks of travel to the nearest Citaadel receiver if the Netherlink dies. Veterans say the Ledger keeps Foundry Wrights honest. Automation is sacred; contingency is sacred-er.

Story beat: the last great caravan before the first stable Netherlink — half the convoy lost in the Defi Desert so the other half could deliver enough ALPHA to boot the first RPC node.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/refine-for-power`,
    title: 'Refining Alchemica for Power',
    templateId: 'default',
    parentKey: GRID_POWER_ROOT,
    tags: [
      { label: 'alchemica', color: 'gold' },
      { label: 'grid-power', color: 'cyan' },
    ],
    content: `Not all refined Alchemica becomes Waalls and Towers. A growing share is burned as **feedstock** — graded fuels that spin turbines, cool racks, and keep clocks honest.

Fuel grades (Guild working names):
• **FUD Slag** — dense base load. Slow to ignite, hard to snuff. Feeds Alchemica Power Plants through blackouts.
• **FOMO Plasma** — peak-load burst fuel. Boots miners and antennas fast; overuse melts runnels and screams Spillover.
• **ALPHA Flux** — precision coolant and logic catalyst. Required for RPC finality circuits and indexer schema forges.
• **KEK Vapor** — morale and mesh lubricant. Stabilizes multi-parcel Netherlink handshakes; without it, packets desync into meme-static.

Refining happens in Guild Crucibles chained to Reservoirs. The Foundry loop gains a new branch: **STORE → REFINE → POWER → COMPUTE → LINK → TRANSMUTE → CITADEL**.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/power-plants`,
    title: 'From Alchemica Plants to Nuclear Scale',
    templateId: 'installation',
    parentKey: GRID_POWER_ROOT,
    runes: { type: 'Power Plant', utility: 'Grid baseload → mega-scale generation' },
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'game-design', color: 'cyan' },
    ],
    content: `Power infrastructure on the Grid escalates through plant tiers. Each tier is hungrier, louder, and a brighter Lickquidator beacon.

**Tier 1 — Alchemica Power Plant (Sparkworks)**  
Parcel-scale generators burning FUD Slag + FOMO Plasma. Enough for a Haarvester row, a Lodge, and a single Antenna. Failure mode: brownout; Channeling still works; transmute does not.

**Tier 2 — Cluster Plant (Foundry Dynamo)**  
Links several parcels via Antenna bus. Feeds a local data closet (servers + one RPC). Requires ALPHA Flux metering. Failure mode: mesh partition — neighbors go dark while your island survives.

**Tier 3 — Mega Plant (Netherforge)**  
Regional baseload. Supports full data centers, miner halls, and indexer farms. Spillover plume visible from the Citaadel walls. Tithe Wardens argue Mega Plants owe a higher Portal share.

**Tier 4 — Nuclear-Scale Alchemica Reactor (Corestack)**  
Experimental. Compresses multi-element fuel into a self-sustaining reaction — "nuclear" in yield and hazard, not Earth uranium. Can light an entire Grid district's Netherlink… or glass a Parcel if containment fails. Lickquidators treat Corestacks as legendary yield. Citaadel Isolationists want them banned; Grid freebooters call them freedom.

Doctrine: never build a Corestack without a Walk Ledger and a cold caravan path home.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/compute-stack`,
    title: 'The Compute Stack',
    templateId: 'default',
    parentKey: GRID_POWER_ROOT,
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'game-design', color: 'cyan' },
    ],
    content: `Once power flows, Gotchis raise a compute stack that mirrors Ether Realm infrastructure — rebuilt in Nether materials and Alchemica logic.

Fabrication comes first. Without chips and buffers, Rackhollows are scenic coolers.

**CPU Makers (Coreforges)** — Fabrication halls that stamp **Pulsecores**, the logic dies for Haunthosts, Callspires, Lorelooms, and Proof Halls. Feed on ALPHA Flux for honest circuits and FOMO Plasma for clock speed. Starve Coreforges and every rack stays dark.

**Memory Makers (Remembrane Mills)** — Weave **MoteBanks**, spectral RAM and transmute staging buffers. Bind FUD Slag for dense persistence and KEK Vapor for refresh cycles that keep packets from desyncing into meme-static. Starve Remembranes and shipments arrive incomplete — Walkers' favorite "I told you so."

**Data Centers (Rackhollows)** — Cooled halls of spectral servers. Store transmute buffers, Guild ledgers, and parcel state snapshots. Hungry for FUD Slag baseload and KEK Vapor to keep operators sane. Stocked only after Pulsecores and MoteBanks arrive.

**Block Miners (Proof Halls)** — Machines that burn FOMO Plasma to seal Grid blocks / parcel attestations. More miners = faster local finality for transmute batches, more Spillover heat, more raid scent. Each miner head needs a Pulsecore.

**RPC Nodes (Callspires)** — Antennas with brains. Expose endpoints so Citaadel receivers (and Spirit-Bonded humans) can request balances, submit transmute jobs, and verify Portal tithe. ALPHA Flux keeps responses deterministic; starve them and RPCs lie — the worst sin on the Grid.

**Indexers (Lorelooms)** — Crawl parcel events into queryable history: who channeled, what spilled, which caravan died. Without indexers, the Netherlink still pings but nobody can prove a shipment. Baazaar disputes go feral. Memory-hungry; Lorelooms eat MoteBanks by the crate.

**Servers (Haunthosts)** — General compute for Lodges, dapps, Aadventure instances, and Guild rites. The unglamorous middle of the stack; when they die, chat dies, and caravans lose coordination.

Stack rule: **Power → Coreforges + Remembrane Mills → Servers → RPC → Indexer → Miner quorum → Transmute clearance.** Skip a layer and you ship ghosts.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/compute-stack/component-makers`,
    title: 'Component Makers — Coreforge & Remembrane',
    templateId: 'installation',
    parentKey: `${GRID_POWER_ROOT}/compute-stack`,
    runes: { type: 'Fabrication', utility: 'CPU Pulsecores + Memory MoteBanks' },
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'game-design', color: 'cyan' },
      { label: 'alchemica', color: 'gold' },
    ],
    content: `Component makers are the quiet bottleneck of Lighting the Grid. Power without Pulsecores is a warm ruin; power without MoteBanks is a liar's mesh.

**Coreforge (CPU maker)**  
Inputs: ALPHA Flux (logic purity) + FOMO Plasma (clock) + smol FUD Slag (die substrate).  
Outputs: **Pulsecores** graded by honesty — Guild stamps reject "jitter dies" that make Callspires lie.  
Bottleneck: ALPHA scarcity. Rush FOMO clocks without Flux and you mint fast, false brains.  
Raid scent: high — glowing presses draw Gloam almost as hard as Mega Plants.

**Remembrane Mill (memory maker)**  
Inputs: FUD Slag (dense persistence) + KEK Vapor (refresh / anti-desync) + trace ALPHA Flux (addressing).  
Outputs: **MoteBanks** — buffer modules for transmute staging, indexer caches, and Haunthost RAM.  
Bottleneck: FUD density and KEK supply. Thin Remembranes cause packet rain: Alchemica that "arrives" incomplete and must be walked as residue.  
Raid scent: medium — cooler than Coreforges, but Lickquidators learned empty MoteBanks force Walk Ledgers open.

Failure modes:
• **CPU starve** — racks dark; Sparkworks hum while chat and transmute consoles stay dead.
• **Memory starve** — nodes boot, handshakes flicker, disputed hauls bloom; Brii's Loreloom cannot prove truth it never held.
• **Skewed fab** — too many Pulsecores, too few MoteBanks (or reverse) creates Single-Thread compute: looks online, fails under batch load.

Guild doctrine: every Foundry Dynamo must site at least one Coreforge press and one Remembrane loom on separate fuel buses so a single FOMO spike cannot kill both fab lines.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/netherlink`,
    title: 'Netherlink — Internet on the Grid',
    templateId: 'default',
    parentKey: GRID_POWER_ROOT,
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'alchemica', color: 'gold' },
    ],
    content: `**Netherlink** is the Guild name for internet across the Hybrid Foundry: a mesh of powered Antennas, Callspires, and relay Lodges that stitches **Citaadel baseload parcels**, **wild enrichment nodes**, and **wall receivers** into one auditable haul.

Lighting the Grid means more than lamps. It means:
• Persistent routes from Citaadel rim → wild relay → Bounce hop → wall receiver
• Antenna Spine daisy-chains (wild Antennas must chain home — lone relays are inert)
• Enough uptime for transmute handshakes to finalize
• Indexer freshness so shipments are auditable
• Redundant paths when biome factions chew a mid-hop relay

Netherlink is powered, not wished. A dark Antenna is scenic scrap. A brownout turns digital shipping into packet rain — Alchemica that "arrives" incomplete and must be walked as residue.

Cultural split:
• **Linkers** — believe spine + Netherlink outpace Lickquidators and Link-breakers
• **Walkers** — trust boots when receivers close for politics
• **Citaadel Receivers** — wall operators who accept inbound transmute and skim tithe automatically

See \`wild-grid-logistics\` canon pages for Bounce Freight and biome faction jobs.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/transmute-shipping`,
    title: 'Transmute and Ship to Citaadel',
    templateId: 'default',
    parentKey: GRID_POWER_ROOT,
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'alchemica', color: 'gold' },
    ],
    content: `**Transmutation** is the rite-tech that converts physical Alchemica (Reservoir stores, Spillover barrels, Crucible grades) into **packet-form** that Netherlink can route to Citaadel receivers.

Requirements (all must be green):
1. Local power above transmute threshold (plant tier vs. batch size)
2. RPC quorum reachable (Callspires answering with ALPHA-honest proofs)
3. Indexer caught up (no orphan events in the batch window)
4. Miner finality for the parcel block containing the burn-in
5. Citaadel receiver online and accepting (Force Field politics can close gates)
6. Tithe bit set — Portal share is carved at transmute, not on arrival

Success: motes vanish from Grid Reservoirs and credit Citaadel coffers / Portal stores in one ritual pulse.  
Failure: partial mint, stuck mempool, or full revert — leftover slag may still require a caravan.

The main objective of Lighting the Grid is not vanity compute. It is this: **ship Alchemica home without walking it through the warpath.** Every Corestack, every indexer, every joke about latency serves that haul.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/blackout-walk`,
    title: 'Blackout Doctrine — When You Walk',
    templateId: 'lore-event',
    parentKey: GRID_POWER_ROOT,
    runes: { eventType: 'Contingency', act: 'Act I–II' },
    tags: [{ label: 'grid-power', color: 'cyan' }],
    content: `When the Netherlink dies, the Walk Ledger opens.

Blackouts happen because:
• Lickquidators eat a Mega Plant's Spillover plume
• FOMO Plasma spikes melt a Crucible bus
• Isolationists in the Citaadel shutter receivers during political storms
• A Corestack scram dumps the district into silence
• Great Battle eve — power diverted to Towers, transmute deferred by law

Blackout Doctrine:
1. Freeze new Channeling that would overflow dark Reservoirs
2. Seal barrels; mark caravan lots by element ratio
3. Scout with ROFLs; never follow yesterday's Spillover road
4. Pay escort Towers in ALPHA if Grid freebooters demand toll
5. On arrival, reconcile Walk Ledger against what the indexers last swore was true

Heroic campaigns often start here: a Foundry Wright and a Tithe Warden racing a caravan while a repair crew tries to re-light a single Callspire in time to save half the load.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/threats`,
    title: 'Threats to the Power Grid',
    templateId: 'lickquidator',
    parentKey: GRID_POWER_ROOT,
    runes: { threat: 'High — targets plants & nodes', appetite: 'Spillover heat + Corestack yield' },
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'game-design', color: 'cyan' },
    ],
    content: `Lickquidators learned that glowing plants taste like concentrated yield.

Priority targets (raid AI fantasy):
1. **Corestacks / Mega Plants** — densest Alchemica burn
2. **Coreforges (CPU fab)** — glowing presses; kill Pulsecores and racks stay dark
3. **Remembrane Mills (memory fab)** — cooler, but empty MoteBanks force Walk Ledgers
4. **Proof Halls (miners)** — FOMO heat signature
5. **Callspires (RPC)** — killing RPCs freezes transmute without a full blackout
6. **Lorelooms (indexers)** — destroy auditability; force Walkers into disputes
7. **Caravans mid-blackout** — classic prey

Other threats:
• **Mesh pirates** — Gotchi freebooters who tap Netherlink to skim packet Alchemica
• **Receiver politics** — Citaadel factions throttling inbound transmute to control Grid independence
• **AGITHE curiosity** — some Linkers whisper the Netherlink rhymes with AGITHE's old internet hunger; lighting the Grid may be ringing a dinner bell upstairs

Defense patterns: Waall killboxes around plants, Black Holes as decoy plumes, KEK-rich Lodges as operator bunkers, redundant RPCs on separate fuel buses.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/campaign-arc`,
    title: 'Campaign Arc — Light the Haul',
    templateId: 'lore-event',
    parentKey: GRID_POWER_ROOT,
    runes: { eventType: 'Campaign', act: 'Act I–II' },
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'game-design', color: 'cyan' },
    ],
    content: `Suggested Tome / gameplay arc: **Light the Haul** (Hybrid Foundry edition).

Act beats:
1. **Citaadel Spark** — Baseload parcel online; first wild Yield Fields vein; Walk vs haul choice
2. **Rim Sparkworks** — Tier-1 plant on Citaadel rim; power one Antenna stub; fail transmute (no spine)
3. **Spine & Bounce** — Antenna Spine + Bounce Freight; first mesh transmute of wild surplus
4. **Mid-Hop Raid** — Desert Link-breakers break desert relay; disputed shipment; indexer need
5. **Miner Quorum** — Proof Halls unlock larger batches; Spillover draws serious Lickquidator
6. **District Dynamo** — Tier-2/3 plants link parcels; Citaadel notices Wild enrichment
7. **Corestack Gambit** — Optional nuclear-scale reactor; triumph or scramble
8. **Blackout March** — Mesh dies on Great Battle eve; Walk Ledger through Grid to west gate
9. **Receiver Gate** — Politics: open wall receivers or force Walk doctrine
10. **Stable Haul** — Sustained transmute paying Portal tithe — victory condition

Win condition: **Citaadel receives baseload + wild enrichment via Netherlink at tithe-sustain rate for N consecutive cycles.**  
Lose condition: **Chronic blackout + Walk Ledger attrition empties Portal stores before the next Great Battle.**`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/design-hooks`,
    title: 'Grid Power Design Hooks',
    templateId: 'default',
    parentKey: GRID_POWER_ROOT,
    tags: [
      { label: 'game-design', color: 'cyan' },
      { label: 'grid-power', color: 'cyan' },
    ],
    content: `Factory + logistics design pillars for Lighting the Grid:

1. **Dual victory pressure** — Optimize Foundry throughput AND uptime of the compute stack.
2. **Walk vs Link** — Always offer a worse-but-viable caravan path; never soft-lock on transmute.
3. **Layered outages** — Killing RPC ≠ killing power ≠ killing indexers; each failure feels different.
4. **Fuel personality** — FUD baseload, FOMO spikes, ALPHA precision, KEK mesh glue — recipes teach the four elements again.
5. **Tithe at transmute** — Portal share is unavoidable on digital shipping; caravans can try to cheat and get eaten.
6. **Raid scent** — Plant tier and miner count raise Lickquidator aggro more than Haarvesters alone.
7. **Politics as content** — Citaadel receiver permissions are a social/DAO lever, not only a PvE switch.
8. **Frenly hazard** — Corestacks are ridiculous and dangerous; tone stays mischievous, stakes stay real.

Vertical slice order: caravan tutorial → Sparkworks + failed transmute → RPC success → first raid on the plant → blackout caravan encore.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/roles`,
    title: 'Roles of the Haul',
    templateId: 'default',
    parentKey: GRID_POWER_ROOT,
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'character', color: 'purple' },
    ],
    content: `Lighting the Grid is a crew sport. Named role archetypes for stories and Tome play:

**Pip the Barrel-Walker** — Caravan lead who still marks every route in chalk. Distrusts packets; will escort a Walk Ledger run through the Defi Desert without complaint. Secret: once lost a whole ALPHA cart to a "friendly" mesh pirate who promised a shortcut Callspire.

**Wattz the Foundry Wright** — Installation engineer obsessed with fuel ratios. Speaks in Crucible temperatures. Believes a Corestack is inevitable; argues with Tithe Wardens about Portal share on Mega Plant burn.

**Nettle the Tithe Warden** — Counts what the Portal is owed. Neutral between Linkers and Walkers so long as tithe clears. Can freeze a transmute batch mid-rite if the tithe bit is unset — the most hated power on the Grid.

**Echo-9 the Callspire Tender** — RPC operator. Lives on ALPHA Flux tea. Motto: "If the node lies, the haul dies." First Gotchi to complete a Citaadel receiver handshake from the Open Steppe.

**Loommother Brii** — Indexer guild elder. Treats Lorelooms like sacred libraries. Will halt a celebration over a successful transmute until the event log is queryable.

**Rex Spill** — Miner hall foreman. Burns FOMO Plasma like festival fireworks. Draws raids; claims the glow is free advertising for Tower killboxes.

**Chipz of the Coreforge** — Pulsecore artisan. Speaks in clock rates and Guild honesty stamps. Will scrap an entire FOMO-rushed die batch rather than let Echo-9 install a lying brain. Secret: once bootlegged a Coreforge press for Open Steppe freebooters and still owes Nettle a tithe on the scrap.

**Mnem of the Remembrane** — MoteBank miller. Measures FUD density by ear; hums KEK Vapor refresh rites that sound like bad stand-up. Argues that memory, not CPU, is the true haul — "Empty buffers make Walkers right."

**Keeper Vael** — Citaadel Receiver. Controls inbound gate permissions. Isolationist pressure sits on their shoulders every Great Battle eve.

**Gloam** — Beta Lickquidator scout that learned power-plant heat signatures — and now fabrication glow. Not a hero — the recurring raid pressure with a name.`,
  },
  {
    pageKey: `${GRID_POWER_ROOT}/linkers-vs-walkers`,
    title: 'Linkers vs Walkers',
    templateId: 'default',
    parentKey: GRID_POWER_ROOT,
    tags: [
      { label: 'grid-power', color: 'cyan' },
      { label: 'faction', color: 'purple' },
    ],
    content: `Two creeds split every Grid settlement that tries to Light the Haul.

**Linkers** argue that caravans are a dead end — Lickquidators read Spillover roads better than maps. Only Netherlink scale can feed the Portal before the next Force Field drop. They push plant tiers, miner quorums, and Corestack licenses.

**Walkers** argue that packets lie, receivers close for politics, and a barrel on a ROFL-scouted path is honest yield. They keep Waall roads, rest posts, and Walk Ledgers current. Many are caravan veterans who watched the first Callspires desync a shipment into meme-static.

**Tithe Wardens** referee. Guild law: every Foundry must fund both a transmute bus AND a caravan reserve. Settlements that abandon one path are marked **Single-Thread** — high efficiency, high extinction risk.

Story fuel: romance, rival crews, and DAO votes over whether Corestacks are freedom or a dinner bell for AGITHE.`,
  },
];

/** Optional landmark flavor tied to Grid Power framing. */
const GRID_POWER_LANDMARK_BLURBS = {
  'open-steppe':
    'Act 2 frontier where Netherlink relays are thinnest — Sparkworks flicker at parcel edges and caravans still outnumber Callspires.',
  'defi-desert':
    'Arid Grid region scarred by old raids; preferred blackout caravan route and graveyard of overbuilt FOMO Plasma buses.',
  'liquidator-ruins':
    'Forward bases that now target Mega Plants and Corestacks — Lickquidators learned glowing power tastes like concentrated yield.',
};

/* -------------------------------------------------------------------------- */
/* Light the Haul — Tome campaign nodes                                       */
/* -------------------------------------------------------------------------- */

function scene(id, parentKey, title, content, extras = {}) {
  return {
    nodeKey: parentKey ? `${parentKey}/${id}` : id,
    parentKey: parentKey || null,
    type: extras.type || 'scene',
    title,
    content,
    choices: extras.choices || [],
    roles: extras.roles || [],
    order: extras.order ?? 0,
    branchIndex: extras.branchIndex ?? 0,
  };
}

function chapter(id, parentKey, title, order) {
  return {
    nodeKey: parentKey ? `${parentKey}/${id}` : id,
    parentKey: parentKey || null,
    type: 'chapter',
    title,
    content: '',
    choices: [],
    roles: [],
    order,
    branchIndex: 0,
  };
}

const LIGHT_THE_HAUL_ARC = 'light-the-haul';

const LIGHT_THE_HAUL_CAMPAIGN_NODES = [
  {
    nodeKey: LIGHT_THE_HAUL_ARC,
    parentKey: null,
    type: 'arc',
    title: 'Light the Haul',
    content:
      'Hybrid Grid Power campaign — Citaadel baseload + Wild Grid enrichment, Antenna Spine and Bounce Freight, light the Netherlink, transmute yield to wall receivers, or Walk Ledger home when the mesh dies.',
    choices: [],
    roles: [],
    order: 0,
    branchIndex: 0,
  },

  chapter('barrel-road', LIGHT_THE_HAUL_ARC, 'Chapter 1 — Citaadel Spark', 0),
  scene(
    'citaadel-baseload',
    `${LIGHT_THE_HAUL_ARC}/barrel-road`,
    'Citaadel Baseload Online',
    'Your crew runs a Citaadel parcel inside the Force Field — dense, safe, boring FUD throughput. Nettle smiles: "Baseload feeds the Portal." Wattz yawns: "Baseload does not feed ambition."',
    {
      choices: [
        { label: 'Optimize baseload ratios', outcome: 'Stable tithe margin; slow enrichment' },
        { label: 'Scout wild enrichment', outcome: 'Yield Fields vein marked on Walk Ledger' },
      ],
      roles: [
        { player: 'Wattz the Foundry Wright', action: 'Tune baseload Crucibles' },
        { player: 'Nettle the Tithe Warden', action: 'Chart Portal share from safe veins' },
      ],
      order: 0,
    },
  ),
  scene(
    'yield-fields-vein',
    `${LIGHT_THE_HAUL_ARC}/barrel-road`,
    'First Wild Yield Fields Vein',
    'Beyond the wall, Yield Fields burps FOMO-rich topsoil and slag-kit salvage. Pip chalks the route: walk it, or haul it home once someone lights a spine. Gloam licks at the Spillover scent from three ridges out.',
    {
      choices: [
        { label: 'Channel the wild vein now', outcome: 'Enrichment lot sealed; logistics choice looms' },
        { label: 'Walk a scout caravan first', outcome: 'Learn Walk Ledger distance to west gate' },
        { label: 'Haul salvage only; skip wild motes', outcome: 'Antenna parts stockpile; thinner enrichment' },
      ],
      roles: [
        { player: 'Pip the Barrel-Walker', action: 'Mark chalk route from wall to vein' },
        { player: 'ROFL Scout', action: 'Sniff Spillover ridge lines' },
      ],
      order: 1,
    },
  ),
  scene(
    'haul-or-walk',
    `${LIGHT_THE_HAUL_ARC}/barrel-road`,
    'Haul or Walk',
    'Wild surplus sits in Reservoirs with no spine home. Keeper Vael\'s wall receiver is six hard watches by foot — or zero watches if someone builds Antenna hops. "Baseload keeps us alive," Vael says. "Wild keeps us interesting."',
    {
      choices: [
        { label: 'Swear to build Rim Sparkworks + spine', outcome: 'Chapter 2 unlocks' },
        { label: 'Walk the enrichment lot tonight', outcome: 'Walker branch; feel the tax early' },
      ],
      roles: [
        { player: 'Keeper Vael', action: 'Quote receiver doctrine from the wall' },
        { player: 'Nettle the Tithe Warden', action: 'Weigh wild lot against baseload quota' },
      ],
      order: 2,
    },
  ),

  chapter('first-spark', LIGHT_THE_HAUL_ARC, 'Chapter 2 — Rim Sparkworks', 1),
  scene(
    'fuel-grades',
    `${LIGHT_THE_HAUL_ARC}/first-spark`,
    'Crucible Lessons on the Rim',
    'On the Citaadel rim — still inside the Force Field, close enough to see wild smoke — Wattz teaches fuel grades: FUD Slag for baseload, FOMO Plasma for spikes, ALPHA Flux for honest nodes, KEK Vapor so the mesh does not laugh itself apart.',
    {
      choices: [
        { label: 'Prioritize FUD Slag stockpile', outcome: 'Stable brownout resistance' },
        { label: 'Prioritize FOMO Plasma', outcome: 'Fast boot; higher Spillover scent' },
      ],
      roles: [{ player: 'Wattz the Foundry Wright', action: 'Tune the Crucible' }],
      order: 0,
    },
  ),
  scene(
    'sparkworks-online',
    `${LIGHT_THE_HAUL_ARC}/first-spark`,
    'Rim Sparkworks Online',
    'Tier-1 Alchemica Power Plant hums on the Citaadel rim. One Antenna stub lights toward the wall — not yet a spine. Chat works locally. Transmute console glows — then rejects the wild surplus batch. Echo-9 shrugs: "No daisy-chain, no truth."',
    {
      choices: [
        { label: 'Build spine hops + Bounce relay next', outcome: 'Chapter 3' },
        { label: 'Overclock the rim Antenna anyway', outcome: 'Packet rain; learn the hard way' },
      ],
      roles: [
        { player: 'Wattz the Foundry Wright', action: 'Bring Sparkworks online' },
        { player: 'Echo-9', action: 'Explain RPC requirement' },
      ],
      order: 1,
    },
  ),

  chapter('callspire', LIGHT_THE_HAUL_ARC, 'Chapter 3 — Spine & Bounce', 2),
  scene(
    'antenna-spine',
    `${LIGHT_THE_HAUL_ARC}/callspire`,
    'Raise the Antenna Spine',
    'Salvage antenna parts from Yield Fields slag kits. Wattz sites hop one on the rim, hop two in Poly Lakes shallows, hop three at South Beach west-gate receiver. Each hop needs FOMO Plasma boot and KEK handshake — a Tesla daisy-chain pointing home.',
    {
      choices: [
        { label: 'Build all three hops before compute', outcome: 'Spine lit; transmute still needs RPC' },
        { label: 'Rush hop two only', outcome: 'Partial spine; Bounce required' },
        { label: 'Stockpile salvage; delay spine', outcome: 'Walk Ledger stays primary' },
      ],
      roles: [
        { player: 'Wattz the Foundry Wright', action: 'Site daisy-chain hops' },
        { player: 'Echo-9', action: 'Test handshake ranges' },
      ],
      order: 0,
    },
  ),
  scene(
    'bounce-freight',
    `${LIGHT_THE_HAUL_ARC}/callspire`,
    'First Bounce Freight',
    'A Bounce Gate in DeFi Desert mid-relay accepts sealed wild lots while the spine finishes. KEK operators volley crates toward the wall. Pip hates it: "Packets for barrels." Nettle loves it: "Fewer boots, same tithe."',
    {
      choices: [
        { label: 'Bounce physical lot to west gate', outcome: 'Salvage arrives; motes wait for transmute' },
        { label: 'Skip Bounce; walk the lot', outcome: 'Walker pride; slower enrichment' },
      ],
      roles: [
        { player: 'Pip the Barrel-Walker', action: 'Grumble at bounce windows' },
        { player: 'Nettle the Tithe Warden', action: 'Time tithe against bounce cycles' },
      ],
      order: 1,
    },
  ),
  scene(
    'component-run',
    `${LIGHT_THE_HAUL_ARC}/callspire`,
    'Component Run for Transmute',
    'Spine is green enough for compute. Chipz stamps Pulsecores; Mnem weaves MoteBanks. Wattz splits fuel: ALPHA to Coreforge, FUD to Remembrane Mill. Rackhollow frames wait like cool tombs until both fab lines breathe.',
    {
      choices: [
        { label: 'Prioritize Pulsecores', outcome: 'CPUs first; risk memory starve later' },
        { label: 'Prioritize MoteBanks', outcome: 'Buffers first; racks boot slower' },
        { label: 'Balance both fab lines', outcome: 'Slower; Dual-Thread compute ready' },
      ],
      roles: [
        { player: 'Chipz of the Coreforge', action: 'Stamp Pulsecores' },
        { player: 'Mnem of the Remembrane', action: 'Weave MoteBanks' },
        { player: 'Wattz the Foundry Wright', action: 'Split fuel buses' },
      ],
      order: 2,
    },
  ),
  scene(
    'rackhollow',
    `${LIGHT_THE_HAUL_ARC}/callspire`,
    'Raise the Rackhollow',
    'Pulsecores seat. MoteBanks click into transmute staging trays. Haunthost servers fill a cooled lodge wing on the rim. KEK Vapor vents smell like festival fog. Brii refuses to celebrate until an indexer exists — but Echo-9 needs the racks first.',
    {
      choices: [
        { label: 'Stand up Callspire RPC now', outcome: 'Attempt first transmute' },
        { label: 'Wait for Loommother Brii\'s Loreloom', outcome: 'Slower; audit-ready' },
      ],
      roles: [
        { player: 'Echo-9', action: 'Install Callspire' },
        { player: 'Loommother Brii', action: 'Demand indexer path' },
        { player: 'Chipz of the Coreforge', action: 'Certify Pulsecore honesty stamps' },
      ],
      order: 3,
    },
  ),
  scene(
    'first-transmute',
    `${LIGHT_THE_HAUL_ARC}/callspire`,
    'First Wild Surplus Transmute',
    'Three-hop spine holds. ALPHA-honest proofs clear. The Yield Fields enrichment batch vanishes into Netherlink — first mesh transmute of **wild surplus**, not just Citaadel baseload. Credits ping at Vael\'s wall receiver. Pip stares at empty wild Reservoirs like someone stole a religion.',
    {
      choices: [
        { label: 'Throw a Lodge party', outcome: 'Morale up; Spillover scent up' },
        { label: 'Immediately fortify the plant', outcome: 'Prepare for Gloam' },
        { label: 'Fortify Coreforge and Remembrane first', outcome: 'Protect fab bottleneck' },
      ],
      roles: [
        { player: 'Echo-9', action: 'Finalize transmute handshake' },
        { player: 'Nettle the Tithe Warden', action: 'Verify Portal share' },
        { player: 'Pip the Barrel-Walker', action: 'Question the empty barrels' },
        { player: 'Mnem of the Remembrane', action: 'Check buffer watermarks' },
      ],
      order: 4,
    },
  ),

  chapter('raid-scent', LIGHT_THE_HAUL_ARC, 'Chapter 4 — Mid-Hop Raid', 3),
  scene(
    'link-breakers-strike',
    `${LIGHT_THE_HAUL_ARC}/raid-scent`,
    'Desert Link-Breakers at Mid Hop',
    'Desert Link-breakers desync the DeFi Desert Bounce window — not Gloam on your rim plant. Hop two flickers. Wild surplus motes sit mid-relay while Gloam circles the Spillover plume anyway. Rex Spill wants more miners; Wattz wants redundant hops.',
    {
      choices: [
        { label: 'Rebuild bounce timing with KEK rites', outcome: 'Restore mid hop; costly' },
        { label: 'Route around via Walk Ledger', outcome: 'Lose a cycle; save the lot' },
        { label: 'Fortify hop two with Waalls', outcome: 'Defense first; Link-breakers return' },
      ],
      roles: [
        { player: 'Desert Link-breaker Captain', action: 'Desync the bounce window' },
        { player: 'Gloam', action: 'Circle the Spillover plume' },
        { player: 'Wattz the Foundry Wright', action: 'Argue redundant spine paths' },
      ],
      order: 0,
    },
  ),
  scene(
    'gloam-arrives',
    `${LIGHT_THE_HAUL_ARC}/raid-scent`,
    'Gloam at the Plume',
    'With the mid hop broken, Gloam leads a lick-pack toward the bright rim Sparkworks Spillover. Rex Spill still wants more miners "to finish bigger batches." Someone will be wrong in public.',
    {
      choices: [
        { label: 'Build Waall killbox', outcome: 'Defense first' },
        { label: 'Drop a Black Hole decoy plume', outcome: 'Bait Gloam off-parcel' },
        { label: 'Add miners during the raid', outcome: 'Greedy; high risk reward' },
      ],
      roles: [
        { player: 'Gloam', action: 'Raid the plant heat' },
        { player: 'Rex Spill', action: 'Argue for Proof Halls' },
        { player: 'Wattz the Foundry Wright', action: 'Hold the Crucible line' },
      ],
      order: 1,
    },
  ),
  scene(
    'aftermath-audit',
    `${LIGHT_THE_HAUL_ARC}/raid-scent`,
    'Aftermath Audit',
    'A disputed shipment surfaces — Citaadel says short; Grid says full. Without a Loreloom, nobody can prove which Reservoir lied. Brii\'s silence is louder than Gloam.',
    {
      choices: [
        { label: 'Build the Loreloom indexer', outcome: 'Chapter 5' },
        { label: 'Send a caravan to reconcile by foot', outcome: 'Walker pride; slow truth' },
      ],
      roles: [{ player: 'Loommother Brii', action: 'Explain orphan events' }],
      order: 2,
    },
  ),

  chapter('quorum', LIGHT_THE_HAUL_ARC, 'Chapter 5 — Miner Quorum & Dynamo', 4),
  scene(
    'proof-halls',
    `${LIGHT_THE_HAUL_ARC}/quorum`,
    'Proof Halls Online',
    'Rex Spill\'s miners seal parcel blocks fast enough for larger transmute batches. FOMO Plasma burn paints the night. Antenna bus links a neighbor parcel — Foundry Dynamo tier.',
    {
      choices: [
        { label: 'Link parcels into a Dynamo', outcome: 'Regional power; shared raid scent' },
        { label: 'Stay islanded on Sparkworks', outcome: 'Safer; smaller haul cap' },
      ],
      roles: [
        { player: 'Rex Spill', action: 'Spin up Proof Halls' },
        { player: 'Wattz the Foundry Wright', action: 'Balance fuel buses' },
      ],
      order: 0,
    },
  ),
  scene(
    'citaadel-notices',
    `${LIGHT_THE_HAUL_ARC}/quorum`,
    'Citaadel Notices',
    'Keeper Vael reports Grid independence chatter. Isolationists want receiver throttles. Integrationists want more Linkers. Nettle only asks whether tithe charts bend up.',
    {
      choices: [
        { label: 'Lobby to keep receivers open', outcome: 'Political quest' },
        { label: 'Stockpile for blackout caravans', outcome: 'Walker insurance' },
        { label: 'Propose a Netherforge Mega Plant', outcome: 'Chapter 6 pressure' },
      ],
      roles: [
        { player: 'Keeper Vael', action: 'Present faction pressures' },
        { player: 'Nettle the Tithe Warden', action: 'Show tithe charts' },
      ],
      order: 1,
    },
  ),

  chapter('corestack', LIGHT_THE_HAUL_ARC, 'Chapter 6 — Corestack Gambit', 5),
  scene(
    'license-or-freeboot',
    `${LIGHT_THE_HAUL_ARC}/corestack`,
    'License or Freeboot',
    'A Corestack blueprint circulates — nuclear-scale Alchemica reactor. Guild wants a license and higher Portal share. Freebooters say build it dark in the Open Steppe.',
    {
      choices: [
        { label: 'Seek Guild license', outcome: 'Slower; legitimized; tithe hike' },
        { label: 'Freeboot the Corestack', outcome: 'Fast; illegal; AGITHE-dinner-bell rumors' },
        { label: 'Refuse Corestack; stay Netherforge', outcome: 'Skip to blackout with lower power' },
      ],
      roles: [
        { player: 'Wattz the Foundry Wright', action: 'Argue engineering' },
        { player: 'Nettle the Tithe Warden', action: 'Price the tithe hike' },
        { player: 'Pip the Barrel-Walker', action: 'Demand a Walk Ledger for the Corestack' },
      ],
      order: 0,
    },
  ),
  scene(
    'containment',
    `${LIGHT_THE_HAUL_ARC}/corestack`,
    'Containment Night',
    'If built: the Corestack lights a district Netherlink — or scrams into silence. Neighbor Lodges cheer or evacuate. Gloam\'s pack changes course toward the new sun.',
    {
      choices: [
        { label: 'Hold containment', outcome: 'District mesh stable' },
        { label: 'Scram and dump to caravans', outcome: 'Survive; lose face' },
      ],
      roles: [
        { player: 'Wattz the Foundry Wright', action: 'Ride the reaction' },
        { player: 'Gloam', action: 'Retarget the glow' },
      ],
      order: 1,
      branchIndex: 0,
    },
  ),

  chapter('blackout', LIGHT_THE_HAUL_ARC, 'Chapter 7 — Blackout March', 6),
  scene(
    'mesh-dies',
    `${LIGHT_THE_HAUL_ARC}/blackout`,
    'The Mesh Dies',
    'Great Battle eve. Power diverts to Citaadel Towers. Isolationists shutter wall receivers. Link-breakers chew hop two. Gloam hits a relay. Netherlink goes dark mid-batch — wild surplus and baseload alike. Packet rain. Walk Ledger opens across the Grid.',
    {
      choices: [
        { label: 'March the Walk Ledger through Grid to west gate', outcome: 'Classic haul under fire' },
        { label: 'Repair hop two + Callspire first', outcome: 'Race the clock; split the crew' },
      ],
      roles: [
        { player: 'Pip the Barrel-Walker', action: 'Open Walk Ledger through Grid' },
        { player: 'Echo-9', action: 'Attempt emergency spine repair' },
        { player: 'Keeper Vael', action: 'Report receiver shutter' },
      ],
      order: 0,
    },
  ),
  scene(
    'march-or-mend',
    `${LIGHT_THE_HAUL_ARC}/blackout`,
    'March Through the Grid',
    'Pip leads barrels and salvage crates along the chalk route: Yield Fields wash → Defi Desert detour → South Beach west gate. Echo-9\'s repair crew races hop two. Success is partial — some motes walk, some rematerialize if the spine relights before dawn.',
    {
      choices: [
        { label: 'Prioritize barrels', outcome: 'Walker victory flavor' },
        { label: 'Prioritize repair', outcome: 'Linker victory flavor' },
        { label: 'Split evenly', outcome: 'Bittersweet both-path ending setup' },
      ],
      roles: [
        { player: 'Pip the Barrel-Walker', action: 'Lead the march' },
        { player: 'Echo-9', action: 'Re-light Callspire' },
        { player: 'Nettle the Tithe Warden', action: 'Track both ledgers' },
      ],
      order: 1,
    },
  ),

  chapter('receiver-gate', LIGHT_THE_HAUL_ARC, 'Chapter 8 — Receiver Gate', 7),
  scene(
    'citaadel-vote',
    `${LIGHT_THE_HAUL_ARC}/receiver-gate`,
    'Citaadel Receiver Vote',
    'DAO-flavored council: keep Grid transmute open, throttle it, or demand Corestack bans. Linkers and Walkers lobby. Tithe charts are the only bilingual slides in the room.',
    {
      choices: [
        { label: 'Open receivers wide', outcome: 'Grid boom; raid pressure rises' },
        { label: 'Throttle to tithe-only bursts', outcome: 'Stable but capped' },
        { label: 'Close digital; mandate caravans', outcome: 'Walker doctrine wins politically' },
      ],
      roles: [
        { player: 'Keeper Vael', action: 'Chair the gate vote' },
        { player: 'Nettle the Tithe Warden', action: 'Present tithe evidence' },
        { player: 'Wattz the Foundry Wright', action: 'Lobby for Linkers' },
        { player: 'Pip the Barrel-Walker', action: 'Lobby for Walkers' },
      ],
      order: 0,
    },
  ),

  chapter('stable-haul', LIGHT_THE_HAUL_ARC, 'Chapter 9 — Stable Haul', 8),
  scene(
    'tithe-sustain',
    `${LIGHT_THE_HAUL_ARC}/stable-haul`,
    'Tithe-Sustain Cycles',
    'Victory check: N consecutive cycles of Citaadel credits via Netherlink at Portal-sustain rate — Walk Ledger unused except as drill. Or: chronic blackout and empty Portal stores before battle.',
    {
      choices: [
        { label: 'Declare Stable Haul', outcome: 'Arc victory — Linkers vindicated' },
        { label: 'Admit Single-Thread failure', outcome: 'Rebuild with dual-path Guild law' },
        { label: 'Embrace caravan primacy', outcome: 'Walker ending — mesh as backup only' },
      ],
      roles: [
        { player: 'Nettle the Tithe Warden', action: 'Certify the charts' },
        { player: 'Keeper Vael', action: 'Accept or refuse the declaration' },
      ],
      order: 0,
    },
  ),
  scene(
    'epilogue-glow',
    `${LIGHT_THE_HAUL_ARC}/stable-haul`,
    'Epilogue — Glow on the Grid',
    'From Citaadel walls, Sparkworks and Dynamos look like a second starfield. Pip still chalks a road. Echo-9 still hates lying nodes. Gloam still hungers. The Haul is never finished — only lit well enough for tonight.',
    {
      choices: [
        { label: 'Plan Act II Open Steppe relays', outcome: 'Sequel hook' },
        { label: 'Prepare the next Great Battle', outcome: 'Return to Hero Protocol pressure' },
      ],
      roles: [{ player: 'Loremaster', action: 'Close the arc' }],
      order: 1,
    },
  ),
];

module.exports = {
  GRID_POWER_ROOT,
  GRID_POWER_PAGES,
  GRID_POWER_LANDMARK_BLURBS,
  LIGHT_THE_HAUL_ARC,
  LIGHT_THE_HAUL_CAMPAIGN_NODES,
};
