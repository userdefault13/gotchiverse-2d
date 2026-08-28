# Citaadel Towers and Walls Update

## Summary

Updated the Citaadel castle towers and walls with ALttP-style pixel art to replace placeholder graphics.

## Changes

### New Assets
- **`public/animations/tiles/citaadel_castle_towers.png`** - 512×64px tileset with 8 tiles
- **`public/animations/tiles/citaadel_castle_towers.json`** - Sprite atlas metadata
- **`public/animations/tiles/citaadel_castle_towers_NOTE.txt`** - Asset documentation

### Tileset Contents
The tileset includes:
1. **tower_corner_nw** - Northwest corner tower
2. **tower_corner_ne** - Northeast corner tower  
3. **tower_corner_sw** - Southwest corner tower
4. **tower_corner_se** - Southeast corner tower
5. **wall_horizontal** - Horizontal wall section with battlements
6. **wall_horizontal_alt** - Alternate horizontal wall section
7. **wall_vertical** - Vertical wall section
8. **wall_vertical_alt** - Alternate vertical wall section

### Tower Design
Each corner tower features:
- Stone block texture with mortar lines
- Castle battlements (crenellations) at the top
- Triangular magenta/purple roof (ALttP style)
- Small red flag on the peak
- Proper depth/shading for 16-bit look

### Wall Design
Walls feature:
- Matching stone texture
- Battlements along the top edge
- Proper highlights and shadows

### Code Integration
Updated `helpers/dungeonWalls.helper.ts` with:
- `CITAADEL_TOWERS_KEY`, `CITAADEL_TOWERS_PATH`, `CITAADEL_TOWERS_FRAME` constants
- `CitaadelTowerFrames` type definition
- `CitaadelTowerFrame` frame index mapping

## Usage

```typescript
import {
  CITAADEL_TOWERS_KEY,
  CITAADEL_TOWERS_PATH,
  CitaadelTowerFrame,
} from '@/helpers/dungeonWalls.helper';

// In Phaser scene preload:
this.load.atlas(
  CITAADEL_TOWERS_KEY,
  CITAADEL_TOWERS_PATH,
  '/animations/tiles/citaadel_castle_towers.json'
);

// To render a corner tower:
this.add.sprite(x, y, CITAADEL_TOWERS_KEY, CitaadelTowerFrame.towerCornerNW);

// To render a wall section:
this.add.sprite(x, y, CITAADEL_TOWERS_KEY, CitaadelTowerFrame.wallHorizontal);
```

## Generation Script

The tileset was generated using `generate_tower_tiles.py`, a Python script that:
- Uses Pillow (PIL) to draw procedural pixel art
- Creates stone textures with block patterns
- Draws battlements, roofs, and flags
- Exports both PNG sprite sheet and JSON atlas

## Visual Style

The art follows A Link to the Past (ALttP) castle aesthetic:
- 16-bit color palette
- Pixelated stone textures
- Purple/magenta tower roofs
- Red banner flags
- Proper depth and shading

## Integration Notes

The Citaadel currently uses SVG-based tower rendering via:
- `shared_code/data/maps/citaadel/svgs/tower*.svg`
- `shared_code/data/maps/citaadel/collisions/towers.json`
- `shared_code/data/maps/citaadel/collisions/walls.json`

To fully integrate these new tiles, the game rendering code would need to be updated to:
1. Load the `citaadel_castle_towers` atlas in the appropriate scene
2. Replace SVG tower rendering with sprite-based rendering
3. Update collision data if needed
4. Position towers using the frame indices from `CitaadelTowerFrame`

## Files Modified
- `helpers/dungeonWalls.helper.ts` - Added Citaadel tower constants and types
- `generate_tower_tiles.py` - New tileset generation script

## Files Added
- `public/animations/tiles/citaadel_castle_towers.png`
- `public/animations/tiles/citaadel_castle_towers.json`
- `public/animations/tiles/citaadel_castle_towers_NOTE.txt`
- `CITAADEL_TOWERS_UPDATE.md` (this file)

## Related Assets
- `public/animations/tiles/bazaar_castle_walls.*` - ALttP Hyrule Castle interior walls
- `public/animations/tiles/bazaar_hyrule_walls.*` - ALttP remapped walls
- `public/animations/tiles/bazaar_houses_walls.*` - ALttP house interior walls

All follow similar ALttP visual style for consistency across the game.
