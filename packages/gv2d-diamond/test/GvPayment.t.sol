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
import {LibGvPayment} from "../src/libraries/LibGvPayment.sol";
import {ISafeFeeRouter} from "../src/interfaces/ISafeFeeRouter.sol";
import {FacetSelectors} from "../script/FacetSelectors.sol";
import {SeedTilesLib} from "../script/SeedTilesLib.sol";
import {SeedSoftInstallsLib} from "../script/SeedSoftInstallsLib.sol";

contract MockUSDC6 {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "bal");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
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

/// @dev Minimal SafeFeeRouter stand-in: LineBMint 40/40/10/10 into tracked recipients.
contract MockSafeFeeRouter {
    MockUSDC6 public immutable usdc;
    address public dao;
    address public aarcade;
    address public burnSink;

    uint256 public daoRecv;
    uint256 public aarcadeRecv;
    uint256 public burnRecv;
    uint256 public stakersRecv;
    bytes32 public lastPool;

    constructor(address usdc_, address dao_, address aarcade_, address burn_) {
        usdc = MockUSDC6(usdc_);
        dao = dao_;
        aarcade = aarcade_;
        burnSink = burn_;
    }

    function pay(ISafeFeeRouter.Line line, bytes32 pool, address, /*publisher*/ uint256 amount, bytes32)
        external
        returns (uint256 stakersPart)
    {
        require(line == ISafeFeeRouter.Line.LineBMint, "line");
        require(amount > 0, "zero");
        require(usdc.transferFrom(msg.sender, address(this), amount), "pull");
        uint256 daoPart = (amount * 1000) / 10000;
        uint256 aarcadePart = (amount * 4000) / 10000;
        uint256 burnPart = (amount * 1000) / 10000;
        stakersPart = amount - daoPart - aarcadePart - burnPart;
        require(usdc.transfer(dao, daoPart), "dao");
        require(usdc.transfer(aarcade, aarcadePart), "aa");
        require(usdc.transfer(burnSink, burnPart), "burn");
        // Keep stakers leg on router for assert (real router credits SafePools).
        stakersRecv += stakersPart;
        daoRecv += daoPart;
        aarcadeRecv += aarcadePart;
        burnRecv += burnPart;
        lastPool = pool;
    }

    function poolKey(string calldata key) external pure returns (bytes32) {
        return keccak256(bytes(key));
    }
}

