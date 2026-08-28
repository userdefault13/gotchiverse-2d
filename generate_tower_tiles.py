#!/usr/bin/env python3
"""
Generate ALttP-style castle tower and wall tiles for the Citaadel.
Creates a proper tileset with stone textures, battlements, and proper tower tops.
"""
from PIL import Image, ImageDraw
import json
import os

# ALttP-inspired castle palette
PALETTE = {
    'stone_dark': (88, 88, 104),
    'stone_mid': (136, 136, 152),
    'stone_light': (184, 184, 200),
    'stone_highlight': (224, 224, 232),
    'roof_dark': (136, 40, 120),  # magenta/purple for roof
    'roof_mid': (184, 72, 160),
    'roof_light': (216, 120, 192),
    'flag_red': (200, 32, 32),
    'window_dark': (24, 24, 40),
    'mortar': (64, 64, 72),
}

def draw_stone_texture(draw, x, y, w, h, palette):
    """Draw a stone texture with blocks"""
    # Base fill
    draw.rectangle([x, y, x+w-1, y+h-1], fill=palette['stone_mid'])
    
    # Mortar lines for stone blocks
    block_h = 8
    for by in range(0, h, block_h):
        draw.line([x, y+by, x+w-1, y+by], fill=palette['mortar'], width=1)
        # Offset every other row
        offset = 16 if (by // block_h) % 2 == 0 else 0
        for bx in range(offset, w, 32):
            draw.line([x+bx, y+by, x+bx, y+min(by+block_h, h)-1], fill=palette['mortar'], width=1)
    
    # Add highlights
    for by in range(0, h, block_h):
        offset = 16 if (by // block_h) % 2 == 0 else 0
        for bx in range(offset, w, 32):
            if bx+2 < w and by+2 < h:
                draw.line([x+bx+2, y+by+2, x+bx+10, y+by+2], fill=palette['stone_light'], width=1)
                draw.line([x+bx+2, y+by+2, x+bx+2, y+by+6], fill=palette['stone_light'], width=1)

def draw_battlement(draw, x, y, width, palette):
    """Draw castle battlement crenellations"""
    merlon_width = 8
    gap_width = 8
    height = 12
    
    # Base
    draw.rectangle([x, y, x+width-1, y+height-1], fill=palette['stone_mid'])
    
    # Crenellations
    for cx in range(0, width, merlon_width + gap_width):
        # Merlon (solid part)
        draw.rectangle([x+cx, y, x+cx+merlon_width-1, y+height-1], fill=palette['stone_mid'])
        draw.line([x+cx, y, x+cx, y+height-1], fill=palette['stone_light'], width=1)
        draw.line([x+cx, y, x+cx+merlon_width-1, y], fill=palette['stone_light'], width=1)
        draw.line([x+cx+merlon_width-1, y, x+cx+merlon_width-1, y+height-1], fill=palette['stone_dark'], width=1)

def draw_tower_base(draw, x, y, width, height, palette):
    """Draw a tower base with stone texture"""
    draw_stone_texture(draw, x, y, width, height, palette)
    
    # Add corner highlights/shadows for depth
    draw.line([x, y, x, y+height-1], fill=palette['stone_light'], width=2)
    draw.line([x+width-1, y, x+width-1, y+height-1], fill=palette['stone_dark'], width=2)

def draw_tower_roof(draw, x, y, width, palette):
    """Draw a triangular tower roof"""
    height = 24
    points = [
        (x, y+height),  # bottom left
        (x+width//2, y),  # top center
        (x+width-1, y+height),  # bottom right
    ]
    
    # Dark side
    draw.polygon([points[0], points[1], (x+width//2, y+height)], fill=palette['roof_dark'])
    # Light side
    draw.polygon([points[1], points[2], (x+width//2, y+height)], fill=palette['roof_mid'])
    # Outline
    draw.line([points[0], points[1]], fill=palette['roof_dark'], width=1)
    draw.line([points[1], points[2]], fill=palette['roof_light'], width=1)

def draw_small_flag(draw, x, y, palette):
    """Draw a small red flag on top of tower"""
    # Pole
    draw.line([x, y, x, y+8], fill=palette['stone_dark'], width=1)
    # Flag
    draw.rectangle([x+1, y, x+5, y+4], fill=palette['flag_red'])

def create_corner_tower(size=64):
    """Create a proper corner tower with stone, battlements, roof, and flag"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    tower_width = 48
    tower_x = (size - tower_width) // 2
    
    # Tower base (stone body)
    base_height = 36
    draw_tower_base(draw, tower_x, size-base_height, tower_width, base_height, PALETTE)
    
    # Battlement top
    draw_battlement(draw, tower_x, size-base_height-12, tower_width, PALETTE)
    
    # Roof
    draw_tower_roof(draw, tower_x, size-base_height-12-24, tower_width, PALETTE)
    
    # Flag on top
    draw_small_flag(draw, tower_x + tower_width//2, size-base_height-12-24-8, PALETTE)
    
    return img

def create_wall_section_horizontal(size=64):
    """Create a horizontal wall section"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    wall_height = 36
    wall_y = (size - wall_height) // 2
    
    # Wall body
    draw_stone_texture(draw, 0, wall_y, size, wall_height, PALETTE)
    
    # Battlement on top
    draw_battlement(draw, 0, wall_y-12, size, PALETTE)
    
    return img

def create_wall_section_vertical(size=64):
    """Create a vertical wall section"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    wall_width = 36
    wall_x = (size - wall_width) // 2
    
    # Wall body
    draw_stone_texture(draw, wall_x, 0, wall_width, size, PALETTE)
    
    # Add side battlements
    for y in range(8, size, 24):
        draw.rectangle([wall_x-4, y, wall_x, y+12], fill=PALETTE['stone_mid'])
        draw.line([wall_x-4, y, wall_x, y], fill=PALETTE['stone_light'], width=1)
    
    return img

def create_tileset():
    """Create a complete tower and wall tileset"""
    tile_size = 64
    tiles_per_row = 8
    tile_names = [
        'tower_corner_nw',
        'tower_corner_ne', 
        'tower_corner_sw',
        'tower_corner_se',
        'wall_horizontal',
        'wall_horizontal_alt',
        'wall_vertical',
        'wall_vertical_alt',
    ]
    
    # Create tileset image
    num_tiles = len(tile_names)
    rows = (num_tiles + tiles_per_row - 1) // tiles_per_row
    tileset_width = tiles_per_row * tile_size
    tileset_height = rows * tile_size
    
    tileset = Image.new('RGBA', (tileset_width, tileset_height), (0, 0, 0, 0))
    
    frames = []
    
    for idx, name in enumerate(tile_names):
        row = idx // tiles_per_row
        col = idx % tiles_per_row
        x = col * tile_size
        y = row * tile_size
        
        # Generate tile based on name
        if 'tower_corner' in name:
            tile = create_corner_tower(tile_size)
        elif 'wall_horizontal' in name:
            tile = create_wall_section_horizontal(tile_size)
        elif 'wall_vertical' in name:
            tile = create_wall_section_vertical(tile_size)
        else:
            tile = Image.new('RGBA', (tile_size, tile_size), (0, 0, 0, 0))
        
        tileset.paste(tile, (x, y))
        
        # Create frame metadata
        frames.append({
            "filename": name,
            "frame": {"x": x, "y": y, "w": tile_size, "h": tile_size},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": tile_size, "h": tile_size},
            "sourceSize": {"w": tile_size, "h": tile_size}
        })
    
    return tileset, frames

def main():
    print("Generating ALttP-style castle tower and wall tileset...")
    
    # Create output directory
    output_dir = 'public/animations/tiles'
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate tileset
    tileset, frames = create_tileset()
    
    # Save PNG
    png_path = os.path.join(output_dir, 'citaadel_castle_towers.png')
    tileset.save(png_path)
    print(f"Saved tileset PNG: {png_path}")
    
    # Create JSON metadata
    json_data = {
        "frames": frames,
        "meta": {
            "app": "Generated by generate_tower_tiles.py",
            "version": "1.0",
            "image": "citaadel_castle_towers.png",
            "format": "RGBA8888",
            "size": {"w": tileset.width, "h": tileset.height},
            "scale": "1",
            "source": "ALttP-inspired castle towers for Citaadel"
        }
    }
    
    json_path = os.path.join(output_dir, 'citaadel_castle_towers.json')
    with open(json_path, 'w') as f:
        json.dump(json_data, f, indent=2)
    print(f"Saved tileset JSON: {json_path}")
    
    print("\nGenerated tiles:")
    for frame in frames:
        print(f"  - {frame['filename']}")
    
    print("\nDone! Tower and wall tiles ready for integration.")

if __name__ == '__main__':
    main()
