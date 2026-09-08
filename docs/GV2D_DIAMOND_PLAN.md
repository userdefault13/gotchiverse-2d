# Gotchiverse-2D Diamond — planning draft (2026-09-08)

**Goal:** One EIP-2535 diamond that absorbs **non-on-chain legacy / soft-launch** contracts and txs so GV-2D no longer depends on localStorage, `/api/offchain`, free local craft helpers, or soft channeling for production economy.

**Not in scope (already live on Base):** Realm / Installation / Tile / Alchemica / GLTR / Aavegotchi diamonds. Aarcade cartridge diamonds stay separate (SIM → diamond cutover is its own track).

---

## A. Already on-chain (do not re-implement)

| Surface | Where | Notes |
|---------|--------|------|
| Parcel equip / unequip | Realm diamond | FE still hits realm-server signature stubs → empty `0x` |
| Channel / claim alchemica | Realm diamond | Same empty-sig stub pattern |
| Craft / upgrade installations | Installation diamond | Live `alchemicaCost` |
| Craft tiles (LE golden etc.) | Tile diamond | Live costs — Golden `1–3` stay here |
| Alchemica + GLTR ERC20 | Token contracts | Allowances via Installation/Realm |

---

## B. Soft-launch / legacy off-chain (diamond candidates)

These are the main “non-onchain legacy” surfaces in `gotchiverse-2d` today:

### B1. Offchain parcel installables (ids that don’t exist on Installation diamond)
- **Waalls** `162–170` — `craftWaallLocally`, local inventory + placements
- **Lodge** `171–179` — free craft, interior layout, upgrades
- **Store** `180–188` (+ furniture Console `199–207`, Cashier `189–197`, shelves/racks, Terminal, etc.)
- Persistence: `helpers/offchain.store.ts` → memory + localStorage + debounced `PUT /api/offchain`
- Problem: Store/Lodge typeIds **revert** on live Installation diamond (`Item type doesn't exist`)

### B2. Soft interiors (layout-only today)
- Potion Shop, DAO Office, Bazaar — `*.layout.helper.ts`, mostly localStorage
- Lodge/Store listings use `sim_credit` (no escrow)

### B3. Soft economy txs
- **Soft channel** — `softChannel.helper.ts` credits UI alchemica + cooldowns, no Realm TX
- **cTile soft craft (LEGACY — replace)** — ids `8–47` (+ ghost pack) via `craftCTileLocally` → offchain inventory.
  - **Decision (2026-09-08):** kill this path; **anyone can mint** these tiles on the GV-2D diamond (permissionless, not minter-gated). Golden LE tiles `1–3` stay on the live Tile diamond.
- Local Waall/Lodge/Store crafts that debit session balance but never call the diamond

### B4. Multiplayer / server (probably **not** diamond-first)
- Colyseus rooms, combat-traits stub, foundry config
- Keep off-chain until combat/economy needs settlement; optional later “commit result” facet

### B5. Cartridge bridge (coordinate with Aarcade, don’t duplicate)
- cPaarcel / cInstallation / cAavegotchi SIM via `AARCADE_CARTRIDGE_SIM_URL`
- After craft, GV can `mintCraftToCartridge` — on-chain craft already paid; SIM mirror is free

---

## C. Proposed diamond shape (EIP-2535)

Working name: **Gotchiverse2DDiamond** (or `GvSoftDiamond`) on Base.

