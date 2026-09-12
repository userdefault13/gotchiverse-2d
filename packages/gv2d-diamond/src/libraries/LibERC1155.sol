// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "./LibAppStorage.sol";
import {IERC1155Receiver} from "../interfaces/IERC1155Receiver.sol";

/// @notice Shared ERC1155 balance mutations for soft tiles (diamond-hosted).
/// @dev Events emit from the diamond via delegatecall. Balance slots are the
///      original AppStorage.balances mapping (no wipe / no sibling token).
library LibERC1155 {
    event TransferSingle(
        address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value
    );
    event TransferBatch(
        address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    bytes4 private constant _ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant _ERC1155_BATCH_RECEIVED = 0xbc197c81;

    function mint(address to, uint256 id, uint256 amount) internal {
        require(to != address(0), "ERC1155: mint zero");
        require(amount > 0, "ERC1155: mint amount");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.balances[to][id] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) internal {
        require(to != address(0), "ERC1155: mint zero");
        require(ids.length == amounts.length, "ERC1155: len");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        for (uint256 i; i < ids.length; i++) {
            require(amounts[i] > 0, "ERC1155: mint amount");
            s.balances[to][ids[i]] += amounts[i];
        }
        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
    }

    function burn(address from, uint256 id, uint256 amount) internal {
        require(from != address(0), "ERC1155: burn zero");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 bal = s.balances[from][id];
        require(bal >= amount, "ERC1155: burn bal");
        unchecked {
            s.balances[from][id] = bal - amount;
        }
        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }

    function burnBatch(address from, uint256[] memory ids, uint256[] memory amounts) internal {
        require(from != address(0), "ERC1155: burn zero");
        require(ids.length == amounts.length, "ERC1155: len");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        for (uint256 i; i < ids.length; i++) {
            uint256 bal = s.balances[from][ids[i]];
            require(bal >= amounts[i], "ERC1155: burn bal");
            unchecked {
                s.balances[from][ids[i]] = bal - amounts[i];
            }
        }
        emit TransferBatch(msg.sender, from, address(0), ids, amounts);
    }

    function safeTransferFrom(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal {
        require(to != address(0), "ERC1155: transfer zero");
        require(from == operator || isApprovedForAll(from, operator), "ERC1155: !approved");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 bal = s.balances[from][id];
        require(bal >= amount, "ERC1155: bal");
        unchecked {
            s.balances[from][id] = bal - amount;
            s.balances[to][id] += amount;
        }
        emit TransferSingle(operator, from, to, id, amount);
        _doSafeTransferAcceptanceCheck(operator, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal {
        require(to != address(0), "ERC1155: transfer zero");
        require(ids.length == amounts.length, "ERC1155: len");
        require(from == operator || isApprovedForAll(from, operator), "ERC1155: !approved");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        for (uint256 i; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            uint256 bal = s.balances[from][id];
            require(bal >= amount, "ERC1155: bal");
            unchecked {
                s.balances[from][id] = bal - amount;
                s.balances[to][id] += amount;
            }
        }
        emit TransferBatch(operator, from, to, ids, amounts);
        _doSafeBatchTransferAcceptanceCheck(operator, from, to, ids, amounts, data);
    }

    function setApprovalForAll(address account, address operator, bool approved) internal {
        require(account != operator, "ERC1155: self approval");
        LibAppStorage.appStorage().operatorApprovals[account][operator] = approved;
        emit ApprovalForAll(account, operator, approved);
    }

    function isApprovedForAll(address account, address operator) internal view returns (bool) {
        return LibAppStorage.appStorage().operatorApprovals[account][operator];
    }

    function _doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) private {
        if (to.code.length == 0) return;
        try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
            require(response == _ERC1155_RECEIVED, "ERC1155: receiver");
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert("ERC1155: non-receiver");
            }
            assembly {
                revert(add(reason, 32), mload(reason))
            }
        }
    }

    function _doSafeBatchTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) private {
        if (to.code.length == 0) return;
        try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data) returns (bytes4 response)
        {
            require(response == _ERC1155_BATCH_RECEIVED, "ERC1155: batch receiver");
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert("ERC1155: non-receiver");
            }
            assembly {
                revert(add(reason, 32), mload(reason))
            }
        }
    }
}
