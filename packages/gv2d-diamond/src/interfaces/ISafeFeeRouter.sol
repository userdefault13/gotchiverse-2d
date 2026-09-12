// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal SafeFeeRouter surface used by GV craft/mint payment (AarcadeGh-t).
/// @dev Splits live on the router (LineBMint = 40/40/10/10 stakers/aarcade/burn/dao). Do not
///      duplicate bps on GV. `pay` pulls USDC from msg.sender (the diamond after collect).
interface ISafeFeeRouter {
    enum Line {
        LineCStamp,
        LineBMint,
        LineBRepair,
        FakeGotchiMint
    }

    function pay(Line line, bytes32 pool, address publisher, uint256 amount, bytes32 ref)
        external
        returns (uint256 stakersPart);

    function usdc() external view returns (address);

    function poolKey(string calldata key) external pure returns (bytes32);
}
