# Foundry PixelLab Budget

Hard cap: **500** images (API generations).

API images used: 0

## Local placeholders (do not count)

Procedural 64×64 / 32×32 PNG sheets generated into:

- `public/animations/spritesheets/foundry/`
- `public/animations/installations/foundry/`

These cover demo-critical wild nodes, antennas, receiver, machines, link-breaker, and UI icons until `PIXELLAB_API_TOKEN` is available.

## Budget allocation (plan)

| Bucket | Cap | Status |
|--------|-----|--------|
| Wild nodes | 80 | placeholders ready; API pending |
| Antenna Spine | 100 | placeholders ready; API pending |
| Foundry machines | 120 | placeholders ready; API pending |
| Faction / raid | 80 | placeholders ready; API pending |
| UI / cargo icons | 60 | placeholders ready; API pending |
| Reserve | 60 | unused |

## Replace with PixelLab

```bash
export PIXELLAB_API_TOKEN=...
node scripts/foundry/pixellab-generate.mjs --bucket nodes
node scripts/foundry/pixellab-generate.mjs --bucket antennas
node scripts/foundry/pixellab-generate.mjs --bucket machines
node scripts/foundry/pixellab-generate.mjs --bucket faction
```

## Log

- BOOTSTRAP: local procedural sheets written (API used 0)