| Facet | Responsibility |
|-------|----------------|
| `DiamondCut` / `Loupe` / `Ownership` | Standard |
| `GvCatalogFacet` | Register soft item types (Waall/Lodge/Store/furniture/cTile packs): size, level, costs, deprecated, nextLevelId |
| `GvCraftFacet` | Craft soft installs (Waall/Lodge/Store/furniture) for alchemica/GHST; mint ERC1155 |
| `GvTileMintFacet` | **Permissionless** mint for soft tiles `8–47` (greyscale + ghost). No whitelist / role. Costs from `GvRules` / catalog. Replaces `craftCTileLocally`. Golden `1–3` remain on live Tile diamond. |
| `GvInventoryFacet` | Wallet balances for soft item types; transfer/burn |
| `GvPlaceFacet` | Place/remove soft installs on a parcel (or interior instance id); x/y; conflict checks |
| `GvUpgradeFacet` | Level bumps for Waall/Lodge/Store/Cashier/Console using catalog |
| `GvInteriorFacet` (phase 2) | Interior layout commits for Lodge/Store/Potion/DAO/Bazaar |
| `GvChannelSoftFacet` (optional / migrate-off) | Only if soft channel must stay for cParcels without Realm; else deprecate in favor of Realm channel |
| `GvRulesFacet` | Mutable costs/params (same pattern as Aarcade GameRules — **not** constructor immutables) |

ERC1155 can be diamond-hosted or a sibling token owned by the diamond.

---

## D. Phased cutover

1. **Catalog freeze** — export current soft catalogs (`store.installations.local.json`, waalls/lodge, cTiles) → on-chain `GvCatalog` with versioned rules URI.
2. **Public tile mint** — ship `GvTileMintFacet` for `8–47`; FE drops `craftCTileLocally` / offchain tile qty.
3. **Craft + inventory** — replace remaining `*Locally` crafts with diamond txs; migrate `offchain.store` balances once.
4. **Place on parcel** — replace local placements with `GvPlaceFacet`; keep FE parcel grid UX.
5. **Deprecate** `/api/offchain`, localStorage inventory, soft channel for Base wallets that can use Realm.
6. **Interiors / sim_credit** — phase 2 (listings escrow, furniture bags).
7. **Combat/foundry** — stay server-side until settlement design exists.

---

## E. Locked + open decisions

**Locked**
- Soft tiles `8–47`: **public mint** on GV-2D diamond — no legacy soft craft, no minter allowlist. Anyone who pays the catalog cost can mint.

**Open**
1. Soft installs as **new ERC1155 ids** vs extending Installation diamond (unlikely — those ids don’t exist there)?
2. Soft tile / install craft spend **real Base alchemica** or a GV-2D play-token initially?
3. cPaarcel soft channel → Realm channel when parcel is real NFT, diamond only for pure SIM parcels?
4. Overlap with Aarcade cartridge diamond — inventory of record: GV-2D diamond, cartridge, or both with bridge?
5. Tile mint: free (gas-only) vs catalog alchemica cost (today soft path uses catalog / ghost default `5 FUD + 2 ALPHA`)?

---

## F. Immediate next engineering steps

1. Write id → source matrix (on-chain Installation vs soft catalog vs tile) as a spreadsheet/JSON.
2. Spec `GvCatalog` struct + rulesVersion bump story.
3. Spike: Base Sepolia diamond with **`GvTileMintFacet` for tiles `8–47` (permissionless)** + Craft/Inventory for Store `180–188`.
4. FE: replace `craftCTileLocally` behind `USE_GV2D_DIAMOND`; deprecate offchain tile qty sync.
5. Optional: one-shot migrate existing offchain tile balances → diamond balances for early testers.


---

## G. Safe changes after deploy (upgrade path)

Yes — you stay able to change the diamond safely if we follow the Aarcade pattern:

1. **EIP-2535 `diamondCut`** — add / replace / remove facets (e.g. new Interior facet, retune TileMint). Owner-only (or multisig later). Loupe still lists facets.
2. **`GvRulesFacet` mutable storage** — retune mint costs, band params, feature flags **without** a cut or constructor redeploy. Same lesson as cPortal eye-redeem: keep economics in rules storage, not immutables.
3. **AppStorage append-only** — never reorder/remove existing slots; only append new fields when a facet needs them (avoids storage corruption on upgrade).
4. **Selector hygiene** — each external fn maps to one facet; cuts must not collide.
5. **Not frozen at launch** — no “final cut” / ownership renounce until you’re ready. Optional: Timelock/multisig before mainnet.

What you *don’t* want: baking tile costs or item catalogs into constructor immutables, or renouncing ownership early — that would block safe retunes.
