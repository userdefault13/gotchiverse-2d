# GV-2D `c*` cutover — SIM / off-chain / hybrid → Gotchiverse-2D diamond

**Audience:** Julius (engineering)  
**Date:** 2026-09-08  
**Status:** Planning draft — no deploy in this doc  
**Walkthrough locks:** 2026-09-08 (Julius) — see §7  
**Chain first:** Base Sepolia (`84532`) → Base mainnet later  
**Related:** [`GV2D_DIAMOND_PLAN.md`](./GV2D_DIAMOND_PLAN.md) · [`GV2D_DIAMOND_SPIKE.md`](./GV2D_DIAMOND_SPIKE.md) · Aarcade `ONCHAIN_DIAMOND_PLAN.md` (AarcadeGh-t) · `CPORTAL_WAR.md` (AarcadeGh-t) · `CPARCEL_REVOKE.md` (AarcadeGh-t)

---

## 1. Goal / non-goals

### Goal

Cut **all remaining** Gotchiverse-2D soft / SIM / hybrid `c*` surfaces onto the **Gotchiverse-2D diamond** (EIP-2535) so production economy no longer depends on:

- `craft*Locally` helpers + session UI alchemica
- `helpers/offchain.store.ts` → memory + localStorage + `PUT /api/offchain`
- Mongo cartridge SIM as source of truth for GV-2D soft installables / soft tiles
- Soft channeling for wallets that can use Realm

**Already shipped:** soft tiles **8–47** permissionless mint + ERC1155 inventory on GV-2D diamond  
`0x34a851523A6f3351940d235373038b2A0A85e872` (Base Sepolia), **ERC1155 soft tiles** (upgraded from native balances; same slots), `paymentEnabled=false`.  
PR: https://github.com/userdefault13/gotchiverse-2d/pull/10 · branch `feature/gv2d-diamond-tile-mint`.  
**Locked cut:** migrate those balances → **ERC1155 on GV-2D** (tiles bag stays on GV-2D; stakeable later). Soft-install bag SoT is **cartridge**, not GV.

### Non-goals

| Do **not** | Why |
|------------|-----|
| Reimplement Realm / Installation / Tile / Alchemica / GLTR / Aavegotchi on GV-2D diamond | Live L1 Base is source of truth — call or bridge |
| Move Golden tiles **1–3** off live Tile diamond | LE economics stay on Tile diamond |
| Absorb Aarcade Console / Cartridge / FeeSplitter / cPortal VRF into GV-2D diamond | Separate diamonds + ownership matrix (§2) |
| Colyseus combat / foundry settlement as diamond-first | Stay server-side until settlement design exists |
| Mainnet deploy in this phase | Sepolia milestones first |
| Blindly duplicate SIM Mongo rows as on-chain NFTs | Prefer mirrors / soft-native assets only where no L1 type exists |

---

## 2. Ownership matrix (asset → diamond of record)

