// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Append-only AppStorage for Gotchiverse-2D soft diamond.
/// @dev Never reorder / remove existing fields. Only append new slots at the end.
library LibAppStorage {
    bytes32 constant APP_STORAGE_POSITION = keccak256("gotchiverse2d.app.storage.v1");

    uint256 internal constant CTILE_ID_START = 8;
    uint256 internal constant CTILE_ID_END = 47;

    /// @dev Alchemica cost in 18-decimal units: [FUD, FOMO, ALPHA, KEK]
    struct AlchemicaCost {
        uint256 fud;
        uint256 fomo;
        uint256 alpha;
        uint256 kek;
    }

    struct AppStorage {
        // --- inventory (diamond-native balances; not a sibling ERC1155) ---
        // account => tileId => balance
        mapping(address => mapping(uint256 => uint256)) balances;
        // --- tile catalog ---
        mapping(uint256 => bool) tileRegistered;
        mapping(uint256 => AlchemicaCost) tileCost;
        // --- rules / economics (mutable via GvRulesFacet) ---
        bool paymentEnabled;
        address[4] alchemicaTokens; // FUD, FOMO, ALPHA, KEK
        AlchemicaCost ghostDefaultCost; // used when registered cost is all-zero
        uint256 rulesVersion;
        bool initialized;
        // --- APPEND NEW FIELDS BELOW THIS LINE ONLY ---
    }

    function appStorage() internal pure returns (AppStorage storage s) {
        bytes32 position = APP_STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }

    function isSoftTileId(uint256 id) internal pure returns (bool) {
        return id >= CTILE_ID_START && id <= CTILE_ID_END;
    }
}
