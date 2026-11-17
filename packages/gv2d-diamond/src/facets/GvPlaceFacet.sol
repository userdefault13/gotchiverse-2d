// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibERC1155} from "../libraries/LibERC1155.sol";

/// @notice Place / unequip soft installs from the GV ERC1155 bag onto a parcel key.
/// @dev Parcel model (this pass):
///      - Primary key is `bytes32 parcelId` (opaque). Place state lives on GV.
///      - Helpers: `parcelKeyFromUint(uint256)` and `parcelKeyFromRealm(uint256 chainId, uint256 realmParcelId)`.
///      - cPaarcel ownership remains on the Aarcade cartridge; GV does not verify parcel ownership yet.
///      Place: msg.sender must hold bag balance; burns 1 from bag; records owner=msg.sender.
///      Unequip: msg.sender must be placement.owner; mints 1 back to owner; clears footprint.
///      Conflict: every cell in catalog width×height footprint must be free.
contract GvPlaceFacet {
    event SoftInstallPlaced(
        bytes32 indexed parcelId,
        uint256 indexed placementId,
        address indexed owner,
        uint256 itemId,
        uint16 x,
        uint16 y,
        uint8 width,
        uint8 height
    );
    event SoftInstallUnequipped(
        bytes32 indexed parcelId,
        uint256 indexed placementId,
        address indexed owner,
        uint256 itemId,
        uint16 x,
        uint16 y
    );

    /// @notice Place one soft install from caller's bag at (x,y) on parcelId.
    function placeSoftInstall(bytes32 parcelId, uint256 itemId, uint16 x, uint16 y)
        public
        returns (uint256 placementId)
    {
        require(parcelId != bytes32(0), "GvPlace: parcel");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.initialized, "GvPlace: !init");
        require(LibAppStorage.isSoftInstallId(itemId), "GvPlace: id");
        LibAppStorage.SoftInstallType storage t = s.softInstalls[itemId];
        require(t.registered, "GvPlace: !registered");
        require(s.balances[msg.sender][itemId] >= 1, "GvPlace: bal");

        uint8 width = t.width;
        uint8 height = t.height;
        _requireFootprintFree(s, parcelId, x, y, width, height);

        LibERC1155.burn(msg.sender, itemId, 1);

        unchecked {
            placementId = ++s.placementCount;
        }
        s.placements[placementId] = LibAppStorage.Placement({
            itemId: itemId,
            owner: msg.sender,
            parcelId: parcelId,
            x: x,
            y: y,
            width: width,
            height: height
        });
        _markFootprint(s, parcelId, x, y, width, height, placementId);

        emit SoftInstallPlaced(parcelId, placementId, msg.sender, itemId, x, y, width, height);
    }

    /// @notice Convenience: treat uint256 as bytes32 parcel key (left-padded).
    function placeSoftInstallOnUint(uint256 parcelId, uint256 itemId, uint16 x, uint16 y)
        external
        returns (uint256 placementId)
    {
        return placeSoftInstall(parcelKeyFromUint(parcelId), itemId, x, y);
    }

    /// @notice Unequip placement covering cell (x,y). Caller must be stored placement owner.
    function unequipSoftInstall(bytes32 parcelId, uint16 x, uint16 y) public {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 placementId = s.parcelCellPlacement[parcelId][_packCell(x, y)];
        require(placementId != 0, "GvPlace: empty");
        _unequip(s, placementId, parcelId);
    }

    function unequipSoftInstallOnUint(uint256 parcelId, uint16 x, uint16 y) external {
        unequipSoftInstall(parcelKeyFromUint(parcelId), x, y);
    }

    function unequipSoftInstallById(uint256 placementId) external {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        LibAppStorage.Placement storage p = s.placements[placementId];
        require(p.itemId != 0, "GvPlace: gone");
        _unequip(s, placementId, p.parcelId);
    }

    // --- views ---

    function placement(uint256 placementId) external view returns (LibAppStorage.Placement memory) {
        return LibAppStorage.appStorage().placements[placementId];
    }

    function placementCount() external view returns (uint256) {
        return LibAppStorage.appStorage().placementCount;
    }

    function cellPlacementId(bytes32 parcelId, uint16 x, uint16 y) external view returns (uint256) {
        return LibAppStorage.appStorage().parcelCellPlacement[parcelId][_packCell(x, y)];
    }

    function isCellOccupied(bytes32 parcelId, uint16 x, uint16 y) external view returns (bool) {
        return LibAppStorage.appStorage().parcelCellPlacement[parcelId][_packCell(x, y)] != 0;
    }

    function parcelKeyFromUint(uint256 parcelId) public pure returns (bytes32) {
        return bytes32(parcelId);
    }

    /// @notice Optional Realm-linked key: keccak256(chainId, realmParcelId).
    function parcelKeyFromRealm(uint256 chainId, uint256 realmParcelId) public pure returns (bytes32) {
        return keccak256(abi.encode(chainId, realmParcelId));
    }

    // --- internal ---

    function _unequip(LibAppStorage.AppStorage storage s, uint256 placementId, bytes32 expectedParcel)
        internal
    {
        LibAppStorage.Placement memory p = s.placements[placementId];
        require(p.itemId != 0, "GvPlace: gone");
        require(p.parcelId == expectedParcel, "GvPlace: parcel");
        require(p.owner == msg.sender, "GvPlace: !owner");

        _clearFootprint(s, p.parcelId, p.x, p.y, p.width, p.height);
        delete s.placements[placementId];

        LibERC1155.mint(p.owner, p.itemId, 1);
        emit SoftInstallUnequipped(p.parcelId, placementId, p.owner, p.itemId, p.x, p.y);
    }

    function _packCell(uint16 x, uint16 y) internal pure returns (uint32) {
        return (uint32(x) << 16) | uint32(y);
    }

    function _requireFootprintFree(
        LibAppStorage.AppStorage storage s,
        bytes32 parcelId,
        uint16 x,
        uint16 y,
        uint8 width,
        uint8 height
    ) internal view {
        uint256 xEnd = uint256(x) + uint256(width);
        uint256 yEnd = uint256(y) + uint256(height);
        require(xEnd <= type(uint16).max && yEnd <= type(uint16).max, "GvPlace: overflow");
        for (uint16 dx; dx < width;) {
            for (uint16 dy; dy < height;) {
                require(
                    s.parcelCellPlacement[parcelId][_packCell(x + dx, y + dy)] == 0, "GvPlace: occupied"
                );
                unchecked {
                    dy++;
                }
            }
            unchecked {
                dx++;
            }
        }
    }

    function _markFootprint(
        LibAppStorage.AppStorage storage s,
        bytes32 parcelId,
        uint16 x,
        uint16 y,
        uint8 width,
        uint8 height,
        uint256 placementId
    ) internal {
        for (uint16 dx; dx < width;) {
            for (uint16 dy; dy < height;) {
                s.parcelCellPlacement[parcelId][_packCell(x + dx, y + dy)] = placementId;
                unchecked {
                    dy++;
                }
            }
            unchecked {
                dx++;
            }
        }
    }

    function _clearFootprint(
        LibAppStorage.AppStorage storage s,
        bytes32 parcelId,
        uint16 x,
        uint16 y,
        uint8 width,
        uint8 height
    ) internal {
        for (uint16 dx; dx < width;) {
            for (uint16 dy; dy < height;) {
                delete s.parcelCellPlacement[parcelId][_packCell(x + dx, y + dy)];
                unchecked {
                    dy++;
                }
            }
            unchecked {
                dx++;
            }
        }
    }
}
