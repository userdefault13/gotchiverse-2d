// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";

/// @notice Catalog for soft tiles 8–47 from shared_code/data/tiles.json (scaled 1e18).
/// @dev Zero-cost rows (Ghost pack 38–47) keep on-chain zeros; mint uses ghostDefaultCost.
library SeedTilesLib {
    function tileCatalog()
        internal
        pure
        returns (uint256[] memory ids, LibAppStorage.AlchemicaCost[] memory costs)
    {
        ids = new uint256[](40);
        costs = new LibAppStorage.AlchemicaCost[](40);
        // 8 Blue Ghost
        ids[0] = 8;
        costs[0] = LibAppStorage.AlchemicaCost({fud: 22000000000000000000, fomo: 11000000000000000000, alpha: 8500000000000000000, kek: 2200000000000000000});
        // 9 Blue Diamond
        ids[1] = 9;
        costs[1] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 11500000000000000000, kek: 5400000000000000000});
        // 10 Blue Star
        ids[2] = 10;
        costs[2] = LibAppStorage.AlchemicaCost({fud: 36000000000000000000, fomo: 0, alpha: 16000000000000000000, kek: 0});
        // 11 Blue Heart
        ids[3] = 11;
        costs[3] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 12000000000000000000, alpha: 19000000000000000000, kek: 0});
        // 12 Dark Magenta Ghost
        ids[4] = 12;
        costs[4] = LibAppStorage.AlchemicaCost({fud: 22700000000000000000, fomo: 11300000000000000000, alpha: 8000000000000000000, kek: 2300000000000000000});
        // 13 Dark Magenta Diamond
        ids[5] = 13;
        costs[5] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 11000000000000000000, kek: 5600000000000000000});
        // 14 Dark Magenta Star
        ids[6] = 14;
        costs[6] = LibAppStorage.AlchemicaCost({fud: 34000000000000000000, fomo: 0, alpha: 16500000000000000000, kek: 0});
        // 15 Dark Magenta Heart
        ids[7] = 15;
        costs[7] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 11000000000000000000, alpha: 19500000000000000000, kek: 0});
        // 16 Yellow Ghost
        ids[8] = 16;
        costs[8] = LibAppStorage.AlchemicaCost({fud: 19300000000000000000, fomo: 9700000000000000000, alpha: 10500000000000000000, kek: 1900000000000000000});
        // 17 Yellow Diamond
        ids[9] = 17;
        costs[9] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 13500000000000000000, kek: 4600000000000000000});
        // 18 Yellow Star
        ids[10] = 18;
        costs[10] = LibAppStorage.AlchemicaCost({fud: 44000000000000000000, fomo: 0, alpha: 14000000000000000000, kek: 0});
        // 19 Yellow Heart
        ids[11] = 19;
        costs[11] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 16000000000000000000, alpha: 17000000000000000000, kek: 0});
        // 20 Purple Ghost
        ids[12] = 20;
        costs[12] = LibAppStorage.AlchemicaCost({fud: 21300000000000000000, fomo: 10700000000000000000, alpha: 9000000000000000000, kek: 2100000000000000000});
        // 21 Purple Diamond
        ids[13] = 21;
        costs[13] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 12000000000000000000, kek: 5200000000000000000});
        // 22 Purple Star
        ids[14] = 22;
        costs[14] = LibAppStorage.AlchemicaCost({fud: 38000000000000000000, fomo: 0, alpha: 15500000000000000000, kek: 0});
        // 23 Purple Heart
        ids[15] = 23;
        costs[15] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 13000000000000000000, alpha: 18500000000000000000, kek: 0});
        // 24 Pink Ghost
        ids[16] = 24;
        costs[16] = LibAppStorage.AlchemicaCost({fud: 20000000000000000000, fomo: 10000000000000000000, alpha: 10000000000000000000, kek: 2000000000000000000});
        // 25 Pink Diamond
        ids[17] = 25;
        costs[17] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 13000000000000000000, kek: 4800000000000000000});
        // 26 Pink Star
        ids[18] = 26;
        costs[18] = LibAppStorage.AlchemicaCost({fud: 42000000000000000000, fomo: 0, alpha: 14500000000000000000, kek: 0});
        // 27 Pink Heart
        ids[19] = 27;
        costs[19] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 15000000000000000000, alpha: 17500000000000000000, kek: 0});
        // 28 Green Ghost
        ids[20] = 28;
        costs[20] = LibAppStorage.AlchemicaCost({fud: 20700000000000000000, fomo: 10300000000000000000, alpha: 9500000000000000000, kek: 2100000000000000000});
        // 29 Green Diamond
        ids[21] = 29;
        costs[21] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 12500000000000000000, kek: 5000000000000000000});
        // 30 Green Star
        ids[22] = 30;
        costs[22] = LibAppStorage.AlchemicaCost({fud: 40000000000000000000, fomo: 0, alpha: 15000000000000000000, kek: 0});
        // 31 Green Heart
        ids[23] = 31;
        costs[23] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 14000000000000000000, alpha: 18000000000000000000, kek: 0});
        // 32 Black Cacti
        ids[24] = 32;
        costs[24] = LibAppStorage.AlchemicaCost({fud: 150000000000000000000, fomo: 0, alpha: 75000000000000000000, kek: 33000000000000000000});
        // 33 Black Rofl
        ids[25] = 33;
        costs[25] = LibAppStorage.AlchemicaCost({fud: 250000000000000000000, fomo: 0, alpha: 105000000000000000000, kek: 16000000000000000000});
        // 34 Black Sus
        ids[26] = 34;
        costs[26] = LibAppStorage.AlchemicaCost({fud: 300000000000000000000, fomo: 0, alpha: 60000000000000000000, kek: 25000000000000000000});
        // 35 White Cacti
        ids[27] = 35;
        costs[27] = LibAppStorage.AlchemicaCost({fud: 70000000000000000000, fomo: 0, alpha: 70000000000000000000, kek: 37000000000000000000});
        // 36 White Rofl
        ids[28] = 36;
        costs[28] = LibAppStorage.AlchemicaCost({fud: 160000000000000000000, fomo: 0, alpha: 100000000000000000000, kek: 24000000000000000000});
        // 37 White Sus
        ids[29] = 37;
        costs[29] = LibAppStorage.AlchemicaCost({fud: 225000000000000000000, fomo: 0, alpha: 55000000000000000000, kek: 30000000000000000000});
        // 38 Grey Ghost
        ids[30] = 38;
        costs[30] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 39 Shadow Ghost
        ids[31] = 39;
        costs[31] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 40 Charcoal Ghost
        ids[32] = 40;
        costs[32] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 41 Graphite Ghost
        ids[33] = 41;
        costs[33] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 42 Slate Ghost
        ids[34] = 42;
        costs[34] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 43 Stone Ghost
        ids[35] = 43;
        costs[35] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 44 Ash Ghost
        ids[36] = 44;
        costs[36] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 45 Silver Ghost
        ids[37] = 45;
        costs[37] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 46 Fog Ghost
        ids[38] = 46;
        costs[38] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
        // 47 Cloud Ghost
        ids[39] = 47;
        costs[39] = LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
    }
}
