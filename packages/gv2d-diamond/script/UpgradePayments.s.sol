// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvTileMintFacet} from "../src/facets/GvTileMintFacet.sol";
import {GvCraftFacet} from "../src/facets/GvCraftFacet.sol";
import {GvUpgradeFacet} from "../src/facets/GvUpgradeFacet.sol";
import {GvRulesFacet} from "../src/facets/GvRulesFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {FacetSelectors} from "./FacetSelectors.sol";

/// @notice Wire SafeFeeRouter LineBMint payment path into live GV-2D diamond.
/// @dev Replaces Craft/TileMint/Upgrade/Rules impls; Adds LineB setters + quote selectors.
///      Leaves paymentEnabled=false and lineBFeeEnabled=false by default (free-mint smoke intact).
///      Optionally configures router/usdc/fee via env without enabling.
///
/// forge script script/UpgradePayments.s.sol:UpgradePayments \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract UpgradePayments is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");

        address router = vm.envOr("SAFE_FEE_ROUTER", address(0x9476a6Fd296eB60822Ad72F91334e56B880b3985));
        address usdc = vm.envOr("USDC", address(0x036CbD53842c5426634e7929541eC2318f3dCF7e));
        uint256 feeUsdc = vm.envOr("LINE_B_MINT_FEE_USDC", uint256(1e6)); // 1 USDC default when enabled later
        bool enableLineB = vm.envOr("LINE_B_FEE_ENABLED", false);
        bool enablePayment = vm.envOr("PAYMENT_ENABLED", false);
        address publisher = vm.envOr("LINE_B_PUBLISHER", address(0));

        vm.startBroadcast(pk);

        GvTileMintFacet mint = new GvTileMintFacet();
        GvCraftFacet craft = new GvCraftFacet();
        GvUpgradeFacet upgrade = new GvUpgradeFacet();
        GvRulesFacet rules = new GvRulesFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](7);

        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(mint),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.mint()
        });
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(mint),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.mintPaymentNew()
        });
        cut[2] = IDiamondCut.FacetCut({
            facetAddress: address(craft),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.craft()
        });
        cut[3] = IDiamondCut.FacetCut({
            facetAddress: address(craft),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.craftPaymentNew()
        });
        cut[4] = IDiamondCut.FacetCut({
            facetAddress: address(upgrade),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.upgrade()
        });
        cut[5] = IDiamondCut.FacetCut({
            facetAddress: address(rules),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.rulesExisting()
        });
        cut[6] = IDiamondCut.FacetCut({
            facetAddress: address(rules),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.rulesPaymentNew()
        });

        DiamondCutFacet(diamond).diamondCut(cut, address(0), "");

        // Wire addresses + fee amount; keep flags false unless env explicitly enables.
        GvRulesFacet(diamond).configureLineBPayment(router, usdc, feeUsdc, enableLineB, publisher);
        if (enablePayment) {
            GvRulesFacet(diamond).setPaymentEnabled(true);
        }

        vm.stopBroadcast();

        console2.log("Upgraded diamond", diamond);
        console2.log("GvTileMintFacet", address(mint));
        console2.log("GvCraftFacet", address(craft));
        console2.log("GvUpgradeFacet", address(upgrade));
        console2.log("GvRulesFacet", address(rules));
        console2.log("safeFeeRouter", router);
        console2.log("usdc", usdc);
        console2.log("lineBMintFeeUsdc", feeUsdc);
        console2.log("lineBFeeEnabled", enableLineB);
        console2.log("paymentEnabled", enablePayment);
    }
}
