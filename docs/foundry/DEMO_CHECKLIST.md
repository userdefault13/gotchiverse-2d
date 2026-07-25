# Hybrid Grid Foundry — Filmable Demo Checklist

Feature flag: `NEXT_PUBLIC_ENABLE_FOUNDRY_POC=true` or `GAME_CONFIG.enableParcelFoundryPoC`.

## Setup

1. `yarn install --frozen-lockfile && cp .env.example .env`
2. Ensure `NEXT_PUBLIC_ENABLE_FOUNDRY_POC=true`
3. Colyseus: run gotchiverse-realm-server with foundry handlers, set `NEXT_PUBLIC_NETCODE=colyseus` and `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_COLYSEUS_URL`
4. `yarn dev` → open play scene

## Script (vein → material → recipe → place)

1. **Channel** on owned Citaadel parcel Aaltar → FoundryPanel **Pollution** ticks up.
2. Open FoundryPanel → Netherlink **BLACK**, materials empty, Walk Ledger hint.
3. Gather at **Yield Fields** (~320000,140000) → **Cargo** alchemica (craft power). Mineral/gas veins do **not** drip alchemica.
4. Gather mineral veins near old desert (materials only):
   - **Iron** (~180000,120000) → ironOre
   - **Copper** (~195000,125000) → copperOre
   - **Aluminum** (~165000,135000) → aluminumOre
   - **Cobalt** (~210000,110000) → cobaltOre
5. Gather gases (materials only):
   - **Methane Vent** (~150000,150000) → methane
   - **Noxious Vent** (~160000,160000) → noxiousGas
5b. Kill **Link-breaker** scouts near those nodes (click enemy or Interact Nearby) → random alchemica cargo drop on death; they respawn after ~45s.
6. Craft chain (each step spends alchemica **power**):
   - Smelt steel / copper / aluminum / cobalt
   - Draw wire, cut fasteners, stamp screws
   - Spin dish frame, wind antenna core
   - **Assemble Antenna Relay** → `antennaRelay += 1`
7. **Place Antenna** (requires antennaRelay) toward **South Rim Receiver** (~270000,230000) → Netherlink **GREEN/AMBER**.
8. With cargo, **Mesh Transfer** → tithe increases while spine is live.
9. Optional: Recipe Book **page 2** shows same logistics recipes; Item Shop **Antenna Relay Kit** spends materials + power for +1 relay.
10. **Link-breaker Raid** → mesh fails → Walk Ledger / walk deposit still works.

## Art

- Placeholders: `public/animations/*/foundry/`
- PixelLab: `node scripts/foundry/pixellab-generate.mjs --bucket nodes|recipes` (budget in `docs/foundry-pixellab-budget.md`)

## Lore / server mirrors

- Lore: `docs/foundry/lore/`
- Realm-server patch (legacy): `docs/foundry/realm-server-patch/` — prefer live `gotchiverse-realm-server` main
