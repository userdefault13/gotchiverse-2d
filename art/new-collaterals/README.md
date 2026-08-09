# New collateral logos (from Aseprite, black / no bg)

Regenerated from `ase/*.aseprite` → `png15x12` → rect SVG fragments.

| Brand | Size | Notes |
|-------|------|-------|
| amazon | 15×4 | ok |
| apple | 10×12 | ok |
| disney | 13×12 | ok |
| gamestop | 14×11 | ok |
| microsoft | 11×11 | ok |
| nike | 15×6 | ok |
| nvidia | 15×10 | ok |
| spacex | 15×8 | ok |
| tesla | 18×11 | **w>15** |
| usoilfund | 9×15 | **h>12** |

## Files
- `ase/` — source Aseprite
- `png15x12/` — pure black transparent PNG
- `svg/<name>.svg` — native size rect SVG
- `svg/<name>_fragment.svg` — `<g>` only
- `svg/<name>_face64.svg` — centered in 64×64 face canvas
- `collaterals-logo-fragments.js` — CommonJS map of fragments