contract MockERC20Pay {
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

contract GvPaymentTest is Test {
    address owner = address(this);
    address alice = address(0xA11CE);
    address dao = address(0xDA0);
    address aarcade = address(0xAA);
    address burn = address(0xDEAD);

    Diamond diamond;
    GvRulesFacet rules;
    GvTileMintFacet mint;
    GvCraftFacet craft;
    GvInventoryFacet inventory;

    MockUSDC6 usdc;
    MockSafeFeeRouter feeRouter;

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
        cut[2] = _cut(address(rulesImpl), FacetSelectors.rulesAll());
        cut[3] = _cut(address(mintImpl), FacetSelectors.mintAll());
        cut[4] = _cut(address(invImpl), FacetSelectors.inventoryERC1155All());
        cut[5] = _cut(address(catalogImpl), FacetSelectors.catalogAll());
        cut[6] = _cut(address(craftImpl), FacetSelectors.craftAll());

        bytes memory initCalldata = abi.encodeWithSelector(InitERC1155.init.selector, "ipfs://gv2d/{id}.json");
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(init), initCalldata);

        rules = GvRulesFacet(address(diamond));
        mint = GvTileMintFacet(address(diamond));
        craft = GvCraftFacet(address(diamond));
        inventory = GvInventoryFacet(address(diamond));

        address[4] memory tokens;
        LibAppStorage.AlchemicaCost memory ghostDefault =
            LibAppStorage.AlchemicaCost({fud: 5 ether, fomo: 0, alpha: 2 ether, kek: 0});
        rules.initGvRules(tokens, ghostDefault, false);

        (uint256[] memory ids, LibAppStorage.AlchemicaCost[] memory costs) = SeedTilesLib.tileCatalog();
        rules.registerTiles(ids, costs);
        SeedSoftInstallsLib.seed(address(diamond));

        usdc = new MockUSDC6();
        feeRouter = new MockSafeFeeRouter(address(usdc), dao, aarcade, burn);
    }

    function test_paymentOff_freeMintStillWorks() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 1;
        vm.prank(alice);
        mint.mintTiles(ids, amounts);
        assertEq(inventory.balanceOf(alice, 8), 1);
        assertEq(mint.quoteMintLineBFeeUsdc(1), 0);
    }

    function test_lineBMint_usdcSplit_onTileMint() public {
        uint256 fee = 1e6; // 1 USDC
        rules.configureLineBPayment(address(feeRouter), address(usdc), fee, true, address(0));
        rules.setPaymentEnabled(true);

        usdc.mint(alice, 10e6);
        vm.startPrank(alice);
        usdc.approve(address(diamond), type(uint256).max);

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 38; // ghost — catalog zero → ghostDefault alchemica, but tokens unset → skip alchemica
        amounts[0] = 2;

        assertEq(mint.quoteMintLineBFeeUsdc(2), 2e6);
        mint.mintTiles(ids, amounts);
        vm.stopPrank();

        assertEq(inventory.balanceOf(alice, 38), 2);
        assertEq(feeRouter.aarcadeRecv(), (2e6 * 4000) / 10000);
        assertEq(feeRouter.daoRecv(), (2e6 * 1000) / 10000);
        assertEq(feeRouter.burnRecv(), (2e6 * 1000) / 10000);
        assertEq(feeRouter.stakersRecv(), (2e6 * 4000) / 10000);
        assertEq(feeRouter.lastPool(), LibGvPayment.POOL_TILE);
        assertEq(usdc.balanceOf(alice), 8e6);
    }

    function test_lineBMint_onSoftInstallCraft_poolInstallation() public {
        rules.configureLineBPayment(address(feeRouter), address(usdc), 5e5, true, address(0));
        rules.setPaymentEnabled(true);

        usdc.mint(alice, 5e5);
        vm.startPrank(alice);
        usdc.approve(address(diamond), type(uint256).max);

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 180;
        amounts[0] = 1;
        craft.craftInstallations(ids, amounts);
        vm.stopPrank();

        assertEq(inventory.balanceOf(alice, 180), 1);
        assertEq(feeRouter.lastPool(), LibGvPayment.POOL_INSTALLATION);
        assertEq(feeRouter.aarcadeRecv(), (5e5 * 4000) / 10000);
    }

    function test_alchemicaPlusLineB_whenTokensConfigured() public {
        MockERC20Pay fud = new MockERC20Pay();
        MockERC20Pay fomo = new MockERC20Pay();
        MockERC20Pay alpha = new MockERC20Pay();
        MockERC20Pay kek = new MockERC20Pay();
        address[4] memory tokens = [address(fud), address(fomo), address(alpha), address(kek)];
        rules.setAlchemicaTokens(tokens);
        rules.configureLineBPayment(address(feeRouter), address(usdc), 1e6, true, address(0));
        rules.setPaymentEnabled(true);

        // tile 8 has non-zero catalog cost
        LibAppStorage.AlchemicaCost memory unit = rules.tileCost(8);
        fud.mint(alice, unit.fud);
        fomo.mint(alice, unit.fomo);
        alpha.mint(alice, unit.alpha);
        kek.mint(alice, unit.kek);
        usdc.mint(alice, 1e6);

        vm.startPrank(alice);
        fud.approve(address(diamond), type(uint256).max);
        fomo.approve(address(diamond), type(uint256).max);
        alpha.approve(address(diamond), type(uint256).max);
        kek.approve(address(diamond), type(uint256).max);
        usdc.approve(address(diamond), type(uint256).max);

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 8;
        amounts[0] = 1;
        mint.mintTiles(ids, amounts);
        vm.stopPrank();

        assertEq(inventory.balanceOf(alice, 8), 1);
        assertEq(fud.balanceOf(alice), 0);
        assertEq(fud.balanceOf(address(diamond)), unit.fud);
        assertEq(feeRouter.aarcadeRecv(), 4e5);
    }

    function test_lineBOff_paymentOn_zeroAlchemicaTokens_skipsBothForZeroCostInstall() public {
        // Soft install 180 has zero cost; lineB off → still free when paymentEnabled.
        rules.setPaymentEnabled(true);
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 180;
        amounts[0] = 1;
        vm.prank(alice);
        craft.craftInstallations(ids, amounts);
        assertEq(inventory.balanceOf(alice, 180), 1);
    }

    function test_configureDoesNotEnablePaymentByDefault() public {
        rules.configureLineBPayment(address(feeRouter), address(usdc), 1e6, false, address(0));
        assertFalse(rules.paymentEnabled());
        assertFalse(rules.lineBFeeEnabled());
        assertEq(rules.safeFeeRouter(), address(feeRouter));
        assertEq(rules.lineBMintFeeUsdc(), 1e6);
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
