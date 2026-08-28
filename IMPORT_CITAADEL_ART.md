# Import Citaadel Tower/Wall Art from Aseprite-Mappie

## Required Art Files (from Aseprite-Mappie build/)

The new Citaadel tower and wall art is located in the sibling Aseprite-Mappie repository under `build/` (gitignored):

### Source Files
- `build/towers_newski.png` - New tower sprites
- `build/towers_newski_sliced.png` - Sliced tower variants  
- `build/citadel_walls_combined.png` - Cycled north/west/east walls with towers, corners, and north gate
- `build/d43_tower_walls.aseprite` - Source Aseprite file
- `build/district_43_2x2_newski_towers_preview.png` - Preview of final look

### Art Description
- **Style**: Top-down purple/lavender citadel walls
- **Inner fills**: Cyan/teal color
- **Features**: Repeating mid-wall towers, corner pieces, north gate
- **Not**: Gray stone with pink triangle roofs (that was incorrectly generated)

## Integration Steps

### 1. Copy Art to gotchiverse-2d

```bash
# From Aseprite-Mappie directory:
cp build/towers_newski.png ../gotchiverse-2d/public/maps/sprites/
cp build/citadel_walls_combined.png ../gotchiverse-2d/public/maps/sprites/
```

### 2. Update Tower Tilesets

The game uses `tower1.png` through `tower4.png` in `public/maps/sprites/`. These need to be replaced with the new art from `towers_newski.png` or properly sliced versions.

Options:
- **A**: Slice `towers_newski.png` into tower1-4.png matching existing dimensions
- **B**: Update MapController to use new tileset names
- **C**: Create atlas from citadel_walls_combined.png and load as spritesheet

### 3. Current Game Structure

```typescript
// MapController.displayChunk() loads:
const tower1 = map.addTilesetImage('tower1', 'tower1');
const tower2 = map.addTilesetImage('tower2', 'tower2');
const tower3 = map.addTilesetImage('tower3', 'tower3');
const tower4 = map.addTilesetImage('tower4', 'tower4');

// Used in layers:
map.createLayer('tower_bottom', [tower1, tower2, tower3, tower4, ...], x, y)
map.createLayer('tower_top', [tower1, tower2, tower3, tower4, ...], x, y)
```

### 4. Dimensions

Current tower tilesets:
- tower1.png: 924×660 (14×10 tiles @ 64px)
- tower2.png: 1188×792 (18×12 tiles @ 64px)
- tower3.png: 1584×1188 (24×18 tiles @ 64px)
- tower4.png: 1452×1320 (22×20 tiles @ 64px)

New art needs to either:
- Match these dimensions, OR
- Be imported as different format with code changes

## Next Steps

1. **Copy art files** from Aseprite-Mappie build/ to gotchiverse-2d
2. **Determine format**: How is towers_newski.png structured?
3. **Convert/slice** if needed to match tower1-4 format
4. **Test** in-game rendering
5. **Push** to PR

## Notes

- The purple/cyan ski-themed citadel art is the correct visual direction
- Do NOT generate procedural gray/pink brick towers
- The art already exists in Aseprite-Mappie build/ directory
- Scripts exist: west_wall_cycled.py, north_wall_cycled.py, east_wall_cycled.py, build_newski_tower_sheet.py, citadel_wall_builder.py
