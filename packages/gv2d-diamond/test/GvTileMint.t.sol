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
import {InitERC1155} from "../src/upgradeInitializers/InitERC1155.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {LibERC1155} from "../src/libraries/LibERC1155.sol";
import {SeedTilesLib} from "../script/SeedTilesLib.sol";
import {FacetSelectors} from "../script/FacetSelectors.sol";
import {IERC1155Receiver} from "../src/interfaces/IERC1155Receiver.sol";

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

contract MockERC1155Receiver is IERC1155Receiver {
    bytes4 private constant _RECV = 0xf23a6e61;
    bytes4 private constant _BATCH = 0xbc197c81;

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return _RECV;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return _BATCH;
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
    DiamondLoupeFacet loupe;

    event TransferSingle(
        address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value
    );
    event TransferBatch(
        address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values
    );

    function setUp() public {
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        diamond = new Diamond(owner, address(cutFacet));

        DiamondLoupeFacet loupeImpl = new DiamondLoupeFacet();
        OwnershipFacet own = new OwnershipFacet();
        GvRulesFacet rulesImpl = new GvRulesFacet();
        GvTileMintFacet mintImpl = new GvTileMintFacet();
        GvInventoryFacet invImpl = new GvInventoryFacet();
        InitERC1155 init = new InitERC1155();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](5);
        cut[0] = _cut(address(loupeImpl), FacetSelectors.loupe());
        cut[1] = _cut(address(own), FacetSelectors.ownership());
        cut[2] = _cut(address(rulesImpl), FacetSelectors.rules());
        cut[3] = _cut(address(mintImpl), FacetSelectors.mint());
        cut[4] = _cut(address(invImpl), FacetSelectors.inventoryERC1155All());

        bytes memory initCalldata = abi.encodeWithSelector(InitERC1155.init.selector, "ipfs://gv2d/{id}.json");
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(init), initCalldata);

        rules = GvRulesFacet(address(diamond));
        mint = GvTileMintFacet(address(diamond));
        inventory = GvInventoryFacet(address(diamond));
        loupe = DiamondLoupeFacet(address(diamond));

        address[4] memory tokens;
        LibAppStorage.AlchemicaCost memory ghostDefault =
            LibAppStorage.AlchemicaCost({fud: 5 ether, fomo: 0, alpha: 2 ether, kek: 0});
        rules.initGvRules(tokens, ghostDefault, false);

        (uint256[] memory ids, LibAppStorage.AlchemicaCost[] memory costs) = SeedTilesLib.tileCatalog();
        rules.registerTiles(ids, costs);
    }

    function test_permissionlessMint_anyEOA_emitsTransferSingle() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 3;

        vm.expectEmit(true, true, true, true, address(diamond));
        emit TransferSingle(alice, address(0), alice, 8, 3);

        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(inventory.balanceOf(alice, 8), 3);

        ids[0] = 38;
        amounts[0] = 1;
        vm.prank(bob);
        mint.mintTiles(ids, amounts);
        assertEq(inventory.balanceOf(bob, 38), 1);
    }

    function test_mintBatch_emitsTransferBatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = 8;
        ids[1] = 9;
        amounts[0] = 1;
        amounts[1] = 2;

        vm.expectEmit(true, true, true, true, address(diamond));
        emit TransferBatch(alice, address(0), alice, ids, amounts);

        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(inventory.balanceOf(alice, 8), 1);
        assertEq(inventory.balanceOf(alice, 9), 2);
    }

    function test_invalidIdReverts() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 3;
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

    function test_erc1155_safeTransfer_and_approval() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 5;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);

        vm.prank(alice);
        inventory.safeTransferFrom(alice, bob, 8, 2, "");
        assertEq(inventory.balanceOf(alice, 8), 3);
        assertEq(inventory.balanceOf(bob, 8), 2);

        vm.prank(alice);
        inventory.setApprovalForAll(bob, true);
        assertTrue(inventory.isApprovedForAll(alice, bob));

        vm.prank(bob);
        inventory.safeTransferFrom(alice, bob, 8, 1, "");
        assertEq(inventory.balanceOf(alice, 8), 2);
        assertEq(inventory.balanceOf(bob, 8), 3);
    }

    function test_erc1155_transferToReceiverContract() public {
        MockERC1155Receiver recv = new MockERC1155Receiver();
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 10;
        amounts[0] = 1;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);

        vm.prank(alice);
        inventory.safeTransferFrom(alice, address(recv), 10, 1, "hi");
        assertEq(inventory.balanceOf(address(recv), 10), 1);
    }

    function test_erc1155_burn() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 4;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);

        vm.prank(alice);
        inventory.burn(alice, 8, 3);
        assertEq(inventory.balanceOf(alice, 8), 1);
    }

    function test_supportsInterface_erc1155() public {
        assertTrue(loupe.supportsInterface(0xd9b67a26)); // ERC1155
        assertTrue(loupe.supportsInterface(0x0e89341c)); // ERC1155MetadataURI
        assertTrue(loupe.supportsInterface(0x01ffc9a7)); // ERC165
        assertEq(inventory.uri(8), "ipfs://gv2d/{id}.json");
    }

    function test_existingBalanceSlotsSurviveUpgradePath() public {
        // Simulate spike-era balance then ERC1155 views/transfers still work (same slots).
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 1;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(inventory.balanceOf(alice, 8), 1);

        // Replace facets again (idempotent ERC1155 cut pattern) and confirm balance persists.
        GvInventoryFacet inv2 = new GvInventoryFacet();
        GvTileMintFacet mint2 = new GvTileMintFacet();
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](2);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(inv2),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.inventoryERC1155All()
        });
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(mint2),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.mint()
        });
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(0), "");
        assertEq(inventory.balanceOf(alice, 8), 1);
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
