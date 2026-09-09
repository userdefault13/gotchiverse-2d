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
import {InitERC1155} from "../src/upgradeInitializers/InitERC1155.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {FacetSelectors} from "../script/FacetSelectors.sol";
import {SeedSoftInstallsLib} from "../script/SeedSoftInstallsLib.sol";

contract GvSoftInstallCraftTest is Test {
    address owner = address(this);
    address alice = address(0xA11CE);

    Diamond diamond;
    GvRulesFacet rules;
    GvCatalogFacet catalog;
    GvCraftFacet craft;
    GvInventoryFacet inventory;

    event TransferSingle(
        address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value
    );

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
        InitERC1155 init = new InitERC1155();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](7);
        cut[0] = _cut(address(loupeImpl), FacetSelectors.loupe());
        cut[1] = _cut(address(own), FacetSelectors.ownership());
        cut[2] = _cut(address(rulesImpl), FacetSelectors.rules());
        cut[3] = _cut(address(mintImpl), FacetSelectors.mint());
        cut[4] = _cut(address(invImpl), FacetSelectors.inventoryERC1155All());
        cut[5] = _cut(address(catalogImpl), FacetSelectors.catalogAll());
        cut[6] = _cut(address(craftImpl), FacetSelectors.craft());

        bytes memory initCalldata = abi.encodeWithSelector(InitERC1155.init.selector, "ipfs://gv2d/{id}.json");
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(init), initCalldata);

        rules = GvRulesFacet(address(diamond));
        catalog = GvCatalogFacet(address(diamond));
        craft = GvCraftFacet(address(diamond));
        inventory = GvInventoryFacet(address(diamond));

        address[4] memory tokens;
        LibAppStorage.AlchemicaCost memory ghostDefault =
            LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        rules.initGvRules(tokens, ghostDefault, false);

        SeedSoftInstallsLib.seed(address(diamond));
    }

    function test_seedRegistersSmokeTypes() public view {
        assertTrue(catalog.isSoftInstallRegistered(171));
        assertTrue(catalog.isSoftInstallRegistered(180));
        assertTrue(catalog.isSoftInstallRegistered(189));
        assertTrue(catalog.isSoftInstallRegistered(198));
        assertTrue(catalog.isSoftInstallRegistered(199));
        assertTrue(catalog.isSoftInstallRegistered(208));
        assertTrue(catalog.isSoftInstallRegistered(209));
        (uint256 start, uint256 end) = catalog.softInstallIdRange();
        assertEq(start, 162);
        assertEq(end, 215);
    }

    function test_permissionlessCraft_storeAndLodge() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 180;
        amounts[0] = 1;

        vm.expectEmit(true, true, true, true, address(diamond));
        emit TransferSingle(alice, address(0), alice, 180, 1);

        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        assertEq(inventory.balanceOf(alice, 180), 1);

        ids[0] = 171;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        assertEq(inventory.balanceOf(alice, 171), 1);
    }

    function test_unregisteredReverts() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 162; // Waall L1 — in band but not seeded
        amounts[0] = 1;
        vm.prank(alice);
        vm.expectRevert(bytes("GvCraft: !registered"));
        craft.craftInstallations(ids, amounts);
    }

    function test_tileIdRejectedByCraft() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 1;
        vm.prank(alice);
        vm.expectRevert(bytes("GvCraft: id"));
        craft.craftInstallations(ids, amounts);
    }

    function test_installBaseURI_mutable() public {
        assertEq(catalog.installBaseURI(), "https://gv2d.placeholder/soft-install/{id}.json");
        catalog.setInstallBaseURI("https://example.com/{id}");
        assertEq(catalog.installBaseURI(), "https://example.com/{id}");
    }

    function test_paymentStaysOffByDefault() public view {
        assertFalse(rules.paymentEnabled());
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
