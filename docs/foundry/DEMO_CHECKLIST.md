# Hybrid Grid Foundry — Filmable Demo Checklist

Feature flag: `NEXT_PUBLIC_ENABLE_FOUNDRY_POC=true` or `GAME_CONFIG.enableParcelFoundryPoC`.

## Setup

1. `yarn install --frozen-lockfile && cp .env.example .env`
2. Ensure `NEXT_PUBLIC_ENABLE_FOUNDRY_POC=true`
3. Optional Colyseus: apply `docs/foundry/realm-server-patch/0001-*.patch` to gotchiverse-realm-server, run server, set `NEXT_PUBLIC_NETCODE=colyseus` and `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_COLYSEUS_URL`
4. `yarn dev` → open play scene

## Script

1. **Channel** on owned Citaadel parcel Aaltar → FoundryPanel **Pollution** ticks up.
2. Open FoundryPanel → note Netherlink **BLACK**, Walk Ledger hint.
3. **Interact Nearby** / click **Yield Fields** node (or teleport camera to ~320000,140000) → gather wild Alchemica into Cargo.
4. Walk/teleport to **South Rim Receiver** (~270000,230000) → deposit → **Tithe** increases.
5. Gather at **DeFi Desert** for salvage → **Place Antenna** (click map ×3 toward receiver) → Netherlink turns **GREEN/AMBER**.
6. **Mesh Transfer** with cargo → tithe increases instantly while spine is live.
7. **Link-breaker Raid** → mid hop dies → mesh fails → Walk Ledger toast → walk deposit still works.
8. **Bounce Freight** with cargo → instant tithe (gate hop).

## Art

- Placeholders: `public/animations/*/foundry/`
- PixelLab replace: `PIXELLAB_API_TOKEN=... node scripts/foundry/pixellab-generate.mjs --bucket nodes` (budget log in `docs/foundry-pixellab-budget.md`)

## Lore / server mirrors

- Lore patch + docs: `docs/foundry/lore/`
- Realm-server patch: `docs/foundry/realm-server-patch/`
