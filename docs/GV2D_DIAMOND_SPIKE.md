# GV2D Diamond spike — tile mint (2026-09-08)

Links to plan: [`GV2D_DIAMOND_PLAN.md`](./GV2D_DIAMOND_PLAN.md) · full `c*` cutover: [`GV2D_CSTAR_CUTOVER_PLAN.md`](./GV2D_CSTAR_CUTOVER_PLAN.md).

## In this spike

| Item | Status |
|------|--------|
| EIP-2535 Diamond + Cut / Loupe / Ownership | Done (`packages/gv2d-diamond`) |
| Append-only `LibAppStorage` | Done |
| `GvRulesFacet` (mutable costs, `paymentEnabled`, ghost default) | Done |
| `GvTileMintFacet.mintTiles` permissionless for ids **8–47** | Done |
| FE flag `NEXT_PUBLIC_USE_GV2D_DIAMOND` → Craft soft cTiles via `mintTiles` | Done |
| Inventory: **diamond-hosted ERC1155** (`GvInventoryFacet` + `LibERC1155`) | Done (upgraded from native balances; same slots) |
| Seed tiles 8–47 from `tiles.json` (+ ghost default 5 FUD + 2 ALPHA) | Done |
| Base Sepolia deploy script + README cast smoke | Done |
| Free-mint / `paymentEnabled` smoke mode | Done |

Conceptual kill (contracts only): soft craft path for cTiles 8–47 moves to diamond mint API. FE `craftCTileLocally` not changed in this spike.

## Deferred (see [`GV2D_CSTAR_CUTOVER_PLAN.md`](./GV2D_CSTAR_CUTOVER_PLAN.md) + plan §C / §D)

- **Waalls / Lodge / Store** catalog + craft (`GvCatalogFacet` / `GvCraftFacet`)
- **Place** soft installs on parcel + Lodge/Store interior furniture (`GvPlaceFacet`) — facet live; FE wired behind `NEXT_PUBLIC_USE_GV2D_DIAMOND` (inventory §9–§10; interior keys encode kind+installationId, no diamondCut)
- **SoftChannel** (`GvChannelSoftFacet`) / deprecate soft channel helper
- Baazaar listing / marketplace integration (ERC1155 transfers done on diamond)
- Interior facets, sim_credit escrow
- FE flag `USE_GV2D_DIAMOND` + drop offchain tile qty sync
- Live Base Sepolia alchemica wiring (optional; Rules can enable payment when tokens are set)

## Ownership / upgrades

Ownership is **not** renounced. Costs and `paymentEnabled` retune via `GvRulesFacet` without a cut; new facets via `diamondCut`.


## ERC1155 cut (Sepolia)

Upgraded live diamond `0x34a851523A6f3351940d235373038b2A0A85e872` via `UpgradeERC1155` — replaced inventory/mint facets, added ERC1155 selectors, registered `supportsInterface(0xd9b67a26)`. Existing `AppStorage.balances` preserved (no wipe).
