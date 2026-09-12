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
| UI entry | CraftingTable + Phaser `Installations.ts` + Lodge/Store Confirm | flag on → soft cTiles `mintTiles` + soft installs 162–215 `craftInstallations` + parcel + **interior furniture** place/unequip `placeSoftInstall`/`unequipSoftInstall`; flag off → local paths unchanged |

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
- **Bag SoT (locked):** GV-2D ERC1155 ids **162–215** (same diamond as tiles 8–47, disjoint id band).

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

## 8. FE wiring (done on `feature/gv2d-diamond-tile-mint`)

| Piece | Detail |
|-------|--------|
| ABI | `web3/abi/Gv2dDiamond.json` — `craftInstallations`, `quoteCraftCost`, `InstallationsCrafted` |
| Helper | `helpers/gv2dDiamond.helper.ts` — `craftSoftInstallsOnDiamond`, `isGv2dSoftInstallCraftId`, `syncSoftInstallInventoryFromDiamond` |
| UI | `CraftingTable` — when `NEXT_PUBLIC_USE_GV2D_DIAMOND` + id ∈ **162–215**, calls diamond; does **not** call `craftStoreLocally` / `craftLodgeLocally` / `craftWaallLocally` / furniture `*Locally` |
| Flag off | Local soft craft path unchanged |
| Golden / L1 | Installation diamond `craftInstallations` + Tile diamond golden path untouched |
| Payment | `paymentEnabled=false` — Craft button / max qty not gated on alchemica for diamond soft crafts |

### How to test (Base Sepolia)

1. Env: `NEXT_PUBLIC_USE_GV2D_DIAMOND=true`, `NEXT_PUBLIC_GV2D_DIAMOND_ADDRESS=0x34a851523A6f3351940d235373038b2A0A85e872` (see `.env.example`).
2. Connect a wallet with Base Sepolia ETH; open **Crafting Table**.
3. Craft any registered soft id in **162–215** (Waalls included):
   - **171** Lodge L1, **180** Store L1, **189** Cashier L1, **198** Display Table, **199** Console L1, **208** Terminal, **209** Broadcaster.
4. Expect wallet prompt on Base Sepolia → `craftInstallations` tx → success toast; inventory qty matches `balanceOf(account, id)` on the diamond (Basescan token/`balanceOf`).
5. Wrong chain / no wallet → clear error (switch to Base Sepolia / connect wallet). No alchemica approve.
6. Flag off (`NEXT_PUBLIC_USE_GV2D_DIAMOND=false`) → same recipes use `*Locally` again (no diamond tx).
7. Golden tiles 1–3 / live L1 Installation crafts still use Tile / Installation diamonds.

**Note:** Console still may require picking a title in RecipeBook UX; diamond mint is fungible ERC1155 (instance bag / loaded titles not written by the diamond path). Furniture non-Console qty also mirrors into store/lodge furniture bags after `balanceOf` sync.

Place/unequip **on-chain** via `GvPlaceFacet` (2026-09-11). FE place/unequip wired behind `NEXT_PUBLIC_USE_GV2D_DIAMOND` (2026-09-11 PT). cPaarcel ownership checks still off-chain.

## Bag SoT correction
Soft-install bag SoT = **GV-2D diamond** (Julius 2026-09-08). Cartridge mintWearable is wearables-only.

---

## 9. Place facet (2026-09-11 PT)

`GvPlaceFacet` cut onto Sepolia diamond `0x34a851523A6f3351940d235373038b2A0A85e872` at facet `0x7A4561De880c24104e98eC1Ac7074158A29EDFD1`.

| Item | Status |
|------|--------|
| Waalls **162–170** | Registered + craftable |
| Remaining inventory band **172–215** (minus prior smoke) | Registered |
| Place / unequip | Live — bag burn ↔ placement; footprint conflict checks |
| Parcel key | `bytes32` (+ `parcelKeyFromUint` / `parcelKeyFromRealm`); cPaarcel still cartridge-owned |
| Placeholder URI | Unchanged |
| `paymentEnabled` | Still **false**; no SafeFeeRouter; ownership not renounced |

