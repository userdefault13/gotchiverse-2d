# Gotchiverse-2D Diamond

EIP-2535 diamond for **permissionless soft-tile mint** (ids **8–47**) on **Base Sepolia**.

Soft tiles are **diamond-hosted ERC1155** (same `AppStorage.balances` slots as the spike). This kills the FE legacy path `craftCTileLocally` / offchain tile qty for those ids.
Golden LE tiles **1–3** stay on the live Tile diamond.

Soft-install bag + cPaarcel stay on the **Aarcade cartridge** — not implemented here.

## Inventory

**ERC1155** via `GvInventoryFacet` + `LibERC1155`, reading/writing append-only `LibAppStorage.balances[account][id]`.

- Standard: `balanceOf` / `balanceOfBatch` / `safeTransferFrom` / `safeBatchTransferFrom` / `setApprovalForAll` / `isApprovedForAll` / `uri`
- Extra: `burn` / `burnBatch` (staking sinks later), `adminTransfer`, `setURI`
- `GvTileMintFacet.mintTiles` credits ERC1155 and emits `TransferSingle` / `TransferBatch` from `address(0)`
- Sepolia upgrade reused existing balance slots — **no wipe**; prior smoke `balanceOf(deployer, 8)==1` remains

## Layout

```
packages/gv2d-diamond/
  src/
    Diamond.sol
    facets/   DiamondCut / Loupe / Ownership / GvRules / GvTileMint / GvInventory (ERC1155)
    libraries/ LibDiamond, LibAppStorage (append-only), LibERC1155
    interfaces/
    upgradeInitializers/ InitERC1155
  script/     DeployGv2dDiamond, UpgradeERC1155, SeedTiles, FacetSelectors
  test/       GvTileMint.t.sol
  deployments/ base-sepolia.json
```

## Env

Copy `.env.example` → `.env`:

| Var | Notes |
|-----|--------|
| `PRIVATE_KEY` | Deployer key |
| `DEPLOYER_ADDRESS` | Owner (not renounced) |
| `BASE_SEPOLIA_RPC_URL` | RPC |
| `PAYMENT_ENABLED` | `false` (default) until craft costs locked |
| `FUD_TOKEN` / `FOMO_TOKEN` / `ALPHA_TOKEN` / `KEK_TOKEN` | Required when payment enabled |
| `GV2D_DIAMOND` | Live diamond for upgrade / cast |
| `ERC1155_URI` | Optional metadata URI template |

## Build / test

```bash
cd packages/gv2d-diamond
forge build
forge test -vv
```

## Upgrade live Sepolia diamond (preferred)

```bash
cd packages/gv2d-diamond
source .env
forge script script/UpgradeERC1155.s.sol:UpgradeERC1155 \
  --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

## Fresh deploy (only if upgrade unsafe)

```bash
forge script script/DeployGv2dDiamond.s.sol:DeployGv2dDiamond \
  --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

## Cast smoke mint (any EOA, no role)

With `paymentEnabled == false`:

```bash
DIAMOND=0x34a851523A6f3351940d235373038b2A0A85e872
cast send $DIAMOND \
  "mintTiles(uint256[],uint256[])" "[9]" "[1]" \
  --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY

cast call $DIAMOND "balanceOf(address,uint256)(uint256)" $DEPLOYER_ADDRESS 9 \
  --rpc-url $BASE_SEPOLIA_RPC_URL

cast call $DIAMOND "supportsInterface(bytes4)(bool)" 0xd9b67a26 \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```



## Frontend (Gotchiverse-2D Crafting Table)

Soft cTiles recipe UI is unchanged. With:

```
NEXT_PUBLIC_USE_GV2D_DIAMOND=true
NEXT_PUBLIC_GV2D_DIAMOND_ADDRESS=0x34a851523A6f3351940d235373038b2A0A85e872
```

the Craft button for soft tiles **8–47** calls `mintTiles([id],[qty])` on this diamond
(see `helpers/gv2dDiamond.helper.ts`) instead of `craftCTileLocally`. Wallet must be on
**Base Sepolia** (helper prompts switch/add). Inventory refreshes from ERC1155 `balanceOf`.
Golden tiles **1–3** still use the live Tile diamond `craftTiles` path.

When the flag is off, soft cTiles keep the legacy local craft path.

## Success criteria

- `forge build` + `forge test` green
- Any EOA can `mintTiles` for valid ids in `[8,47]` (no minter role)
- Mint credits ERC1155 balances + `TransferSingle`/`TransferBatch`
- `safeTransferFrom` / approvals work
- Rules mutable by owner; ownership not renounced; `paymentEnabled=false` on Sepolia
