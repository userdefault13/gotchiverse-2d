---
name: aarcade-cartridge-integration
description: Integrate Gotchiverse with AarcadeGh-t cartridge-sim (soft launch). Use when wiring cartridgeId query params, /api/aarcade-cartridge, or AARCADE_CARTRIDGE_* env vars.
---

# Aarcade Cartridge Soft-Launch Integration

## Architecture

```
Aarcade Games catalog ─mint/ensure─▶ cartridge-sim
        │
        └─launch URL─▶ gotchiverse-2d/?cartridgeId=&playerId=
                              │
                              └─/api/aarcade-cartridge─▶ GET cartridge-sim/cartridges?owner=&gameId=
```

Browser never needs cartridge-sim admin secrets. Mint/ensure UX stays on aarcadeghst.com.

## Endpoint contract (Gotchiverse proxy)

- **URL:** `/api/aarcade-cartridge?wallet=0x...&gameId=gotchiverse`
- **Method:** `GET`
- **Upstream:** `AARCADE_CARTRIDGE_SIM_URL` (default `https://aarcadeghst.com/api/cartridge-sim`)
- **Response:**
  ```json
  {
    "wallet": "0x...",
    "gameId": "gotchiverse",
    "hasCartridge": false,
    "cartridgeId": null,
    "cartridges": [],
    "catalogUrl": "https://aarcadeghst.com/games",
    "checkedAt": "2026-07-19T00:00:00.000Z"
  }
  ```

## Env vars

| Var | Value |
|-----|--------|
| `AARCADE_CARTRIDGE_SIM_URL` | `https://aarcadeghst.com/api/cartridge-sim` |
| `NEXT_PUBLIC_AARCADE_HOME` | `https://aarcadeghst.com` |
| `NEXT_PUBLIC_AARCADE_CARTRIDGE_GAME_ID` | `gotchiverse` (optional) |

## FE pattern

1. Landing reads `cartridgeId` / `playerId` from the query string (Aarcade launch deep link).
2. After wallet connect, call `/api/aarcade-cartridge?wallet=…` and store `hasCartridge` / `cartridgeId` on UserContext.
3. Catalog CTA → `catalogUrl` / Aarcade `/games` for minting when missing.

## Aarcade side (separate repo)

Register `gameId=gotchiverse` rules + catalog entry so mint/ensure works. Until then, lookups return `hasCartridge: false` and the FE still accepts a launch `cartridgeId` for soft identity.
