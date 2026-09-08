# Gotchiverse-2D Diamond (spike)

EIP-2535 diamond for **permissionless soft-tile mint** (ids **8–47**) on **Base Sepolia**.

This spike conceptually kills the FE legacy path `craftCTileLocally` / offchain tile qty for those ids.
Golden LE tiles **1–3** stay on the live Tile diamond.

## Inventory choice

**Diamond-native balances** via append-only `LibAppStorage.balances[account][id]`, exposed by `GvInventoryFacet`.

Rationale: spike avoids a sibling ERC1155 deploy; storage layout stays upgrade-safe so a later cut can add a full ERC1155 facet that reads the same slots (or migrates). Documented in `docs/GV2D_DIAMOND_SPIKE.md`.

## Layout

```
packages/gv2d-diamond/
  src/
    Diamond.sol
    facets/   DiamondCut / Loupe / Ownership / GvRules / GvTileMint / GvInventory
    libraries/ LibDiamond, LibAppStorage (append-only)
    interfaces/
  script/     DeployGv2dDiamond, SeedTiles, SeedTilesLib
  test/       GvTileMint.t.sol
```

## Env

Copy `.env.example` → `.env`:

| Var | Notes |
|-----|--------|
| `PRIVATE_KEY` | Deployer key |
| `DEPLOYER_ADDRESS` | Owner (not renounced) |
| `BASE_SEPOLIA_RPC_URL` | RPC |
| `PAYMENT_ENABLED` | `false` (default) = free mint for smoke; `true` pulls alchemica |
| `FUD_TOKEN` / `FOMO_TOKEN` / `ALPHA_TOKEN` / `KEK_TOKEN` | Required when payment enabled |
| `GV2D_DIAMOND` | Set after deploy for seed / cast |

## Build / test

```bash
cd packages/gv2d-diamond
forge build
forge test -vv
```

## Deploy (Base Sepolia)

```bash
cd packages/gv2d-diamond
source .env
forge script script/DeployGv2dDiamond.s.sol:DeployGv2dDiamond \
  --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

Deploy registers tiles **8–47** (costs from `tiles.json`, 18-decimals; zero-cost Ghost pack uses Rules `ghostDefaultCost` = **5 FUD + 2 ALPHA** when payment is on).

## Cast smoke mint (any EOA, no role)

With `paymentEnabled == false`:

```bash
DIAMOND=0xYourDiamond
cast send $DIAMOND \
  "mintTiles(uint256[],uint256[])" "[8,38]" "[1,2]" \
  --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

cast call $DIAMOND "balanceOf(address,uint256)(uint256)" $DEPLOYER_ADDRESS 8 \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

Toggle payment later (owner):

```bash
cast send $DIAMOND "setPaymentEnabled(bool)" true \
  --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```

## Success criteria

- `forge build` succeeds
- Any EOA can `mintTiles` for valid ids in `[8,47]` (no minter role)
- Invalid ids revert
- Rules mutable by owner; ownership not renounced
