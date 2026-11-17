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
        cut[2] = _cut(address(rulesImpl), FacetSelectors.rulesAll());
        cut[3] = _cut(address(mintImpl), FacetSelectors.mintAll());
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
            functionSelectors: FacetSelectors.mintAll()
        });
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(0), "");
        assertEq(inventory.balanceOf(alice, 8), 1);
    }


    // -------------------------------------------------------------------------
    // Progressive soft-tile craft cooldowns (bands 10/20/30…; CD 0,1h,2h,4h…)
    // -------------------------------------------------------------------------

    function test_cooldown_firstBandInstant_mintedCountTracks() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;

        // Mint 9 (still in band 0: lifetime 0–9)
        amounts[0] = 9;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, 8), 9);
        assertEq(mint.nextCooldown(alice, 8), 0);
        assertEq(mint.cooldownRemaining(alice, 8), 0);

        // 10th mint still instant (count 9 → still band 0)
        amounts[0] = 1;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, 8), 10);
        assertEq(inventory.balanceOf(alice, 8), 10);

        // Now in band 1 → nextCooldown = 1 hour
        assertEq(mint.nextCooldown(alice, 8), 1 hours);
        assertEq(mint.cooldownRemaining(alice, 8), 1 hours);
    }

    function test_cooldown_band1GatesUntilWarp() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 12;
        amounts[0] = 10; // exhaust free band in one call
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, 12), 10);
        assertEq(mint.nextCooldown(alice, 12), 1 hours);

        // Immediate remint reverts with remaining time
        amounts[0] = 1;
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GvTileMintFacet.CooldownActive.selector, uint256(12), uint256(1 hours)));
        mint.mintTiles(ids, amounts);

        // Warp just under full hour — still blocked
        vm.warp(block.timestamp + 1 hours - 1);
        uint256 rem = mint.cooldownRemaining(alice, 12);
        assertEq(rem, 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(GvTileMintFacet.CooldownActive.selector, uint256(12), uint256(1)));
        mint.mintTiles(ids, amounts);

        // Warp the last second — allowed
        vm.warp(block.timestamp + 1);
        assertEq(mint.cooldownRemaining(alice, 12), 0);
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, 12), 11);
        assertEq(mint.lastMintAt(alice, 12), block.timestamp);
    }

    function test_cooldown_rulesParamsRoundTrip() public {
        rules.setTileCooldownParams(10, 1 hours, 0);
        (uint256 step, uint256 first, uint256 cap) = rules.tileCooldownParams();
        assertEq(step, 10);
        assertEq(first, 1 hours);
        assertEq(cap, 0);
    }

    function test_cooldown_perWalletPerTileId() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 15;
        amounts[0] = 10;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);

        // Alice blocked on 15; Bob still free on 15; Alice free on other tile
        assertGt(mint.cooldownRemaining(alice, 15), 0);
        assertEq(mint.cooldownRemaining(bob, 15), 0);
        assertEq(mint.cooldownRemaining(alice, 16), 0);

        ids[0] = 16;
        amounts[0] = 1;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, 16), 1);

        ids[0] = 15;
        amounts[0] = 1;
        vm.prank(bob);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(bob, 15), 1);
    }

    function test_cooldown_maxCapOptional() public {
        // Cap at 90 minutes — band2 would be 2h, capped to 90m
        rules.setTileCooldownParams(10, 1 hours, 90 minutes);

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 20;
        // Push into band 2 (need lifetime >= 30)
        amounts[0] = 30;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, 20), 30);
        assertEq(mint.nextCooldown(alice, 20), 90 minutes);

        amounts[0] = 1;
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(GvTileMintFacet.CooldownActive.selector, uint256(20), uint256(90 minutes))
        );
        mint.mintTiles(ids, amounts);

        vm.warp(block.timestamp + 90 minutes);
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, 20), 31);
    }

    function test_cooldown_zeroParamsUseDefaults() public {
        rules.setTileCooldownParams(0, 0, 0);
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 22;
        amounts[0] = 10;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.nextCooldown(alice, 22), 1 hours);
    }

    function test_cooldown_bandEdges_viaMintAndWarp() public {
        rules.setTileCooldownParams(10, 1 hours, 0);
        uint256 tileId = 41;
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = tileId;

        // 0 → next 0
        assertEq(mint.nextCooldown(alice, tileId), 0);

        amounts[0] = 10;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, tileId), 10);
        assertEq(mint.nextCooldown(alice, tileId), 1 hours);

        // Advance through band 1 (need 20 more to reach 30) with warps
        for (uint256 i; i < 20; i++) {
            vm.warp(block.timestamp + 1 hours);
            amounts[0] = 1;
            vm.prank(alice);
            mint.mintTiles(ids, amounts);
        }
        assertEq(mint.mintedCount(alice, tileId), 30);
        assertEq(mint.nextCooldown(alice, tileId), 2 hours);

        // One more after 2h → count 31, still band 2 until 60
        vm.warp(block.timestamp + 2 hours);
        amounts[0] = 1;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(mint.mintedCount(alice, tileId), 31);
        assertEq(mint.nextCooldown(alice, tileId), 2 hours);

        // Jump to band 3 edge: mint 29 more with 2h warps → count 60
        for (uint256 i; i < 29; i++) {
            vm.warp(block.timestamp + 2 hours);
            amounts[0] = 1;
            vm.prank(alice);
            mint.mintTiles(ids, amounts);
        }
        assertEq(mint.mintedCount(alice, tileId), 60);
        assertEq(mint.nextCooldown(alice, tileId), 4 hours);
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
