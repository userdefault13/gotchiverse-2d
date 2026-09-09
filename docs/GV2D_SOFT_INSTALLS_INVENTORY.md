# GV-2D soft installs — inventory (Phase A)

**Date:** 2026-09-09 (PT)  
**Branch:** `feature/gv2d-diamond-tile-mint`  
**Live GV diamond (Base Sepolia):** `0x34a851523A6f3351940d235373038b2A0A85e872`  
**Locked bag SoT:** Aarcade cartridge ERC1155 (craft → bag → place on cPaarcel).  
**Tiles bag (separate):** GV-2D ERC1155 ids **8–47** (already live). Soft-install ids below are **disjoint** from the tile band.

---

## 1. Id bands (catalog ↔ FE)

| Family | Ids | Type | FE helpers | RecipeBook page |
|--------|-----|------|------------|-----------------|
| Waalls | 162–170 | 3 | `helpers/waalls.helper.ts` (`craftWaallLocally`) | RecipeBook **Original** filter `waall` |
| Lodge | 171–179 | 4 | `helpers/lodge.helper.ts` (`craftLodgeLocally`) | RecipeBook **Lodge** |
| Store | 180–188 | 9 | `helpers/store.installation.helper.ts` (`craftStoreLocally`) | RecipeBook **Store** |
| Cashier | 189–197 | 10 | `helpers/store.layout.helper.ts` (+ Maaker-style upgrade) | Store furniture recipes / interior |
| Display Table (shelf) | 198 | 10 | `SHELF_ITEM_ID` / `DISPLAY_TABLE_ITEM_ID` | Store furniture |
| Console (Arcade) | 199–207 | 10 | `helpers/console.installation.helper.ts` | RecipeBook **Console** |
| Terminal | 208 | 10 | `TERMINAL_ITEM_ID` | Store furniture |
| Broadcaster | 209 | 10 | `helpers/broadcaster.installation.helper.ts` | Store furniture (L1) |
| Bazaar | 210 | 11 | `helpers/bazaar.installation.helper.ts` | World / layout (soft interior) |
| DAO Satellite Office | 211 | 12 | `helpers/daoOffice.installation.helper.ts` | World / layout |
| Potion Shop | 212 | 13 | `helpers/potionShop.installation.helper.ts` | World / layout |
| Feature Table | 213 | 10 | `FEATURE_TABLE_ITEM_ID` | Store furniture |
| Rack H / Rack V | 214 / 215 | 10 | `RACK_H_ITEM_ID` / `RACK_V_ITEM_ID` | Store furniture |

**Notes**
- “Arcade” in product language ≈ **Console** ids 199–207 (titles via `CONSOLE_AARCADE_GAMES`).
- Legacy layout aliases: old shelf `181` / cashier `182` migrate → `198` / `189` in layout helpers.
- Live Installation diamond **rejects** these typeIds (`Item type doesn't exist`) — they are soft-native.

---

## 2. JSON / catalog sources

| Source | Role |
|--------|------|
| `shared_code/data/installationsCatalog.js` | Merged type catalog (L1 Installation + soft overlays). Soft Store/Lodge/furniture costs currently **`[0,0,0,0]`** placeholders. Lodge L1–9 still carry Realm-style alchemica numbers. |
| `shared_code/data/installations.json` | Broader installation type table (Lodge/Waall live-ish rows; Store soft). |
| `shared_code/data/store.installations.local.json` | Soft Store L1–9 (+ furniture rows used by FE). Costs zero. |
| `shared_code/data/console.installations.local.json` | Console L1–9. Costs zero. |
| `shared_code/data/broadcaster.installations.local.json` | Broadcaster 209. Cost zero. |
| `shared_code/data/bazaar|daoOffice|potionShop.installations.local.json` | Soft world interiors 210–212. Costs zero. |
| `data/installationsData.json` | Sprite offsets only (not type economics). |

---

## 3. Craft helpers (off-chain today)

| Helper | Path | Persistence |
|--------|------|-------------|
| `craftWaallLocally` | `helpers/waalls.helper.ts` | `offchain.store` / local inventory |
| `craftLodgeLocally` | `helpers/lodge.helper.ts` | offchain inventory |
| `craftStoreLocally` | `helpers/store.installation.helper.ts` | offchain inventory |
| `craftStoreFurniture` / `craftConsoleFurniture` | `helpers/store.layout.helper.ts`, `lodge.layout.helper.ts` | localStorage furniture bags |
| `craftLodgeFurniture` | `helpers/lodge.layout.helper.ts` | localStorage |
| Broadcaster / Terminal | inventory via store furniture helpers + `isBroadcasterItemId` | local / offchain |
| UI entry | `components/UI/hud/components/CraftingTable/index.tsx` | still calls `*Locally` for Store/Lodge/Waall; soft cTiles already gated to diamond when `NEXT_PUBLIC_USE_GV2D_DIAMOND` |