### FE wiring (2026-09-11 PT)

| Piece | Status |
|-------|--------|
| `helpers/gv2dDiamond.helper.ts` | `placeSoftInstallOnDiamond` / `unequipSoftInstallOnDiamond` (+ byId) + parcelKey helpers + bag sync |
| `components/phaser/Installations.ts` | Flag on + soft id **162–215**: Confirm batch → diamond place/unequip; move/unequip immediate paths too |
| Flag off | Existing local / offchain place path unchanged |
| ABI | `web3/abi/Gv2dDiamond.json` already has place selectors |
| Parcel ownership | Still off-chain / cartridge until bridge |

#### Parcel key scheme

- **Prefer** `parcelKeyFromUint(cPaarcelOrLocalParcelId)` for soft parcels. FE soft/cParcels use numeric `GotchiverseParcel.id` / `tokenId` (realmTokenId mirror) as that uint.
- **Fallback** when only a Realm NFT id is available: `parcelKeyFromRealm(84532, id)`.
- Documented in `resolveGv2dParcelKey` / `resolveGv2dParcelKeyFromParcel`.

#### How to test (Base Sepolia)

1. Set `NEXT_PUBLIC_USE_GV2D_DIAMOND=true` and `NEXT_PUBLIC_GV2D_DIAMOND_ADDRESS=0x34a851523A6f3351940d235373038b2A0A85e872` (or default).
2. Connect wallet; switch / approve Base Sepolia when prompted (same as craft).
3. Craft a soft install (e.g. Waall **162**) via Crafting Table → bag qty from `balanceOf`.
4. Enter build mode on a soft/cPaarcel → place install → **Confirm**.
   - Expect `placeSoftInstall` tx; bag −1; local scene keeps placement mirror.
5. Unequip (queue + Confirm, or immediate unequip path) → `unequipSoftInstall` / `ById`; bag +1.
6. Wrong chain / no wallet → clear error toast (same pattern as craft).
7. Flag off → place/unequip stays local-only (no GV place txs).

Cast smoke (optional):

```bash
cast call 0x34a851523A6f3351940d235373038b2A0A85e872 \
  "parcelKeyFromUint(uint256)(bytes32)" <PARCEL_UINT> --rpc-url https://sepolia.base.org
```

---

## 10. Interior furniture place (2026-09-12 PT)

Lodge / Store interior **Confirm** (and Remove / Move) now reuse `GvPlaceFacet` behind `NEXT_PUBLIC_USE_GV2D_DIAMOND`. No diamondCut — interiors encode into `bytes32` parcel keys.

### Item ids (already in catalog 162–215)

| Family | Ids | Interior surface |
|--------|-----|------------------|
| Cashier | 189–197 | Store (+ lodge layout helpers) |
| Display / Feature / Racks | 198, 213–215 | Store shelves |
| Console | 199–207 | Lodge + Store |
| Terminal | 208 | Store |
| Broadcaster | 209 | Lodge |

No separate registration needed — same soft-install band as exterior.

### Interior parcel key (prefer encode; no facet change)

```
keccak256(abi.encode(
  keccak256("GV2D_INTERIOR_v1"),   // domain
  uint8 kind,                     // 1=lodge, 2=store
  keccak256(bytes(installationId))
))
```

FE: `interiorParcelKeyLocal(kind, installationId)` / `resolveGv2dInteriorParcelKey`.

**Why not reuse exterior parcel key?** Exterior installs and interior furniture share small (x,y) ranges; one footprint map would collide. Key is scoped per Lodge/Store **installation instance** (layout id).

### FE wiring

