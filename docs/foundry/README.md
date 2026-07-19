# Hybrid Grid Foundry PoC

Citaadel parcels = baseload Alchemica Foundry. Wild Grid = richer veins + salvage. Haul home via **Walk Ledger**, **Bounce Freight**, or **Antenna Spine**.

## In this client

| Path | Role |
|------|------|
| `helpers/foundry/` | State, antenna graph, localStorage + Colyseus bridge |
| `components/phaser/FoundryNodes.ts` | World nodes, antennas, receiver, link VFX |
| `components/UI/hud/components/FoundryPanel/` | HUD meters + demo actions |
| `public/animations/*/foundry/` | Pixel art sheets (placeholders; PixelLab script ready) |
| `scripts/foundry/pixellab-generate.mjs` | PixelLab API generator (500-image budget) |
| `docs/foundry-pixellab-budget.md` | Budget tally |
| `docs/foundry/lore/` | Mirrored Hybrid lore + patches for Aavegotchi-Lore |
| `docs/foundry/realm-server-patch/` | Colyseus Foundry schemas patch for realm-server |
| `docs/foundry/DEMO_CHECKLIST.md` | Filmable acceptance script |

## Flags

- `GAME_CONFIG.enableParcelFoundryPoC`
- `NEXT_PUBLIC_ENABLE_FOUNDRY_POC=true`
- Colyseus: `NEXT_PUBLIC_NETCODE=colyseus` + `attachFoundryColyseusRoom(room)`

## External repos

Lore and realm-server commits were prepared locally; this environment can only push `gotchiverse-2d`. Apply:

```bash
# Lore
cd Aavegotchi-Lore && git am path/to/gotchiverse-2d/docs/foundry/lore/0001-*.patch

# Realm server
cd gotchiverse-realm-server && git am path/to/gotchiverse-2d/docs/foundry/realm-server-patch/0001-*.patch
```
