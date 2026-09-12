// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Append-only AppStorage for Gotchiverse-2D soft diamond.
/// @dev Never reorder / remove existing fields. Only append new slots at the end.
library LibAppStorage {
    bytes32 constant APP_STORAGE_POSITION = keccak256("gotchiverse2d.app.storage.v1");

    uint256 internal constant CTILE_ID_START = 8;
    uint256 internal constant CTILE_ID_END = 47;

    /// @dev Soft-install catalog band (Waalls through racks). Disjoint from soft tiles 8–47.
    uint256 internal constant SOFT_INSTALL_ID_START = 162;
    uint256 internal constant SOFT_INSTALL_ID_END = 215;

    /// @dev Alchemica cost in 18-decimal units: [FUD, FOMO, ALPHA, KEK]
    struct AlchemicaCost {
        uint256 fud;
        uint256 fomo;
        uint256 alpha;
        uint256 kek;
    }

    /// @dev Soft install type metadata (placeholder URI via installBaseURI + "{id}").
    struct SoftInstallType {
        bool registered;
        uint8 installationType;
        uint8 level;
        uint8 width;
        uint8 height;
        uint256 nextLevelId; // 0 = none
        AlchemicaCost cost;
    }

    /// @dev Soft-install placement on a parcel key (GV-local; not cartridge ownership).
    struct Placement {
        uint256 itemId; // 0 = deleted / empty slot
        address owner; // placer; receives item on unequip
        bytes32 parcelId;
        uint16 x;
        uint16 y;
        uint8 width;
        uint8 height;
    }

    struct AppStorage {
        // --- inventory (same mapping slots serve ERC1155 balances) ---
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
        // ERC1155 operator approvals: account => operator => approved
        mapping(address => mapping(address => bool)) operatorApprovals;
        // ERC1155 metadata URI template (may contain "{id}")
        string uri;
        // --- soft installs (Phase B) ---
        // TODO(bag-SoT): balances for these ids currently live on GV ERC1155 as a
        // staging bag. Locked SoT = Aarcade cartridge ERC1155 once InventoryFacet
        // gains a soft-install mint entrypoint (not mintWearable).
        mapping(uint256 => SoftInstallType) softInstalls;
        string installBaseURI; // mutable placeholder metadata for soft installs
        // --- placements (Phase place) ---
        // Soft-install place state keyed by opaque bytes32 parcelId (see GvPlaceFacet).
        // cPaarcel ownership stays on cartridge; GV stores placements only.
        uint256 placementCount; // next id = count (ids start at 1)
        mapping(uint256 => Placement) placements; // placementId => Placement
        // parcelId => packed(x,y) => placementId (0 = empty). Footprint cells share one id.
        mapping(bytes32 => mapping(uint32 => uint256)) parcelCellPlacement;
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

    function isSoftInstallId(uint256 id) internal pure returns (bool) {
        return id >= SOFT_INSTALL_ID_START && id <= SOFT_INSTALL_ID_END;
    }
}
