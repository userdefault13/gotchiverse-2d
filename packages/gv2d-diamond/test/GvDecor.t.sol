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
import {SeedDecorLib} from "../script/SeedDecorLib.sol";

contract GvDecorTest is Test {
    address owner = address(this);
    address alice = address(0xA11CE);

    Diamond diamond;
    GvRulesFacet rules;
    GvCatalogFacet catalog;
    GvCraftFacet craft;
    GvInventoryFacet inventory;
    GvPlaceFacet place;

    bytes32 constant PARCEL = bytes32(uint256(0xDEC04));

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

        rules = GvRulesFacet(address(diamond));
        catalog = GvCatalogFacet(address(diamond));
        craft = GvCraftFacet(address(diamond));
        inventory = GvInventoryFacet(address(diamond));
        place = GvPlaceFacet(address(diamond));

        address[4] memory tokens;
        LibAppStorage.AlchemicaCost memory ghostDefault =
            LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        rules.initGvRules(tokens, ghostDefault, false);

        SeedDecorLib.seed(address(diamond));
    }

    function test_registersAll48Decor() public view {
        assertTrue(catalog.isSoftInstallRegistered(1019)); // Common Rofl Gnome
        assertTrue(catalog.isSoftInstallRegistered(1024)); // Godlike Rofl Gnome
        assertTrue(catalog.isSoftInstallRegistered(1055)); // Graand Fountain
        assertTrue(catalog.isSoftInstallRegistered(1146)); // Paampkin Trio
        assertTrue(catalog.isSoftInstallRegistered(1156)); // Aangel Tree
        // L1 ids themselves must NOT be soft-install ids (tile collision band)
        assertFalse(catalog.isSoftInstallRegistered(19));
        assertFalse(LibAppStorage.isSoftInstallId(19));
        assertTrue(LibAppStorage.isDecorInstallId(1019));
        assertTrue(LibAppStorage.isSoftInstallId(1019));

        LibAppStorage.SoftInstallType memory g = catalog.softInstall(1019);
        assertEq(g.installationType, 7);
        assertEq(g.level, 1);
        assertEq(g.width, 1);
        assertEq(g.height, 1);
        assertEq(g.cost.fud, 101 ether);
        // 9.6e18
        assertEq(g.cost.fomo, 9600000000000000000);
        assertEq(g.cost.alpha, 53 ether);
        assertEq(g.cost.kek, 13900000000000000000);

        LibAppStorage.SoftInstallType memory god = catalog.softInstall(1024);
        assertEq(god.cost.fud, 1616 ether); // 16× Common

        LibAppStorage.SoftInstallType memory fountain = catalog.softInstall(1055);
        assertEq(fountain.width, 4);
        assertEq(fountain.height, 4);
    }

    function test_craftCommonAndGodlike() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);

        ids[0] = 1019; // Common Rofl Gnome
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        assertEq(inventory.balanceOf(alice, 1019), 1);

        ids[0] = 1024; // Godlike Rofl Gnome
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        assertEq(inventory.balanceOf(alice, 1024), 1);

        // payment still off — quote is non-zero but craft free
        assertFalse(rules.paymentEnabled());
        LibAppStorage.AlchemicaCost memory q = craft.quoteCraftCost(1024, 1);
        assertEq(q.fud, 1616 ether);
    }

    function test_placeAndUnequipDecor() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 1019;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);

        vm.prank(alice);
        uint256 pid = place.placeSoftInstall(PARCEL, 1019, 1, 1);
        assertEq(pid, 1);
        assertEq(inventory.balanceOf(alice, 1019), 0);
        assertTrue(place.isCellOccupied(PARCEL, 1, 1));

        vm.prank(alice);
        place.unequipSoftInstall(PARCEL, 1, 1);
        assertEq(inventory.balanceOf(alice, 1019), 1);
        assertFalse(place.isCellOccupied(PARCEL, 1, 1));
    }

    function test_rejectsUnregisteredL1DecorId() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 19; // L1 id — not a GV soft-install id
        amounts[0] = 1;
        vm.prank(alice);
        vm.expectRevert(bytes("GvCraft: id"));
        craft.craftInstallations(ids, amounts);
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
