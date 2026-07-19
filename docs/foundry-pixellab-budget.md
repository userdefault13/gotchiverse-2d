# Foundry PixelLab Budget

Hard cap: **500** images (API generations).

API images used: 18

API base: `https://api.pixellab.ai`

## Log

- PROBE create-image-pixflux schema check (1 gen)
- KEEP foundry_yield_node.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_desert_node.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_antenna.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_receiver.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_sparkworks.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_coreforge.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_remembrane.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_callspire.png (bucket=all) via https://api.pixellab.ai
- KEEP foundry_linkbreaker.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_salvage_antenna.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_salvage_dish.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_salvage_slag.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_pulsecore.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_motebank.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_netherlink.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_walk_ledger.png (bucket=all) via https://api.pixellab.ai
- KEEP icon_tithe.png (bucket=all) via https://api.pixellab.ai

## Notes

- Token/URL loaded from `.env` or `.env.example` (`PIXELLAB_API_TOKEN`, `PIXELLAB_API_URL`).
- Run: `node scripts/foundry/pixellab-generate.mjs --bucket nodes|antennas|machines|faction|ui|all`
