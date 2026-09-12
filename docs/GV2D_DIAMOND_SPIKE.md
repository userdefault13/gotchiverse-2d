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

## Soft-tile progressive craft cooldowns (2026-09-12)

Live on Base Sepolia diamond `0x34a851523A6f3351940d235373038b2A0A85e872`.

### Rules (Julius)

- **Per wallet, per tileId** (soft tiles **8–47** only; Decor / soft installs unchanged)
- Lifetime `tileMintedCount[wallet][tileId]` = successful `mintTiles` credits (not ERC1155 balance)
- Cooldown = time since `tileLastMintAt[wallet][tileId]`
- Band sizes: **10, 20, 30, 40, 50…** (`bandStep`, `2*bandStep`, …)
  - Band 0 (lifetime **0–9**): **instant** (0)
  - Band 1 (10–29): **1h**, then doubles each band (**2h, 4h, 8h, …**)
- Tunable via `GvRulesFacet.setTileCooldownParams(bandStep, firstCooldownSeconds, maxCapSeconds)`  
  (`0` bandStep/first → facet defaults **10 / 3600**; `maxCapSeconds=0` → uncapped)

### Band math

```
size(i) = bandStep * (i + 1)          // i = 0,1,2,…
band for lifetime n = smallest i with n < sum_{k=0..i} size(k)
cooldown(band0) = 0
cooldown(band i>=1) = min(first * 2^(i-1), maxCap or ∞)
```

### API

| Call | Facet |
|------|--------|
| `mintTiles` (enforces `CooldownActive(tileId, remaining)`) | `GvTileMintFacet` |
| `cooldownRemaining(wallet, tileId)` | `GvTileMintFacet` |
| `nextCooldown(wallet, tileId)` | `GvTileMintFacet` |
| `mintedCount` / `lastMintAt` | `GvTileMintFacet` |
| `setTileCooldownParams` / `tileCooldownParams` | `GvRulesFacet` |

`paymentEnabled` stays **false**. No Decor changes.

### Testing later bands without waiting

- **Forge only:** `vm.warp` (see `test/GvTileMint.t.sol`)
- **Sepolia QA:** owner may temporarily `setTileCooldownParams(10, 60, 0)` (1‑minute first band), exercise, then restore `(10, 3600, 0)`. Do **not** ship short cooldowns as the live default.

### Upgrade

`forge script script/UpgradeTileCooldown.s.sol:UpgradeTileCooldown --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast`

| Item | Value |
|------|--------|
| `GvTileMintFacet` | `0x91E13D4DCe7aeA970e0b0Cc7fea4b26059028488` |
| `GvRulesFacet` | `0x85509Cc3845f2A8650E531142afa43D181F5134D` |
| `diamondCut` | `0xc1a1fcea96ac0c4e6aabe89c0890fa1360a428a82f779783885eec0bbe685b2b` |
| `setTileCooldownParams` | `0x2a2e21f2fb2112ee1e38316d2fb9c7310ad4cac6b63cc64d275553474a54b0ac` |
| Smoke mint 14×3 | `0x2a6e82f5ba38a75c76b2ec28f9f9f7abe1d0788c76093bd473dd54350a965074` |


