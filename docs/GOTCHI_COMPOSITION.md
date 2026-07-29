# Gotchi Composition — Query as 2D Asset Hub

AavegotchiQuerey is the source of truth for **Aavegotchi 2D SVG parts**. Downstream tools (Aseprite Paint, Unity, etc.) should download the JSON library and follow the same resolve/layer contract.

## Compose entry modes

| Mode | Inputs | Path |
|------|--------|------|
| **Manual (Composer tab)** | Haunt, collateral, traits `[NRG,AGG,SPK,BRN,EYS,EYC]`, wearables slots 0–7 | Offline library + on-chain `previewSideAavegotchi` compare |
| **Wallet (Gallery → Stage)** | Connected wallet → tokenId → `getAavegotchi` | Live contract SVG (Stage); can later preload Composer |
| **Download library** | Static files under `/data/*.json` | Same fragments used by Composer |

## Composer tab

Nav: **Gallery | Composer**. Composer does **not** require a wallet.

1. Select haunt (1 = ma*, 2 = am*), collateral, trait sliders, wearable slots.
2. **Compose & Compare** runs:
   - `composeAllViews()` from [`src/utils/composeGotchi.js`](src/utils/composeGotchi.js) using `/data` JSON
   - `previewSideAavegotchi(haunt, collateral, traits, wearables)` via RPC
3. Results (per Front/Left/Right/Back): rendered SVG + expandable inline SVG source for **library** and **on-chain**.

## JSON library (`data/` → served as `/data/`)

| File | Role |
|------|------|
| `aavegotchi_db_main.json` | Body, hands, mouth_*, eyes_*, shadow fragments |
| `aavegotchi_db_collaterals_haunt{1,2}.json` | Colors, collateral logos, collateral eye shapes |
| `aavegotchi_db_eye_shapes_haunt{1,2}.json` | Eye shape by EYS range |
| `aavegotchi_db_wearables.json` | Wearable metadata + `svgs[4]` + sleeves + offsets |
| `aavegotchi_db_rarity.json` | Eye-color rarity bands (reference) |
| `collateral_colors.json` | Hex lookup |

Repo copies of these files live in `data/`. Vite serves the compose bundle from `public/data/`.

**Download for offline tools:** copy `public/data/` (or `data/` for the same filenames). Paint’s `JSONs/` should stay in sync with this tree — Query owns the SoT.

## Canonical compose input

```text
hauntId              1 | 2
collateralType       address (preferred) or name key
numericTraits[6]     NRG, AGG, SPK, BRN, EYS, EYC   (0–99)
equippedWearables[16] slots 0–7 used; rest 0
```

Wearable slots: `0 Body, 1 Face, 2 Eyes, 3 Head, 4 Left Hand, 5 Right Hand, 6 Pet, 7 Background`.

## Layer order (library compose)

1. CSS style (primary / secondary / cheek / eyeColor / hand pose display)
2. Background wearable (slot 7)
3. Body
4. Eyes (skipped on Back; EYS ≥ 98 → collateral eye shapes)
5. Collateral logo (skipped on Back)
6. Hands (open vs closed via CSS when body wearable equipped)
7. Wearables 0→6 (+ sleeves after body)
8. Shadow when not already in body fragment

## Key modules

| Piece | Location |
|-------|----------|
| Library load + compose | [`src/utils/composeGotchi.js`](src/utils/composeGotchi.js) |
| Composer UI | [`src/components/Composer.vue`](src/components/Composer.vue) |
| Contract RPC | [`src/utils/contract.js`](src/utils/contract.js) |
| Legacy Stage recompose | [`src/components/Stage.vue`](src/components/Stage.vue) `buildSvgFromParts` |
| Contract part extraction guide | [`QUERYING_BASE_GOTCHI_PARTS.md`](QUERYING_BASE_GOTCHI_PARTS.md) |

## As-is vs other repos

**Query (this repo):** SVG string composition from JSON; on-chain preview for parity.

**Aseprite-AavegotchiPaaint:** Stacks pre-rasterized `.aseprite` layers (or JSON→SVG→pixel). Should consume Query’s `/data` library and match this layer order when adding wearables. See Paint `RUN_COMPOSER.md`.

## Follow-ups

- “Load from my gotchi” into Composer when wallet connected
- Zip download button for the library bundle
- Tighten library parity (side mouths, back collateral, RH mirror) against on-chain SVG
- Paint Lua consumer of the same resolve API
