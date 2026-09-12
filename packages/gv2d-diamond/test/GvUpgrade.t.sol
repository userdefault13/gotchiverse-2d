// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Diamond} from "../src/Diamond.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../src/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/facets/OwnershipFacet.sol";
import {GvRulesFacet} from "../src/facets/GvRulesFacet.sol";
import {GvTileMintFacet} from "../src/facets/GvTileMintFacet.sol";
import {GvInventoryFacet} from "../src/facets/GvInventoryFacet.sol";
import {GvCatalogFacet} from "../src/facets/GvCatalogFacet.sol";
import {GvCraftFacet} from "../src/facets/GvCraftFacet.sol";
import {GvPlaceFacet} from "../src/facets/GvPlaceFacet.sol";
import {GvUpgradeFacet} from "../src/facets/GvUpgradeFacet.sol";
import {InitERC1155} from "../src/upgradeInitializers/InitERC1155.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {FacetSelectors} from "../script/FacetSelectors.sol";
import {SeedSoftInstallsLib} from "../script/SeedSoftInstallsLib.sol";

contract GvUpgradeTest is Test {
    address owner = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    Diamond diamond;
    GvCraftFacet craft;
    GvInventoryFacet inventory;
    GvPlaceFacet place;
    GvUpgradeFacet upgrade;
    GvCatalogFacet catalog;

    bytes32 constant PARCEL = bytes32(uint256(0xC0FFEE));

    function setUp() public {
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        diamond = new Diamond(owner, address(cutFacet));

        DiamondLoupeFacet loupeImpl = new DiamondLoupeFacet();
        OwnershipFacet own = new OwnershipFacet();
        GvRulesFacet rulesImpl = new GvRulesFacet();
        GvTileMintFacet mintImpl = new GvTileMintFacet();
        GvInventoryFacet invImpl = new GvInventoryFacet();
        GvCatalogFacet catalogImpl = new GvCatalogFacet();
        GvCraftFacet craftImpl = new GvCraftFacet();
        GvPlaceFacet placeImpl = new GvPlaceFacet();
        GvUpgradeFacet upgradeImpl = new GvUpgradeFacet();
        InitERC1155 init = new InitERC1155();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](9);
        cut[0] = _cut(address(loupeImpl), FacetSelectors.loupe());
        cut[1] = _cut(address(own), FacetSelectors.ownership());
        cut[2] = _cut(address(rulesImpl), FacetSelectors.rules());
        cut[3] = _cut(address(mintImpl), FacetSelectors.mint());
        cut[4] = _cut(address(invImpl), FacetSelectors.inventoryERC1155All());
        cut[5] = _cut(address(catalogImpl), FacetSelectors.catalogAll());
        cut[6] = _cut(address(craftImpl), FacetSelectors.craft());
        cut[7] = _cut(address(placeImpl), FacetSelectors.place());
        cut[8] = _cut(address(upgradeImpl), FacetSelectors.upgrade());

        bytes memory initCalldata = abi.encodeWithSelector(InitERC1155.init.selector, "ipfs://gv2d/{id}.json");
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(init), initCalldata);

        GvRulesFacet rules = GvRulesFacet(address(diamond));
        address[4] memory tokens;
        LibAppStorage.AlchemicaCost memory ghostDefault =
            LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        rules.initGvRules(tokens, ghostDefault, false);

        SeedSoftInstallsLib.seed(address(diamond));
        SeedSoftInstallsLib.seedWaallsAndMissing(address(diamond));

        craft = GvCraftFacet(address(diamond));
        inventory = GvInventoryFacet(address(diamond));
        place = GvPlaceFacet(address(diamond));
        upgrade = GvUpgradeFacet(address(diamond));
        catalog = GvCatalogFacet(address(diamond));
    }

    function test_upgradeCashierInBag_L1toL2() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 189;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        assertEq(inventory.balanceOf(alice, 189), 1);
        assertEq(catalog.softInstall(189).nextLevelId, 190);

        vm.prank(alice);
        upgrade.upgradeSoftInstallInBag(189, 1);
        assertEq(inventory.balanceOf(alice, 189), 0);
        assertEq(inventory.balanceOf(alice, 190), 1);
    }

    function test_upgradeConsolePlacement_L1toL2() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 199;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);

        vm.prank(alice);
        uint256 pid = place.placeSoftInstall(PARCEL, 199, 1, 1);
        assertEq(inventory.balanceOf(alice, 199), 0);
        assertEq(place.placement(pid).itemId, 199);

        vm.prank(alice);
        upgrade.upgradeSoftInstallPlacement(pid);
        assertEq(place.placement(pid).itemId, 200);
        // still occupying same footprint; no bag mint
        assertEq(inventory.balanceOf(alice, 199), 0);
        assertEq(inventory.balanceOf(alice, 200), 0);
        assertEq(place.cellPlacementId(PARCEL, 1, 1), pid);
        assertEq(place.cellPlacementId(PARCEL, 2, 2), pid);
    }

    function test_upgradeLodgePlacement_L1toL2() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 171;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        vm.prank(alice);
        uint256 pid = place.placeSoftInstall(PARCEL, 171, 0, 0);

        vm.prank(alice);
        upgrade.upgradeSoftInstallPlacement(pid);
        assertEq(place.placement(pid).itemId, 172);
        assertEq(place.placement(pid).width, 5);
    }

    function test_upgradeMaxReverts() public {
        // Lodge L9 = 179, nextLevelId=0
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 179;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        vm.prank(alice);
        vm.expectRevert(bytes("GvUpgrade: max"));
        upgrade.upgradeSoftInstallInBag(179, 1);
    }

    function test_upgradePlacementNotOwner() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 189;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        vm.prank(alice);
        uint256 pid = place.placeSoftInstall(PARCEL, 189, 0, 0);

        vm.prank(bob);
        vm.expectRevert(bytes("GvUpgrade: !owner"));
        upgrade.upgradeSoftInstallPlacement(pid);
    }

    function _cut(address facet, bytes4[] memory selectors)
        internal
        pure
        returns (IDiamondCut.FacetCut memory)
    {
        return IDiamondCut.FacetCut({
            facetAddress: facet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });
    }
}
