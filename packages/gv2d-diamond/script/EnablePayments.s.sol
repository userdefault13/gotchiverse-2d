// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvRulesFacet} from "../src/facets/GvRulesFacet.sol";

/// @notice Owner-only: flip payment / LineB flags after faucet USDC (or alchemica) is ready.
/// forge script script/EnablePayments.s.sol:EnablePayments --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract EnablePayments is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");
        bool payment = vm.envOr("PAYMENT_ENABLED", true);
        bool lineB = vm.envOr("LINE_B_FEE_ENABLED", true);
        uint256 feeUsdc = vm.envOr("LINE_B_MINT_FEE_USDC", uint256(0)); // 0 = leave unchanged

        vm.startBroadcast(pk);
        GvRulesFacet rules = GvRulesFacet(diamond);
        if (feeUsdc > 0) {
            rules.setLineBMintFeeUsdc(feeUsdc);
        }
        rules.setLineBFeeEnabled(lineB);
        rules.setPaymentEnabled(payment);
        vm.stopBroadcast();

        console2.log("diamond", diamond);
        console2.log("paymentEnabled", payment);
        console2.log("lineBFeeEnabled", lineB);
        if (feeUsdc > 0) console2.log("lineBMintFeeUsdc", feeUsdc);
    }
}