| Piece | Status |
|-------|--------|
| `helpers/gv2dDiamond.helper.ts` | Interior key helpers + `getConsolePlaceableQty` |
| `helpers/lodge.layout.helper.ts` / `store.layout.helper.ts` | `skipInventory` opt on place/remove (diamond SoT) |
| `LodgeModal` / `StoreModal` | Flag on → Confirm `placeSoftInstall`; Remove/Move `unequipSoftInstall`; flag off → local |
| Inventory trays | Console qty uses ERC1155 slots when bag empty (diamond craft) |
| Flag off | Local furniture bags + Confirm unchanged |

### How to test (Base Sepolia)

1. `NEXT_PUBLIC_USE_GV2D_DIAMOND=true`, diamond `0x34a851523A6f3351940d235373038b2A0A85e872`.
2. Craft furniture (e.g. Cashier **189**, Display Table **198**, Broadcaster **209**, Console **199**).
3. Enter owned Lodge or Store → Build Mode → select brush → click floor → **Confirm**.
   - Expect `placeSoftInstall` on interior key; bag −1 via `balanceOf` sync; layout updates.
4. Remove / Move → `unequipSoftInstall` (or ById when remembered); bag +1.
5. Legacy local-only placements (no on-chain cell) fall back to local unequip when diamond returns empty.
6. Flag off → Confirm stays fully local (no GV txs).

### Notes / known quirks

- Console diamond craft is fungible ERC1155 — titled instance bag is not minted; place may use empty `loadedTitles` until a title is loaded in-modal.
- Catalog Console footprint is **2×2** on-chain while FE ghosts often treat Console as **1×1** — leave space or expect on-chain occupied neighbors.
- Upgrade (Cashier/Console/Lodge/Store/Waall L bumps) uses `GvUpgradeFacet` when `NEXT_PUBLIC_USE_GV2D_DIAMOND=true` (bag: burn L mint L+1; placed: swap `placement.itemId`). Flag off stays local layout-only.
- No SafeFeeRouter / `paymentEnabled` change.

Node smoke (interior key, no wallet):

```bash
node -e "
const { utils } = require('ethers');
const domain = utils.id('GV2D_INTERIOR_v1');
const installHash = utils.keccak256(utils.toUtf8Bytes('lodge_demo_1'));
const key = utils.keccak256(utils.defaultAbiCoder.encode(
  ['bytes32','uint8','bytes32'], [domain, 1, installHash]));
console.log(key);
"
```

### Interior / exterior upgrades (GvUpgradeFacet)

Diamond: `0x34a851523A6f3351940d235373038b2A0A85e872` · flag `NEXT_PUBLIC_USE_GV2D_DIAMOND` · `paymentEnabled=false`.

1. Craft L1 (e.g. Cashier **189**, Console **199**, Lodge **171**).
2. **Bag upgrade:** `upgradeSoftInstallInBag(fromId, amount)` burns L, mints `nextLevelId`.
3. **Placed upgrade:** place first, then `upgradeSoftInstallPlacement(placementId)` — swaps `placement.itemId` in place (same footprint).
4. FE: Lodge/Store furniture Upgrade + Console Manage Upgrade + exterior UpgradeModal (Lodge/Store/Waall) call diamond when flag on; flag off unchanged.
5. Catalog `nextLevelId` already seeded for Waalls 162–170, Lodge 171–179, Store 180–188, Cashier 189–197, Console 199–207 (zeros costs OK while payment off).

Sepolia smoke (bag Cashier L1→L2):

- craft 189: `0x8ffd8d81117a40761864abe536ca73d93a8b3238caeb4940f0b87e4e0b93dbb5`
- upgradeSoftInstallInBag(189,1): `0x7efbc108e30047863e9420b573e4fe4cd28bf31ecd579d0f00596d4fed5d6fb9`
- GvUpgradeFacet: `0x2291C073247a767CFA296120df9fF041321FEa72`
- diamondCut: `0x0b27deb95c720c9b9932960ecf4a46290cbc9109fb439687eb875d5b2532b4f4`
