---
name: aarcade-cartridge-integration
description: Integrate Gotchiverse with AarcadeGh-t cartridge-sim (soft launch). Use when wiring cartridgeId query params, /api/aarcade-cartridge, or AARCADE_CARTRIDGE_* env vars.
---

# Aarcade Cartridge Soft-Launch Integration

## Architecture

```
GotchiSelectModal
  1) Mint Cartridge card → cartridge details (FREE) + Mint CTA
        └─POST /api/aarcade-cartridge-mint { phase: "ensure" }
              ├─game-session → cartridges/ensure
  2) Then cAavegotchi gallery → Bind CTA
        └─POST /api/aarcade-cartridge-mint { phase: "bind", collateral }
              └─ensure (idempotent) → bind-starter
Landing also: GET /api/aarcade-cartridge?wallet=…  (lookup)
```

Browser never needs cartridge-sim admin secrets. Soft-launch uses `simPay: true`. Cartridge Line A is free.

## Endpoint contracts (Gotchiverse proxy)

### Lookup
- **URL:** `/api/aarcade-cartridge?wallet=0x...&gameId=gotchiverse`
- **Method:** `GET`

### Mint / bind
- **URL:** `/api/aarcade-cartridge-mint`
- **Method:** `POST`
- **Body:** `{ wallet, phase: "ensure" | "bind", collateral? }` — collateral required for `bind` (gallery names ok)
- **Upstream:** `AARCADE_GAME_SESSION_URL` + `AARCADE_CARTRIDGE_SIM_URL`
- **Success:** `{ ok, phase, cartridgeId, hasCartridge, alreadyBound?, collateral? }`

## Env vars

| Var | Value |
|-----|--------|
| `AARCADE_CARTRIDGE_SIM_URL` | `https://aarcadeghst.com/api/cartridge-sim` |
| `AARCADE_GAME_SESSION_URL` | optional; defaults to `{NEXT_PUBLIC_AARCADE_HOME}/api/game-session` |
| `NEXT_PUBLIC_AARCADE_HOME` | `https://aarcadeghst.com` |
| `NEXT_PUBLIC_AARCADE_CARTRIDGE_GAME_ID` | `gotchiverse` (optional) |

## FE pattern

1. Landing reads `cartridgeId` / `playerId` from the query string (Aarcade launch deep link).
2. After wallet connect / network switch, call `/api/aarcade-cartridge?wallet=…&gameId=…` scoped by chain and store `hasCartridge` / `cartridgeId` on UserContext.
3. Mint Cartridge card → collateral gallery → Mint button → `ensure`/`bind` with chain gameId → `UPDATE_USER_CARTRIDGE`.

## Per-chain gameIds

| Network | gameId | Notes |
|---------|--------|--------|
| Base | `gotchiverse-base` | New Base mints |
| Robinhood | `gotchiverse-rh` | New RH mints |
| Robinhood (legacy) | `gotchiverse` | Soft-launch RH mints — RH lookup only |

Base must never fall back to bare `gotchiverse`, or an RH soft-launch cartridge would unlock Base.

## Aarcade side (separate repo)

Register `gotchiverse-base` and `gotchiverse-rh` (and keep legacy `gotchiverse` for existing RH soft-launch) in `gameLeaderboardConfig` + rules fixtures so session + ensure work. Deploy Aarcade before production mint.
