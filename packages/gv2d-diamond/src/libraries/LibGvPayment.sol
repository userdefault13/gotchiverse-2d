// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "./LibAppStorage.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {ISafeFeeRouter} from "../interfaces/ISafeFeeRouter.sol";

/// @notice Shared craft/mint payment: optional alchemica pull + SafeFeeRouter LineBMint USDC.
/// @dev Architecture (Sepolia → mainnet):
///      - Catalog `AlchemicaCost` remains the craft-resource quote (mainnet alchemica).
///      - When `paymentEnabled` and alchemica tokens are configured, pull catalog alchemica.
///      - Protocol fee split is **USDC** via SafeFeeRouter `LineBMint` (40/40/10/10) — SoT on
///        the router, not duplicated here. Line B is a **protocol fee** (not a second alchemica
///        ledger): on Sepolia without alchemica faucets it is the payment path; on mainnet it
///        sits alongside alchemica pull when both are enabled.
///      - Pool keys match Aarcade: `tile` / `installation` (keccak256 of the string).
library LibGvPayment {
    bytes32 public constant POOL_TILE = keccak256("tile");
    bytes32 public constant POOL_INSTALLATION = keccak256("installation");

    event LineBMintPaid(address indexed payer, bytes32 indexed pool, uint256 amount, bytes32 ref);

    function alchemicaConfigured(LibAppStorage.AppStorage storage s) internal view returns (bool) {
        return s.alchemicaTokens[0] != address(0) || s.alchemicaTokens[1] != address(0)
            || s.alchemicaTokens[2] != address(0) || s.alchemicaTokens[3] != address(0);
    }

    function pullAlchemica(
        LibAppStorage.AppStorage storage s,
        address from,
        LibAppStorage.AlchemicaCost memory unit,
        uint256 amount
    ) internal {
        if (!s.paymentEnabled) return;
        if (!alchemicaConfigured(s)) return;
        _pullOne(s.alchemicaTokens[0], from, unit.fud * amount);
        _pullOne(s.alchemicaTokens[1], from, unit.fomo * amount);
        _pullOne(s.alchemicaTokens[2], from, unit.alpha * amount);
        _pullOne(s.alchemicaTokens[3], from, unit.kek * amount);
    }

    /// @notice Collect USDC LineBMint fee when payment + lineB fee flags are on.
    /// @dev Pulls USDC from `from` → diamond, approves router, calls `pay(LineBMint, …)`.
    function payLineBMint(
        LibAppStorage.AppStorage storage s,
        address from,
        bytes32 pool,
        uint256 units,
        bytes32 ref
    ) internal {
        if (!s.paymentEnabled || !s.lineBFeeEnabled) return;
        address router = s.safeFeeRouter;
        if (router == address(0)) return;
        uint256 feePer = s.lineBMintFeeUsdc;
        if (feePer == 0 || units == 0) return;
        uint256 amount = feePer * units;

        address usdc = s.usdc;
        if (usdc == address(0)) {
            usdc = ISafeFeeRouter(router).usdc();
            require(usdc != address(0), "GvPay: usdc");
        }

        require(IERC20(usdc).transferFrom(from, address(this), amount), "GvPay: usdc pull");
        require(IERC20(usdc).approve(router, amount), "GvPay: usdc approve");
        ISafeFeeRouter(router).pay(
            ISafeFeeRouter.Line.LineBMint, pool, s.lineBPublisher, amount, ref
        );
        IERC20(usdc).approve(router, 0);

        emit LineBMintPaid(from, pool, amount, ref);
    }

    function poolForSoftTile() internal pure returns (bytes32) {
        return POOL_TILE;
    }

    function poolForSoftInstall() internal pure returns (bytes32) {
        return POOL_INSTALLATION;
    }

    function refFor(address payer, uint256 id, uint256 amount) internal view returns (bytes32) {
        return keccak256(abi.encode(payer, id, amount, block.number));
    }

    function _pullOne(address token, address from, uint256 amount) private {
        if (amount == 0) return;
        require(token != address(0), "GvPay: token");
        bool ok = IERC20(token).transferFrom(from, address(this), amount);
        require(ok, "GvPay: transfer");
    }
}
