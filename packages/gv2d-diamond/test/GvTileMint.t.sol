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
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {SeedTilesLib} from "../script/SeedTilesLib.sol";

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "allow");
        require(balanceOf[from] >= amount, "bal");
        unchecked {
            allowance[from][msg.sender] = a - amount;
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        return true;
    }
}

contract GvTileMintTest is Test {
    address owner = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    Diamond diamond;
    GvRulesFacet rules;
    GvTileMintFacet mint;
    GvInventoryFacet inventory;

    function setUp() public {
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        diamond = new Diamond(owner, address(cutFacet));

        DiamondLoupeFacet loupe = new DiamondLoupeFacet();
        OwnershipFacet own = new OwnershipFacet();
        GvRulesFacet rulesImpl = new GvRulesFacet();
        GvTileMintFacet mintImpl = new GvTileMintFacet();
        GvInventoryFacet invImpl = new GvInventoryFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](5);
        cut[0] = _cut(address(loupe), _selsLoupe());
        cut[1] = _cut(address(own), _selsOwn());
        cut[2] = _cut(address(rulesImpl), _selsRules());
        cut[3] = _cut(address(mintImpl), _selsMint());
        cut[4] = _cut(address(invImpl), _selsInv());
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(0), "");

        rules = GvRulesFacet(address(diamond));
        mint = GvTileMintFacet(address(diamond));
        inventory = GvInventoryFacet(address(diamond));

        address[4] memory tokens;
        LibAppStorage.AlchemicaCost memory ghostDefault =
            LibAppStorage.AlchemicaCost({fud: 5 ether, fomo: 0, alpha: 2 ether, kek: 0});
        rules.initGvRules(tokens, ghostDefault, false);

        (uint256[] memory ids, LibAppStorage.AlchemicaCost[] memory costs) = SeedTilesLib.tileCatalog();
        rules.registerTiles(ids, costs);
    }

    function test_permissionlessMint_anyEOA() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 3;

        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(inventory.balanceOf(alice, 8), 3);

        ids[0] = 38; // ghost zero catalog → ghost default when payment on; free when off
        amounts[0] = 1;
        vm.prank(bob);
        mint.mintTiles(ids, amounts);
        assertEq(inventory.balanceOf(bob, 38), 1);
    }

    function test_invalidIdReverts() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 3; // golden — not on this diamond
        amounts[0] = 1;
        vm.prank(alice);
        vm.expectRevert(bytes("TileMint: id"));
        mint.mintTiles(ids, amounts);

        ids[0] = 48;
        vm.prank(alice);
        vm.expectRevert(bytes("TileMint: id"));
        mint.mintTiles(ids, amounts);
    }

    function test_rulesMutableByOwner_notRenounced() public {
        assertEq(OwnershipFacet(address(diamond)).owner(), owner);
        rules.setPaymentEnabled(true);
        assertTrue(rules.paymentEnabled());
        rules.setPaymentEnabled(false);
        assertFalse(rules.paymentEnabled());
        // transferOwnership to non-zero keeps upgrade path; never renounce to zero
        OwnershipFacet(address(diamond)).transferOwnership(alice);
        assertEq(OwnershipFacet(address(diamond)).owner(), alice);
    }

    function test_paymentModePullsAlchemica() public {
        MockERC20 fud = new MockERC20();
        MockERC20 fomo = new MockERC20();
        MockERC20 alpha = new MockERC20();
        MockERC20 kek = new MockERC20();
        address[4] memory tokens = [address(fud), address(fomo), address(alpha), address(kek)];
        rules.setAlchemicaTokens(tokens);
        rules.setPaymentEnabled(true);

        // tile 38 catalog zero → ghost default 5 FUD + 2 ALPHA
        fud.mint(alice, 100 ether);
        alpha.mint(alice, 100 ether);
        vm.startPrank(alice);
        fud.approve(address(diamond), type(uint256).max);
        alpha.approve(address(diamond), type(uint256).max);
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 38;
        amounts[0] = 2;
        mint.mintTiles(ids, amounts);
        vm.stopPrank();

        assertEq(inventory.balanceOf(alice, 38), 2);
        assertEq(fud.balanceOf(address(diamond)), 10 ether);
        assertEq(alpha.balanceOf(address(diamond)), 4 ether);
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

    function _selsLoupe() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](5);
        s[0] = DiamondLoupeFacet.facets.selector;
        s[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        s[2] = DiamondLoupeFacet.facetAddresses.selector;
        s[3] = DiamondLoupeFacet.facetAddress.selector;
        s[4] = DiamondLoupeFacet.supportsInterface.selector;
    }

    function _selsOwn() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](2);
        s[0] = OwnershipFacet.owner.selector;
        s[1] = OwnershipFacet.transferOwnership.selector;
    }

    function _selsRules() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](14);
        s[0] = GvRulesFacet.initGvRules.selector;
        s[1] = GvRulesFacet.setPaymentEnabled.selector;
        s[2] = GvRulesFacet.setAlchemicaTokens.selector;
        s[3] = GvRulesFacet.setGhostDefaultCost.selector;
        s[4] = GvRulesFacet.registerTile.selector;
        s[5] = GvRulesFacet.registerTiles.selector;
        s[6] = GvRulesFacet.setTileCost.selector;
        s[7] = GvRulesFacet.paymentEnabled.selector;
        s[8] = GvRulesFacet.alchemicaTokens.selector;
        s[9] = GvRulesFacet.ghostDefaultCost.selector;
        s[10] = GvRulesFacet.tileCost.selector;
        s[11] = GvRulesFacet.isTileRegistered.selector;
        s[12] = GvRulesFacet.rulesVersion.selector;
        s[13] = GvRulesFacet.softTileIdRange.selector;
    }

    function _selsMint() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](2);
        s[0] = GvTileMintFacet.mintTiles.selector;
        s[1] = GvTileMintFacet.quoteMintCost.selector;
    }

    function _selsInv() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](3);
        s[0] = GvInventoryFacet.balanceOf.selector;
        s[1] = GvInventoryFacet.balanceOfBatch.selector;
        s[2] = GvInventoryFacet.adminTransfer.selector;
    }
}
