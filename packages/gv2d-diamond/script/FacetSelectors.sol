// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DiamondLoupeFacet} from "../src/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/facets/OwnershipFacet.sol";
import {GvRulesFacet} from "../src/facets/GvRulesFacet.sol";
import {GvTileMintFacet} from "../src/facets/GvTileMintFacet.sol";
import {GvInventoryFacet} from "../src/facets/GvInventoryFacet.sol";
import {GvCatalogFacet} from "../src/facets/GvCatalogFacet.sol";
import {GvCraftFacet} from "../src/facets/GvCraftFacet.sol";
import {GvPlaceFacet} from "../src/facets/GvPlaceFacet.sol";
import {GvUpgradeFacet} from "../src/facets/GvUpgradeFacet.sol";

/// @dev Shared selector lists for fresh deploy and upgrade cuts.
library FacetSelectors {
    function loupe() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](5);
        s[0] = DiamondLoupeFacet.facets.selector;
        s[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        s[2] = DiamondLoupeFacet.facetAddresses.selector;
        s[3] = DiamondLoupeFacet.facetAddress.selector;
        s[4] = DiamondLoupeFacet.supportsInterface.selector;
    }

    function ownership() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](2);
        s[0] = OwnershipFacet.owner.selector;
        s[1] = OwnershipFacet.transferOwnership.selector;
    }

    function rules() internal pure returns (bytes4[] memory s) {
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

    function mint() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](2);
        s[0] = GvTileMintFacet.mintTiles.selector;
        s[1] = GvTileMintFacet.quoteMintCost.selector;
    }

    /// @notice Selectors present on the pre-ERC1155 spike inventory facet.
    function inventoryLegacy() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](3);
        s[0] = GvInventoryFacet.balanceOf.selector;
        s[1] = GvInventoryFacet.balanceOfBatch.selector;
        s[2] = GvInventoryFacet.adminTransfer.selector;
    }

    /// @notice Full ERC1155 inventory selectors (replace legacy + add new).
    function inventoryERC1155() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](10);
        s[0] = GvInventoryFacet.balanceOf.selector;
        s[1] = GvInventoryFacet.balanceOfBatch.selector;
        s[2] = GvInventoryFacet.adminTransfer.selector;
        s[3] = GvInventoryFacet.safeTransferFrom.selector;
        s[4] = GvInventoryFacet.safeBatchTransferFrom.selector;
        s[5] = GvInventoryFacet.setApprovalForAll.selector;
        s[6] = GvInventoryFacet.isApprovedForAll.selector;
        s[7] = GvInventoryFacet.uri.selector;
        s[8] = GvInventoryFacet.setURI.selector;
        s[9] = GvInventoryFacet.burn.selector;
        // burnBatch added via inventoryERC1155Extra to keep array sizing clear in cuts
    }

    function inventoryERC1155All() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](11);
        s[0] = GvInventoryFacet.balanceOf.selector;
        s[1] = GvInventoryFacet.balanceOfBatch.selector;
        s[2] = GvInventoryFacet.adminTransfer.selector;
        s[3] = GvInventoryFacet.safeTransferFrom.selector;
        s[4] = GvInventoryFacet.safeBatchTransferFrom.selector;
        s[5] = GvInventoryFacet.setApprovalForAll.selector;
        s[6] = GvInventoryFacet.isApprovedForAll.selector;
        s[7] = GvInventoryFacet.uri.selector;
        s[8] = GvInventoryFacet.setURI.selector;
        s[9] = GvInventoryFacet.burn.selector;
        s[10] = GvInventoryFacet.burnBatch.selector;
    }

    /// @notice New selectors only (not on legacy inventory) — used in upgrade Add cut.
    function inventoryERC1155NewOnly() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](8);
        s[0] = GvInventoryFacet.safeTransferFrom.selector;
        s[1] = GvInventoryFacet.safeBatchTransferFrom.selector;
        s[2] = GvInventoryFacet.setApprovalForAll.selector;
        s[3] = GvInventoryFacet.isApprovedForAll.selector;
        s[4] = GvInventoryFacet.uri.selector;
        s[5] = GvInventoryFacet.setURI.selector;
        s[6] = GvInventoryFacet.burn.selector;
        s[7] = GvInventoryFacet.burnBatch.selector;
    }

    function catalog() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](8);
        s[0] = GvCatalogFacet.registerSoftInstall.selector;
        s[1] = GvCatalogFacet.registerSoftInstalls.selector;
        s[2] = GvCatalogFacet.setSoftInstallCost.selector;
        s[3] = GvCatalogFacet.setInstallBaseURI.selector;
        s[4] = GvCatalogFacet.softInstall.selector;
        s[5] = GvCatalogFacet.isSoftInstallRegistered.selector;
        s[6] = GvCatalogFacet.softInstallCost.selector;
        s[7] = GvCatalogFacet.installBaseURI.selector;
        // softInstallIdRange appended below — keep arrays sized for cuts
    }

    function catalogAll() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](9);
        s[0] = GvCatalogFacet.registerSoftInstall.selector;
        s[1] = GvCatalogFacet.registerSoftInstalls.selector;
        s[2] = GvCatalogFacet.setSoftInstallCost.selector;
        s[3] = GvCatalogFacet.setInstallBaseURI.selector;
        s[4] = GvCatalogFacet.softInstall.selector;
        s[5] = GvCatalogFacet.isSoftInstallRegistered.selector;
        s[6] = GvCatalogFacet.softInstallCost.selector;
        s[7] = GvCatalogFacet.installBaseURI.selector;
        s[8] = GvCatalogFacet.softInstallIdRange.selector;
    }

    function craft() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](2);
        s[0] = GvCraftFacet.craftInstallations.selector;
        s[1] = GvCraftFacet.quoteCraftCost.selector;
    }

    function place() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](11);
        s[0] = GvPlaceFacet.placeSoftInstall.selector;
        s[1] = GvPlaceFacet.placeSoftInstallOnUint.selector;
        s[2] = GvPlaceFacet.unequipSoftInstall.selector;
        s[3] = GvPlaceFacet.unequipSoftInstallOnUint.selector;
        s[4] = GvPlaceFacet.unequipSoftInstallById.selector;
        s[5] = GvPlaceFacet.placement.selector;
        s[6] = GvPlaceFacet.placementCount.selector;
        s[7] = GvPlaceFacet.cellPlacementId.selector;
        s[8] = GvPlaceFacet.isCellOccupied.selector;
        s[9] = GvPlaceFacet.parcelKeyFromUint.selector;
        s[10] = GvPlaceFacet.parcelKeyFromRealm.selector;
    }

    function upgrade() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](3);
        s[0] = GvUpgradeFacet.upgradeSoftInstallInBag.selector;
        s[1] = GvUpgradeFacet.upgradeSoftInstallPlacement.selector;
        s[2] = GvUpgradeFacet.quoteUpgradeCost.selector;
    }
}
