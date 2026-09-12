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
import {InitERC1155} from "../src/upgradeInitializers/InitERC1155.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {FacetSelectors} from "../script/FacetSelectors.sol";
import {SeedSoftInstallsLib} from "../script/SeedSoftInstallsLib.sol";

contract GvPlaceTest is Test {
    address owner = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    Diamond diamond;
    GvCraftFacet craft;
    GvInventoryFacet inventory;
    GvPlaceFacet place;
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
        InitERC1155 init = new InitERC1155();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](8);
        cut[0] = _cut(address(loupeImpl), FacetSelectors.loupe());
        cut[1] = _cut(address(own), FacetSelectors.ownership());
        cut[2] = _cut(address(rulesImpl), FacetSelectors.rules());
        cut[3] = _cut(address(mintImpl), FacetSelectors.mint());
        cut[4] = _cut(address(invImpl), FacetSelectors.inventoryERC1155All());
        cut[5] = _cut(address(catalogImpl), FacetSelectors.catalogAll());
        cut[6] = _cut(address(craftImpl), FacetSelectors.craft());
        cut[7] = _cut(address(placeImpl), FacetSelectors.place());

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
        catalog = GvCatalogFacet(address(diamond));
    }

    function test_waallsRegistered() public view {
        for (uint256 id = 162; id <= 170; id++) {
            assertTrue(catalog.isSoftInstallRegistered(id));
        }
        assertTrue(catalog.isSoftInstallRegistered(210));
        assertTrue(catalog.isSoftInstallRegistered(215));
        LibAppStorage.SoftInstallType memory w = catalog.softInstall(162);
        assertEq(w.installationType, 3);
        assertEq(w.width, 1);
        assertEq(w.nextLevelId, 163);
    }

    function test_placeAndUnequip_store() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 180;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        assertEq(inventory.balanceOf(alice, 180), 1);

        vm.prank(alice);
        uint256 pid = place.placeSoftInstall(PARCEL, 180, 2, 3);
        assertEq(pid, 1);
        assertEq(inventory.balanceOf(alice, 180), 0);
        assertTrue(place.isCellOccupied(PARCEL, 2, 3));
        assertTrue(place.isCellOccupied(PARCEL, 3, 4)); // 2x2 footprint
        assertEq(place.cellPlacementId(PARCEL, 3, 3), pid);

        LibAppStorage.Placement memory p = place.placement(pid);
        assertEq(p.itemId, 180);
        assertEq(p.owner, alice);
        assertEq(p.width, 2);

        // conflict
        ids[0] = 189;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        vm.prank(alice);
        vm.expectRevert(bytes("GvPlace: occupied"));
        place.placeSoftInstall(PARCEL, 189, 3, 3);

        // bob cannot unequip
        vm.prank(bob);
        vm.expectRevert(bytes("GvPlace: !owner"));
        place.unequipSoftInstall(PARCEL, 2, 3);

        // unequip from non-origin cell still works
        vm.prank(alice);
        place.unequipSoftInstall(PARCEL, 3, 4);
        assertEq(inventory.balanceOf(alice, 180), 1);
        assertFalse(place.isCellOccupied(PARCEL, 2, 3));
        assertEq(place.placement(pid).itemId, 0);
    }

    function test_placeWaall_andUintKey() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 162;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);

        vm.prank(alice);
        uint256 pid = place.placeSoftInstallOnUint(42, 162, 0, 0);
        assertEq(pid, 1);
        bytes32 key = place.parcelKeyFromUint(42);
        assertTrue(place.isCellOccupied(key, 0, 0));

        vm.prank(alice);
        place.unequipSoftInstallById(pid);
        assertEq(inventory.balanceOf(alice, 162), 1);
    }

    function test_parcelKeyFromRealm() public view {
        bytes32 a = place.parcelKeyFromRealm(84532, 123);
        bytes32 b = place.parcelKeyFromRealm(84532, 124);
        assertTrue(a != b);
        assertTrue(a != bytes32(0));
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
