# GV2D Diamond spike — tile mint (2026-09-08)

Links to plan: [`GV2D_DIAMOND_PLAN.md`](./GV2D_DIAMOND_PLAN.md).

## In this spike

| Item | Status |
|------|--------|
| EIP-2535 Diamond + Cut / Loupe / Ownership | Done (`packages/gv2d-diamond`) |
| Append-only `LibAppStorage` | Done |
| `GvRulesFacet` (mutable costs, `paymentEnabled`, ghost default) | Done |
| `GvTileMintFacet.mintTiles` permissionless for ids **8–47** | Done |
| Inventory: **diamond-native balances** (`GvInventoryFacet`) | Done (documented; ERC1155 deferred) |
| Seed tiles 8–47 from `tiles.json` (+ ghost default 5 FUD + 2 ALPHA) | Done |
| Base Sepolia deploy script + README cast smoke | Done |
| Free-mint / `paymentEnabled` smoke mode | Done |

Conceptual kill (contracts only): soft craft path for cTiles 8–47 moves to diamond mint API. FE `craftCTileLocally` not changed in this spike.

## Deferred (see plan §C / §D)

- **Waalls / Lodge / Store** catalog + craft (`GvCatalogFacet` / `GvCraftFacet`)
- **Place** soft installs on parcel (`GvPlaceFacet`)
- **SoftChannel** (`GvChannelSoftFacet`) / deprecate soft channel helper
- Full **ERC1155** inventory / transfers / Baazaar listing
- Interior facets, sim_credit escrow
- FE flag `USE_GV2D_DIAMOND` + drop offchain tile qty sync
- Live Base Sepolia alchemica wiring (optional; Rules can enable payment when tokens are set)

## Ownership / upgrades

Ownership is **not** renounced. Costs and `paymentEnabled` retune via `GvRulesFacet` without a cut; new facets via `diamondCut`.
