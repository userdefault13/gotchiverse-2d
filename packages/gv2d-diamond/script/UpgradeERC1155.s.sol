// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvTileMintFacet} from "../src/facets/GvTileMintFacet.sol";
import {GvInventoryFacet} from "../src/facets/GvInventoryFacet.sol";
import {InitERC1155} from "../src/upgradeInitializers/InitERC1155.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {FacetSelectors} from "./FacetSelectors.sol";

/// @notice Upgrade live Base Sepolia GV-2D diamond: cut in ERC1155 inventory + mint wiring.
/// forge script script/UpgradeERC1155.s.sol:UpgradeERC1155 \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract UpgradeERC1155 is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");
        string memory uri = vm.envOr("ERC1155_URI", string(""));

        vm.startBroadcast(pk);

        GvInventoryFacet inventory = new GvInventoryFacet();
        GvTileMintFacet mint = new GvTileMintFacet();
        InitERC1155 init = new InitERC1155();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](3);

        // Replace legacy inventory selectors onto new ERC1155 facet implementation.
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(inventory),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.inventoryLegacy()
        });

        // Add ERC1155 transfer / approval / uri / burn selectors.
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(inventory),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.inventoryERC1155NewOnly()
        });

        // Replace mint facet so mintTiles credits ERC1155 + emits TransferSingle/Batch.
        cut[2] = IDiamondCut.FacetCut({
            facetAddress: address(mint),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.mint()
        });

        bytes memory initCalldata = abi.encodeWithSelector(InitERC1155.init.selector, uri);
        DiamondCutFacet(diamond).diamondCut(cut, address(init), initCalldata);

        vm.stopBroadcast();

        console2.log("Upgraded diamond", diamond);
        console2.log("GvInventoryFacet", address(inventory));
        console2.log("GvTileMintFacet", address(mint));
        console2.log("InitERC1155", address(init));
    }
}