---

## 4. FE pages / surfaces

| Surface | Location |
|---------|----------|
| Crafting Table | `components/UI/hud/components/CraftingTable/` |
| RecipeBook pages | `components/UI/hud/components/RecipeBook/` — Original (+Waalls), Decor, Store, Lodge, Console |
| Maaker modal | `components/UI/hud/components/MaakerModal/` (Cashier/Store level bumps) |
| Phaser place/equip | `components/phaser/Installations.ts` + layout helpers |
| Offchain API | `helpers/offchain.store.ts` → `PUT /api/offchain` |

---

## 5. Costs (current)

| Band | Catalog costs | Locked decision |
|------|---------------|-----------------|
| Store 180–188 + furniture 189–215 (soft zeros) | `[0,0,0,0]` | **TBD** — Sepolia `paymentEnabled=false`; smoke with zero / placeholders OK |
| Lodge 171–179 | Non-zero Realm-style numbers in catalog | Treat as placeholders until Store/Lodge costs locked; do **not** enable payment |
| Waalls 162–170 | Small non-zero in catalog | Same — mutable via rules later |
| Tiles 8–47 | Seeded on diamond (Decor L1 scaled separately) | Already on GV; payment still off |

---

## 6. Gap to on-chain (cartridge vs GV)

### Locked target
1. **Craft** soft install → mint transferable ERC1155 into **Aarcade cartridge bag**.  
2. **Place** from cartridge bag onto **cartridge cPaarcel** (GV place facet later).  
3. Unequip → bag → resell.

### Cartridge reality (2026-09-09 audit of `~/Dev/AarcadeGh-t/contracts/cartridge`)

| Finding | Detail |
|---------|--------|
| **Missing mint API** | `InventoryFacet` only has `mintWearable(cartridgeId, itemTypeId, refId)` — cartridge-local wearable instances, **not** ERC1155 soft-install bag mint. |
| No `mintInstallation` / `mintGameItem` / authorized game minter for soft ids | Grep across cartridge facets + `IAarcadeCartridge` shows no soft-install mint entrypoint. |
| Soft-launch bag today | Still largely **SIM** (`ApiSimCartridgeProvider`, `parcelInventory` / installation snapshots) — not diamond ERC1155 balances. |
| SIM risk | Do **not** bolt a GV→cartridge mint onto wearables or break SIM; needs a deliberate cartridge Inventory cut. |

### Phase B temporary path (this cut)
- Register soft types on **GV-2D** `GvCatalogFacet`.  
- Permissionless `GvCraftFacet.craftInstallations` mints into **GV diamond ERC1155** balances for ids in soft band (**162–215**, disjoint from tiles **8–47**).  
- **Explicit SoT debt:** balances on GV are a **bridge staging bag**, not the locked cartridge SoT. Next slice = cartridge Inventory mint entrypoint + bridge / dual-write, then FE cutover off `*Locally`.

---

## 7. Phase B smoke registration set

Minimum types to register on Sepolia:

| Id | Name | Why |
|----|------|-----|
| 171 | Gotchi Lodge Level 1 | Family Lodge |
| 180 | Store Level 1 | Family Store |
| 189 | Cashier Level 1 | Furniture / Cashier |
| 198 | Display Table | Furniture / shelf |
| 208 | Terminal Level 1 | Terminal |
| 209 | Broadcaster | Broadcaster |
| 199 | Console Level 1 | Arcade / Console |

Costs: zero placeholders; `paymentEnabled` stays **false**.

---

## 8. FE next (after this contract slice)

1. Extend `helpers/gv2dDiamond.helper.ts` with `craftInstallations([id],[qty])` (mirror `mintTiles`).  
2. Gate CraftingTable Store/Lodge (then Waall/furniture) behind the same diamond flag.  
3. Read soft-install balances via GV `balanceOf` until cartridge bridge lands — then switch bag reads to cartridge.  
4. Place/resell still off-chain until `GvPlaceFacet` + cPaarcel wiring.
