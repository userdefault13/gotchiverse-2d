# Foundry PixelLab Budget

Hard cap: **500** images (API generations).

API images used: 18

API base: `https://api.pixellab.ai`

## Log

- FAIL recipe_antenna_relay.png: PixelLab 401: {"detail":"Invalid API token"}
- FAIL recipe_dish_assembly.png: PixelLab 401: {"detail":"Invalid API token"}

## Notes

- Token/URL loaded from `.env` or `.env.example` (`PIXELLAB_API_TOKEN`, `PIXELLAB_API_URL`).
- Run: `node scripts/foundry/pixellab-generate.mjs --bucket nodes|antennas|machines|faction|ui|recipes|all`