| Asset / surface | Diamond of record | Mirror / bridge | Notes |
|-----------------|-------------------|-----------------|-------|
| Soft tiles **8–47** (greyscale + ghost pack) — **tiles bag** | **GV-2D diamond** (ERC1155; cut from diamond-native balances) | — | Spike done (native balances); **locked:** ERC1155 on GV-2D, craft ~50% alchemica, stakeable later. FE still on `craftCTileLocally` |
| Golden tiles **1–3** | **L1 Tile diamond** | — | Craft via Crafting Table / Tile diamond |
| Waalls **162–170**, Lodge **171–179**, Store **180–188**, furniture **189–208+** — **soft-install bag** | **Craft catalog on GV-2D**; **bag SoT = Aarcade cartridge** (transferable ERC1155) | Craft on GV → mint ERC1155 into **cartridge bag** → place from bag; unequip → bag → resell | **Do not** exist on Installation diamond. Soft-install bag is **not** on GV-2D |
| Live Installation types (harvestors, etc.) | **L1 Installation diamond** | Cartridge may hold craft instances | Craft/upgrade costs live on Installation |
| Real Realm parcels (equip/unequip/channel) | **L1 Realm diamond** | — | Empty-sig FE stubs today; fix FE → real Realm txs |
| SIM cPaarcels (minted mirrors of Realm tokenIds) | **Aarcade cartridge diamond** (locked) | Ownership sync / soft-burn on L1 transfer | GV-2D `GvPlaceFacet` only places soft installs against **cartridge parcel ids** — does not own cPaarcel |
| Soft channel (cParcel / cGotchi) | **Hard-kill** when Realm sigs work → **L1 Realm channel** | **No** `GvChannelSoftFacet` | See WS5 |
| cPortals (pack / VRF / open / apply / redeem / PortalWar cportal mode) | **Aarcade cartridge diamond** + `CPortalVrfConsumer` | Not GV-2D | Eye redeem / collect-N = Aarcade track (PR #10 area); remain Aarcade-owned parallel |
| Real portals / Portal War BRS | **L1** (unchanged) | — | `/portal-war` BRS path stays L1 |
| cAavegotchis (starter / bind / eye apply) | **Aarcade cartridge diamond** (`CAavegotchiFacet`) | L1 Aavegotchi diamond = spirit force SoT | GV-2D renders / selects; does not mint heroes; remain Aarcade-owned parallel |
| Real Aavegotchis | **L1 Aavegotchi diamond** | Bind into cartridge | Sepolia bind may eth_call mainnet |
| Cartridge pocket (GHST/USDC/GLTR/alchemica) | **Aarcade cartridge diamond** | — | FeeSplitter lines A/B/C; remain Aarcade-owned parallel |
| Console / game registry | **Aarcade console diamond** | — | Factory for cartridges |
| Alchemica / GLTR ERC20 | **L1 token contracts** | GV-2D Rules `alchemicaTokens[]` when `paymentEnabled` | Sepolia stays `paymentEnabled=false` until Store/tile craft costs set |

### Known Sepolia addresses (reference)

| Contract | Address |
|----------|---------|
| GV-2D diamond | `0x34a851523A6f3351940d235373038b2A0A85e872` |
| Aarcade console diamond | `0x4c4fa38420c457c5a5a33beebd6f340618e62f8a` |
| Aarcade cartridge diamond | `0xbb44b67de78393a54bcda56707e6ffc719b3a645` |
| Aarcade FeeSplitter | `0x2e63168f50b4925acb7667d8482163bd2c4044b3` |

**Bridge rule of thumb (locked 2026-09-08):**

| Bag / surface | SoT |
|---------------|-----|
| **Tiles bag** (soft tiles 8–47) | **GV-2D diamond** ERC1155 (migrate from current Sepolia diamond-native balances) |
| **Soft-install bag** (Waalls/Lodge/Store/furniture) | **Aarcade cartridge** transferable ERC1155 |
| **cPaarcel** | **Aarcade cartridge**; GV Place only references cartridge parcel ids |
| Heroes / cPortals / pocket | **Aarcade cartridge** (parallel; not GV-2D) |

Flow for soft installs: **craft on GV-2D** (catalog + costs) → mint into **cartridge bag** → **place** from bag onto cartridge cPaarcel → **unequip** back to bag → **resell**. Tiles stay on GV-2D (stakeable later). **Do not** dual-SoT the same qty on both diamonds.

---

## 3. Phased roadmap (ordered dependencies)

```
Phase 0  [DONE]  GvTileMint 8–47 + GvInventory ERC1155 + GvRules (paymentEnabled=false; same balance slots)
    │
Phase 1          FE tile cutover + tiles ERC1155 cut (migrate Sepolia native balances) + catalog freeze
    │              depends on: Phase 0 diamond address; keep paymentEnabled=false until costs locked
    │              tiles bag stays on GV-2D; craft target ~50% alchemica (costs TBD in GvRules)
    ▼
Phase 2          Soft installables: GV Catalog + Craft → mint transferable ERC1155 into **cartridge bag**
    │              depends on: catalog JSON freeze; cartridge InventoryFacet ERC1155 ready
    │              Waalls/Lodge/Store/furniture: craft→bag→place; unequip→bag→resell
    ▼
Phase 3          Place / unequip soft installs (GvPlaceFacet pulls from **cartridge bag** against **cartridge cPaarcel ids**)
    │              depends on: Phase 2 cartridge bag balances; cPaarcel home = cartridge (locked)
    ▼
Phase 4          cPaarcel on cartridge + soft-burn on revoke (on-chain or hybrid)
    │              depends on: Phase 3; cartridge owns parcel instances; GV only places
    ▼
Phase 5          Soft channel **hard-kill** → Realm channel (no GvChannelSoftFacet)
    │              depends on: real Realm sig path
    ▼
Phase 6          Indexer (Envio) + Mongo/offchain migration + FE flag kill
    │              depends on: events stable from Phases 1–5
    ▼
Phase 7          Base mainnet cut (multisig/timelock optional) — after Sepolia soak
```

**Parallel (Aarcade-owned, not blocking GV-2D soft installs):** cPortal VRF/eye-redeem/PortalWar, cAavegotchi bind/eye apply, cartridge pocket, cartridge subgraph. Soft-install **bag** + **cPaarcel** are cartridge SoT; GV-2D only needs craft catalog, Place against cartridge parcel ids, and FE routing with no duplicated SoT.

---

## 4. Per-workstream detail

Each workstream: current SIM home → target on-chain shape → Sepolia milestones → migration → FE/API cutover → risks.

### WS1 — cTiles (finish)

| | |
|--|--|
| **Current SIM home** | `helpers/ctile.helper.ts` → `craftCTileLocally` → `offchain.store` inventory qty + local inventory; recipes from `tiles.json` (8–37 greyscale + 38–47 ghost; ghost default soft cost 5 FUD + 2 ALPHA) |
| **Target on-chain** | **Locked:** ERC1155 on **GV-2D diamond** (tiles bag SoT = GV-2D, not cartridge). Cut from current Sepolia diamond-native balances. Craft target ~**50% alchemica**; stakeable later. Keep `paymentEnabled=false` until tile craft costs set in GvRules. Place tiles via Phase 3 `GvPlaceFacet` (or Realm equip for real parcels — tiles on Realm stay L1 Tile equip). |
| **Sepolia milestones** | (a) FE flag `USE_GV2D_DIAMOND` mint path for 8–47 (b) ERC1155 facet cut + migrate native balances (c) drop offchain tile qty sync (d) keep `paymentEnabled=false` until costs locked (e) place soft tiles on cPaarcel / soft parcel grid |
| **Migration** | (1) Snapshot `offchain.store` tile qty → credit; (2) **Sepolia diamond-native tile balances → ERC1155** one-shot cut; then freeze offchain tile keys |
| **FE/API cutover** | Kill `craftCTileLocally` behind flag → cast/`wagmi` `mintTiles`; Golden 1–3 unchanged; stop `syncCTileInventoryFromScene` writing offchain |
| **Risks** | Dual inventories (offchain + diamond) during flag flip; payment on without faucet alchemica stalls QA; placing soft tiles on real Realm parcels without L1 Tile type — must stay soft-place only |

### WS2 — cInstallations (bag + nested on cPaarcel)

| | |
|--|--|
| **Current SIM home** | Cartridge SIM (`AARCADE_CARTRIDGE_SIM_URL`) — bag + nested on cPaarcel; free SIM `mintInstallation` after craft; GV proxies `pages/api/aarcade-cartridge*.ts`; dual inventory: wallet bag vs nested on parcel (`cartridgePaarcel.helper.ts`) |
| **Ghost types 171 / 180** | Lodge band starts **171**, Store band starts **180** — soft typeIds that **revert** on live Installation diamond. Treat as soft-native on GV-2D (not L1 Installation extensions). |
| **Target on-chain** | **Locked:** Craft on GV-2D (`GvCatalogFacet` + `GvCraftFacet`); **soft-install bag SoT = Aarcade cartridge** transferable ERC1155. Flow: craft→**cartridge bag**→place; unequip→bag→resell. GV does **not** hold soft-install balances. Live Installation crafts stay on L1; soft-native ids mint into cartridge bag (not dual-SoT). |
| **Sepolia milestones** | (a) register soft install typeIds on GV catalog (b) craft facets for Lodge/Store/Waall bands (c) post-craft mint ERC1155 into cartridge bag (d) bag UI reads cartridge (e) unequip returns to cartridge bag |
| **Migration** | Export SIM installationInventory + nested installs → mint/claim on **cartridge** bag; mark SIM rows `migrated` |
| **FE/API cutover** | Craft UI → GV diamond tx for soft ids; bag/place UI → cartridge provider with `VITE_CARTRIDGE_SIM=false` when ready; L1 ids → Installation diamond |
| **Risks** | Accidental dual SoT (GV balances + cartridge) — **forbid** GV soft-install inventory; free SIM mintInstallation undercuts paid craft; id collision if Installation later adds 171+ |

### WS3 — Waalls / Lodge / Store (+ furniture)

| | |
|--|--|
| **Current SIM home** | `waalls.helper.ts` (162–170), `lodge.helper.ts` (171–179), `store.installation.helper.ts` (180–188 + Cashier 189–197, Display 198, Console 199–207, Terminal 208+); `craft*Locally`; persistence `offchain.store.ts` + `/api/offchain`; interiors: `*.layout.helper.ts` + `sim_credit` listings |
| **Target on-chain** | Soft-native **catalog + craft** on **GV-2D diamond**: `GvCatalogFacet`, `GvCraftFacet`, `GvUpgradeFacet`; transferable **ERC1155 bag on cartridge**; place/resell via craft→bag→place / unequip→bag→resell. Later `GvInteriorFacet` for Lodge/Store/Potion/DAO/Bazaar layouts. **Not** Installation diamond. Alchemica craft costs **TBD** (mutable GvRules placeholders). |
| **Sepolia milestones** | (a) freeze JSON catalogs → on-chain register batch (b) craft+upgrade smoke for one Waall + one Lodge + one Store → cartridge bag (c) furniture as craftable child types (d) interior commit hash URI (phase 2) (e) kill localStorage inventory for these ids |
| **Migration** | Debounced offchain inventory/placements → claim or admin credit; Lodge footprint v2 already local — bake coords into migration |
| **FE/API cutover** | Replace `craftWaallLocally` / `craftLodgeLocally` / `craftStoreLocally`; deprecate `/api/offchain` for these ids; RecipeBook soft pages call diamond |
| **Risks** | Catalog drift vs `store.installations.local.json`; interior escrow (`sim_credit`) not ready → keep listings off-chain until Phase 2; furniture bags vs parcel placements confusion |

### WS4 — cPaarcels

| | |
|--|--|
| **Current SIM home** | Cartridge SIM cPaarcels minted from Realm tokenIds (`cartridgePaarcel.helper.ts`); equip/unequip nested cInstallations; soft-burn on L1 ownership loss (see AarcadeGh-t `CPARCEL_REVOKE.md`) — Mongo burn wallet, lazy `ownerOf` sync |
| **Target on-chain** | **L1 Realm NFT remains SoT for land.** **Locked:** cPaarcel home = **Aarcade cartridge** (instance/ERC721). GV-2D diamond **only** places soft installs against **cartridge parcel ids** via `GvPlaceFacet` (pulls from cartridge soft-install bag). On L1 transfer: on-chain revoke or keeper calling burn — evolve SIM soft-burn. |
| **Sepolia milestones** | (a) ~~lock A vs B~~ → **A locked** (b) equip/unequip soft installs against cartridge instance (c) revoke path test (sell Realm on Sepolia mock / mainnet eth_call) (d) FE parcel grid reads placements from diamond/indexer |
| **Migration** | SIM cPaarcels + nested → mint instances; burned rows stay burned |
| **FE/API cutover** | `pages/api/aarcade-cartridge-parcels.ts` → subgraph/diamond provider; keep Realm txs for real equip of L1 installations |
| **Risks** | Two equip paths (Realm L1 vs soft place) must not share typeIds; revoke race if RPC fails (SIM rule: do not burn on RPC fail — preserve) |

### WS5 — Soft channel

| | |
|--|--|
| **Current SIM home** | `helpers/softChannel.helper.ts` — localStorage cooldowns; credits session UI alchemica; no Realm TX |
| **Target on-chain** | **Locked:** hard-kill soft channel when Realm sigs work → **Realm diamond** channel/claim. **No** `GvChannelSoftFacet` on GV-2D. |
| **Sepolia milestones** | (a) FE branch: `isRealRealmParcel` → Realm channel (b) flag off / hard-kill soft channel for Base wallets (c) do **not** ship a GV soft-channel facet |
| **Migration** | Discard soft channel localStorage; no balance migrate (UI alchemica was fake) |
| **FE/API cutover** | Replace soft channel entry points in parcel UI; document that soft alchemica ≠ ERC20 |
| **Risks** | Players confuse soft credits with real alchemica; enabling Realm channel without working signatures regresses UX |

### WS6 — cPortals

| | |
|--|--|
| **Current SIM home** | Aarcade cartridge SIM: pack lifecycle → VRF → open → apply/redeem/list; PortalWar `?mode=cportal`; eye redeem collect-N (Aarcade PR #10 / cportal-redeem track). Contracts: `CPortalVrfConsumer.sol`. Docs: `CPORTAL_WAR.md`. |
| **Target on-chain** | **Aarcade cartridge diamond** (+ VRF consumer). **Not** GV-2D diamond. Real portals / BRS Portal War stay L1. |
| **Sepolia milestones** | Owned by Aarcade: (a) VRF seal on Sepolia (b) eye redeem rules in mutable GameRules (not immutables) (c) PortalWar cportal settlement (d) Envio entities |
| **Migration** | SIM cPortal packs → discard or claim per Aarcade plan; wipe script already exists |
| **FE/API cutover** | GV-2D only links/embeds Portal War / cartridge tabs; no GV craft path for portals |
| **Risks** | Scope creep pulling portal packs onto GV-2D; BRS vs cPortal points confusion in UI |

### WS7 — cAavegotchis

| | |
|--|--|
| **Current SIM home** | Cartridge heroes (`cartridgeHero.helper.ts`) — starter ids, bind owned L1, wearables, eye apply from cPortal redeem |
| **Target on-chain** | **Cartridge `CAavegotchiFacet` / AssetsFacet**. L1 Aavegotchi diamond = traits/spirit force SoT. GV-2D consumes roster for world presence; does not reimplement mint/bind. |
| **Sepolia milestones** | Aarcade: bind owned/starter/rental on Sepolia cartridge; eye apply after redeem; GV-2D: read roster via SIM→subgraph swap |
| **Migration** | SIM heroes → cartridge mint/bind; starters may remain free under rules |
| **FE/API cutover** | `AARCADE_CARTRIDGE_SIM_URL` → SubgraphCartridgeProvider; composeGotchi unchanged |
| **Risks** | Sepolia has no real gotchis — mainnet eth_call for bind proofs; dual wearables inventory |

### WS8 — Aarcade cartridge diamond relationship

| | |
|--|--|
| **Current** | Cartridge + console diamonds already on Sepolia (addresses §2). GV proxies SIM APIs. `mintCraftedItemsToCartridge` best-effort after craft. |
| **Target** | **Locked split:** **GV-2D** = soft **catalog/craft** + **tiles ERC1155 bag** + Place (against cartridge parcel ids); **Cartridge** = **soft-install ERC1155 bag**, cPaarcel, heroes, cPortals, pocket; **L1** = Realm/Installation/Tile/Aavegotchi/tokens. Bridge: after GV soft-install craft, mint into **cartridge bag** (required SoT, not optional mirror). |
| **Sepolia milestones** | (a) publish ownership matrix in both repos (this doc + Aarcade ONCHAIN plan link) (b) bridge: GV craft → cartridge ERC1155 bag mint (c) FE flags don’t double-mint / dual-SoT (d) indexer names: `gv2d-soft-base` vs `aarcade-cartridge-base` |
| **Migration** | N/A beyond documenting SoT |
| **FE/API cutover** | One provider per surface; never write soft install qty to both Mongo and two diamonds without a bridge event |
| **Risks** | Blind duplication; fee economics on wrong diamond; selector/storage collisions if someone merges diamonds |

---

## 5. Shared infra

### AppStorage (append-only)

Current `LibAppStorage` (spike): `balances`, `tileRegistered`, `tileCost`, `paymentEnabled`, `alchemicaTokens`, `ghostDefaultCost`, `rulesVersion`, `initialized`.

**Append only** for later facets, e.g.:

- `itemRegistered` / `itemCost` / `itemMeta` (catalog)
- `placements[parcelKey][slot]` or parallel mappings
- ~~`channelSoft` cooldowns~~ — **do not append**; soft channel hard-killed, no GV facet
- ERC1155 operators / approvals if cut later

Never reorder/remove spike fields.

### GvRules (mutable)

Retune costs, `paymentEnabled`, feature flags, ghost default **without** diamondCut. Same lesson as Aarcade GameRules / cPortal eye-redeem: **no constructor immutables for economics**.

### Token shape (locked 2026-09-08)

| Surface | Standard | Home |
|---------|----------|------|
| Soft tiles 8–47 | **ERC1155** (cut from current Sepolia diamond-native balances) | **GV-2D diamond** (tiles bag; stakeable later) |
| Soft installs (Waalls/Lodge/Store/furniture) | **Transferable ERC1155** | **Aarcade cartridge** (soft-install bag SoT) |
| cPaarcel | ERC721 / instance | **Aarcade cartridge** |

Diamond-native balances remain only as the **pre-cut** Sepolia spike state for tiles — migrate → ERC1155; do not extend native balances to soft installs.

Disjoint id bands still apply (tiles 8–47; waalls 162–170; lodge 171–179; store 180–188; furniture 189–208+).

### Indexer

- Prefer **Envio** in `aavegotchi-envio-indexers` (Flux sunsetted per Aarcade plan).
- New indexer namespace e.g. `gv2d-soft-base` for GV-2D events (`TilesMinted`, `ItemCrafted`, `Placed`, `RulesUpdated`).
- FE reads via existing subgraph proxy pattern — not browser→Hasura direct.
- Cartridge stays on `aarcade-cartridge-base`.

### FE flags

| Flag | Purpose |
|------|---------|
| `USE_GV2D_DIAMOND` | Soft tile mint + later soft craft/place |
| `GV2D_DIAMOND_ADDRESS` | Sepolia/mainnet addr |
| `GV2D_PAYMENT_ENABLED` | UI expect alchemica pull (mirror Rules) |
| `VITE_CARTRIDGE_SIM` / server `AARCADE_CARTRIDGE_SIM_URL` | SIM vs diamond/subgraph for cartridge surfaces |
| Soft-channel kill switch | **Hard-kill** soft channel → Realm path (no GV soft-channel facet) |

---

## 6. Migration (Mongo SIM / offchain.store / localStorage)

| Source | Assets | Strategy |
|--------|--------|----------|
| `offchain.store` + `/api/offchain` | Waall/Lodge/Store qty + placements | Export per wallet → claim contract or owner credit; then read-only freeze → delete API |
| localStorage soft channel | Cooldowns / fake alchemica | Discard |
| localStorage interiors / sim_credit | Layouts / listings | Phase 2: commit hash on-chain or keep off-chain until escrow |
| Cartridge SIM Mongo | cPaarcel, cInstallation instances, heroes, cPortals | Per Aarcade D6: SIM → subgraph; burned stay burned; optional discard unpaid soft drafts |
| Early GV tile testers | Diamond-native balances (Sepolia spike) | **Migrate → ERC1155** on GV-2D; then FE switch |

**Order:** freeze writes → snapshot → credit/mint → flip FE flag → disable SIM write paths → archive.

---

## 7. Locked decisions + remaining TBD

### Locked (walkthrough 2026-09-08 — Julius)

1. **Soft tiles** — **ERC1155** on GV-2D (not diamond-native balances); craft target ~**50% alchemica**; **stakeable later**. Migrate current Sepolia diamond-native tile balances → ERC1155.
2. **Waalls / Lodge / Store / furniture** — on-chain **craft + place + resell** via transferable ERC1155: **craft → bag → place**; **unequip → bag → resell**.
3. **Soft-install bag SoT** — **Aarcade cartridge** (not GV-2D diamond).
4. **cPaarcel home** — **Aarcade cartridge**; GV-2D diamond only **places** soft installs against **cartridge parcel ids**.
5. **Sepolia payment** — stay `paymentEnabled=false` until Store/tile craft alchemica costs are set.
6. **Soft channel** — **hard-kill** when Realm sigs work; **no** GV soft-channel facet.
7. **cPortals / cAavegotchis / cartridge pocket** — remain **Aarcade-owned parallel** (not on GV-2D diamond).

**Bag split (explicit):** **tiles bag on GV-2D** · **soft-install bag on cartridge**.

### Remaining TBD

1. **Store / Lodge / Waall (and tile) craft alchemica costs** — still TBD; use mutable **GvRules** placeholders until locked. (Blocks flipping `paymentEnabled`.)
2. **Id policy (optional)** — permanently reserve 162–208+ (and 8–47) as GV soft-native so L1 Installation/Tile never collide; document in both repos?
3. **Interior / sim_credit escrow** — in-scope for Sepolia Phase 2 or explicitly mainnet-only?

---

## 8. Immediate next 2–3 engineering steps (after this doc)

1. **FE tile cutover + ERC1155 cut** — `USE_GV2D_DIAMOND` → `mintTiles` for ids 8–47 against `0x34a8…e872`; plan diamond-native → ERC1155 balance migrate; feature-flag kill `craftCTileLocally`; leave Golden 1–3 on Tile diamond; keep `paymentEnabled=false`.
2. **Catalog freeze PR** — export Waall/Lodge/Store/furniture (+ tile) JSON → versioned `GvCatalog` struct + seed script (register-only, no craft yet); GvRules cost placeholders; unit tests for id bands.
3. **Craft → cartridge bag smoke** — cut `GvCraftFacet` for one Store id (180) + one Waall id that mints transferable ERC1155 into **cartridge** bag; Place pulls from cartridge against cartridge cPaarcel ids. (Ownership locks in §7 are done — do not re-litigate bag/cPaarcel home.)

---

## 9. Success criteria (Sepolia)

- [ ] Soft tiles 8–47: FE mints on GV-2D diamond (ERC1155); native→ERC1155 migrate done; `craftCTileLocally` dead behind flag
- [ ] `paymentEnabled` stays false until costs locked; toggle still proven in QA
- [ ] At least one Waall + Lodge + Store type craftable on GV → **cartridge bag** ERC1155 readback
- [ ] Place/remove soft install from cartridge bag on a **cartridge** cPaarcel id
- [ ] Ownership matrix published; tiles bag = GV, soft-install bag = cartridge; no double SoT
- [ ] Offchain write path frozen for migrated ids
- [ ] cPortal / cAavegotchi workstreams explicitly tracked under Aarcade diamonds (not GV-2D backlog)

---

## 10. Doc maintenance

- Update this file when a workstream ships a Sepolia milestone (checkboxes + date).
- Keep [`GV2D_DIAMOND_SPIKE.md`](./GV2D_DIAMOND_SPIKE.md) as historical spike note; point deferred items here.
- Cross-link from Aarcade `ONCHAIN_DIAMOND_PLAN.md` § ownership when Julius accepts matrix.

---

## 9. Decor installations + staking fees (locked direction 2026-09-08)

**Scope:** RecipeBook **DECOR** page — L1 `installationType === 7` parcel decorations (Rofl Gnome, REALM Globe, Caamp Fire, etc.; ~48 type-7 L1 rows in catalog). Many catalog costs are currently `[0,0,0,0]` (raffle/airdrop/LE clutter).

**Same principle as soft tiles**
- Decor becomes **transferable ERC1155** (bag → place → unequip → resell), not soft-only local inventory.
- **Actual decor holders** can **stake** their decor to earn a share of fees from **cInstallation mints** (Waall/Lodge/Store/furniture and/or cartridge `mintInstallation` — fee basis TBD in Rules).

**Ownership sketch (align with bag locks)**
| Piece | Home |
|-------|------|
| Decor ERC1155 bag | Prefer **same bag SoT as soft installs = Aarcade cartridge** (unless L1 Installation diamond already owns that typeId — then don’t duplicate; stake against L1 balance or bridged mirror) |
| Place on parcel | GV-2D Place against cartridge cPaarcel / real Realm as already planned |
| Staking + fee splitter | New facet(s): e.g. `GvDecorStakeFacet` + fee skim on cInstallation craft/mint into a claimable pool for stakers |
| Soft tiles staking | Parallel pattern: tile stake for future tile-side rewards (already noted); decor stake specifically for **cInstallation mint fees** |

**Sepolia**
- Keep `paymentEnabled=false` until craft costs set.
- Fee % / which mint events pay decor stakers → mutable `GvRules` (not immutables).

**Open (decor-specific)**
1. Fee basis: % of alchemica on soft-install craft, flat GHST, and/or cartridge SIM mint fee?
2. Stake weight: per-token equal vs rarity-weighted (Common→Godlike bands)?
3. L1 type-7 already on Installation diamond: stake live L1 ERC1155 vs wrap/mirror into cartridge?
4. Zero-cost raffle decor: exclude from mint fee share, or include if staked?


---

## 10. Fee split + stake weight (locked 2026-09-08 / evening)

### Craft alchemica fee split (on paid craft — when paymentEnabled)
Of craft alchemica taken as protocol fee / cost routing (exact skim vs full cost TBD in Rules):

| Share | Destination |
|------:|-------------|
| 50% | AarcadeGh$t treasury wallet |
| 25% | Gotchiverse |
| 10% | Gotchiverse burn wallet |
| 15% | DAO |

**Still need Julius:** where **staked decor** (and later staked tiles) take their cut — inside the 25% Gotchiverse bucket, a separate skim before this split, or a % of sales only?

### Sales
- **Cartridge mint:** free (no mint fee).
- **On sale** (secondary / listing): **50% of sale** → AarcadeGh$t treasury. (Other 50% TBD — seller vs protocol.)

### Stake weight
- **Aavegotchis:** BRS-banded weights.
- **Non-BRS items** (decor, tiles, soft installs, etc.): **equal weight per token**.

### Decor craft costs
- **Catalog rule (2026-09-08):** every `installationType === 7` level-1 row (`itemId > 0`) in `shared_code/data/installations.json` uses craft `alchemicaCost` = **2× the average non-zero soft-tile catalog cost** (tiles ids **8–47** from `shared_code/data/tiles.json`, excluding all-zero ghost rows 38–47 from the average).
- Computed **base** vector (1 dp, like tiles): **`[101, 9.6, 53, 13.9]`** = 2× avg of ids **8–37** → `[FUD, FOMO, ALPHA, KEK]` (Common / no-rarity).
- **Rarity multipliers (2026-09-09):** catalog has **no official rarity field** — parse rarity from the item `name` prefix when present. `cost[i] = round1(base[i] * multiplier)`.

  | Rarity (name prefix) | Multiplier |
  |----------------------|------------|
  | Common (or none) | **1.0×** |
  | Uncommon | **1.5×** |
  | Rare | **2.0×** |
  | Legendary | **4.0×** |
  | Mythical | **8.0×** |
  | Godlike | **16.0×** |

- Sourced via `installationsCatalog.js` `require('./installations.json')` (no local type-7 overlays). Fixture for later on-chain register: `packages/gv2d-diamond/deployments/decor-craft-costs.base-sepolia.json`.
- Further tuning still possible via **GvRules**; Sepolia **`paymentEnabled` still false** until enabled. Tile costs unchanged.

### L1 type-7 clarification (question 3)
Live Base **Installation diamond** already has many `installationType === 7` decoration itemIds (Rofl Gnome, REALM Globe, …). So we must not mint a **second** conflicting ERC1155 with the same ids on GV/cartridge if players already hold them on L1.

Options:
- **A.** Stake/use **L1 Installation ERC1155** balances directly for decor staking.
- **B.** Soft/new decor only on cartridge/GV (new id band); L1 decor stays on Installation diamond.
- **C.** Bridge/wrap L1 decor into cartridge bag 1:1 for unified bag UX.

Default recommendation until chosen: **A for existing L1 type-7**, **B for any new soft-only decor** — never double-mint the same id.


---

## 11. Decor / soft-install mint fee pool — aligned to SafeFeeRouter (2026-09-11)

**Canonical split = SafeFeeRouter `LineBMint`** (AarcadeGh-t Base Sepolia `0x9476…3985`):

| Share | Destination | Router bps |
|------:|-------------|------------|
| **40%** | **Stakers** (decor/tiles/non-BRS equal per token; gotchis BRS-banded) | 4000 |
| **40%** | AarcadeGh$t treasury | 4000 |
| **10%** | Burn wallet | 1000 |
| **10%** | DAO | 1000 |

Notes:
- **Align with router** (Julius 2026-09-11): supersedes earlier walk locks **50/40/5/5** and the older 50/25/10/15 draft for this stream.
- GV craft payment (when `paymentEnabled`) should call / mirror `SafeFeeRouter.pay(LineBMint, …)` so one SoT for splits — don’t maintain a second bps table on GV unless it reads the router.
- Still in force: cartridge **mint free**; secondary **sale → 50% AarcadeGh$t treasury only** (sales are **not** Line B); Sepolia `paymentEnabled=false` until costs set.

### Sales (confirmed)
- Secondary sales: **50% → AarcadeGh$t treasury only** (not the Line B staker split).


## 12. Soft-install bag SoT — corrected (2026-09-08 night)

**Lock flip:** soft-install **bag / inventory lives on the GV-2D diamond** (ERC1155), not the Aarcade cartridge.

- Cartridge `InventoryFacet.mintWearable` = **cWearables only** — unrelated to build bag.
- Sepolia craft already mints Store/Lodge/etc. into GV ERC1155 ids **162–215** — treat as canonical bag SoT (no longer “temporary staging” pending cartridge mint).
- Cartridge still owns cPaarcels / cWearables / arcade SIM as previously scoped; GV Place spends from **GV bag**.



<!-- fee sync 2026-09-11: LineBMint 40/40/10/10 -->
