#!/usr/bin/env python3
"""
Create Tiled-compatible tileset images from the new citaadel_castle_towers atlas.
Replaces the old tower1-4.png files with updated versions using the new art.
"""
from PIL import Image
import os

def create_tileset_from_atlas():
    """
    Load the citaadel_castle_towers atlas and create tower tileset PNGs
    that match the expected structure for Tiled/Phaser tilemaps.
    """
    # Load the atlas
    atlas_path = 'public/animations/tiles/citaadel_castle_towers.png'
    atlas = Image.open(atlas_path)
    
    tile_size = 64
    
    # Extract individual tiles from atlas (8 tiles in a row)
    tiles = []
    for i in range(8):
        x = i * tile_size
        tile = atlas.crop((x, 0, x + tile_size, tile_size))
        tiles.append(tile)
    
    # Tower tileset dimensions (matching existing structure - roughly square grids)
    # tower1: 924x660 = ~14x10 tiles
    # tower2: 1188x792 = ~18x12 tiles  
    # tower3: 1584x1188 = ~24x18 tiles
    # tower4: 1452x1320 = ~22x20 tiles
    
    # Create tower1 tileset (14x10 tiles = 896x640)
    tower1_width, tower1_height = 14, 10
    tower1 = Image.new('RGBA', (tower1_width * tile_size, tower1_height * tile_size), (0, 0, 0, 0))
    
    # Fill with various tower and wall tiles
    tile_idx = 0
    for ty in range(tower1_height):
        for tx in range(tower1_width):
            # Use different tiles for visual variety
            if tx == 0 and ty == 0:
                tile_to_use = tiles[0]  # NW corner tower
            elif tx == tower1_width-1 and ty == 0:
                tile_to_use = tiles[1]  # NE corner tower
            elif tx == 0 and ty == tower1_height-1:
                tile_to_use = tiles[2]  # SW corner tower
            elif tx == tower1_width-1 and ty == tower1_height-1:
                tile_to_use = tiles[3]  # SE corner tower
            elif ty == 0 or ty == tower1_height-1:
                tile_to_use = tiles[4 if tx % 2 == 0 else 5]  # horizontal walls
            elif tx == 0 or tx == tower1_width-1:
                tile_to_use = tiles[6 if ty % 2 == 0 else 7]  # vertical walls
            else:
                tile_to_use = tiles[4]  # fill with walls
            
            tower1.paste(tile_to_use, (tx * tile_size, ty * tile_size))
    
    # Create tower2 tileset (18x12 tiles = 1152x768)
    tower2_width, tower2_height = 18, 12
    tower2 = Image.new('RGBA', (tower2_width * tile_size, tower2_height * tile_size), (0, 0, 0, 0))
    
    for ty in range(tower2_height):
        for tx in range(tower2_width):
            if tx == 0 and ty == 0:
                tile_to_use = tiles[0]
            elif tx == tower2_width-1 and ty == 0:
                tile_to_use = tiles[1]
            elif tx == 0 and ty == tower2_height-1:
                tile_to_use = tiles[2]
            elif tx == tower2_width-1 and ty == tower2_height-1:
                tile_to_use = tiles[3]
            elif ty == 0 or ty == tower2_height-1:
                tile_to_use = tiles[4 if tx % 2 == 0 else 5]
            elif tx == 0 or tx == tower2_width-1:
                tile_to_use = tiles[6 if ty % 2 == 0 else 7]
            else:
                tile_to_use = tiles[5]
            
            tower2.paste(tile_to_use, (tx * tile_size, ty * tile_size))
    
    # Create tower3 tileset (24x18 tiles = 1536x1152)
    tower3_width, tower3_height = 24, 18
    tower3 = Image.new('RGBA', (tower3_width * tile_size, tower3_height * tile_size), (0, 0, 0, 0))
    
    for ty in range(tower3_height):
        for tx in range(tower3_width):
            if tx == 0 and ty == 0:
                tile_to_use = tiles[0]
            elif tx == tower3_width-1 and ty == 0:
                tile_to_use = tiles[1]
            elif tx == 0 and ty == tower3_height-1:
                tile_to_use = tiles[2]
            elif tx == tower3_width-1 and ty == tower3_height-1:
                tile_to_use = tiles[3]
            elif ty == 0 or ty == tower3_height-1:
                tile_to_use = tiles[4 if tx % 2 == 0 else 5]
            elif tx == 0 or tx == tower3_width-1:
                tile_to_use = tiles[6 if ty % 2 == 0 else 7]
            else:
                tile_to_use = tiles[6]
            
            tower3.paste(tile_to_use, (tx * tile_size, ty * tile_size))
    
    # Create tower4 tileset (22x20 tiles = 1408x1280)
    tower4_width, tower4_height = 22, 20
    tower4 = Image.new('RGBA', (tower4_width * tile_size, tower4_height * tile_size), (0, 0, 0, 0))
    
    for ty in range(tower4_height):
        for tx in range(tower4_width):
            if tx == 0 and ty == 0:
                tile_to_use = tiles[0]
            elif tx == tower4_width-1 and ty == 0:
                tile_to_use = tiles[1]
            elif tx == 0 and ty == tower4_height-1:
                tile_to_use = tiles[2]
            elif tx == tower4_width-1 and ty == tower4_height-1:
                tile_to_use = tiles[3]
            elif ty == 0 or ty == tower4_height-1:
                tile_to_use = tiles[4 if tx % 2 == 0 else 5]
            elif tx == 0 or tx == tower4_width-1:
                tile_to_use = tiles[6 if ty % 2 == 0 else 7]
            else:
                tile_to_use = tiles[7]
            
            tower4.paste(tile_to_use, (tx * tile_size, ty * tile_size))
    
    # Save the new tilesets
    output_dir = 'public/maps/sprites'
    
    # Back up originals
    for i in range(1, 5):
        orig = f'{output_dir}/tower{i}.png'
        backup = f'{output_dir}/tower{i}_old.png'
        if os.path.exists(orig) and not os.path.exists(backup):
            os.rename(orig, backup)
            print(f'Backed up {orig} -> {backup}')
    
    tower1.save(f'{output_dir}/tower1.png')
    print(f'Created {output_dir}/tower1.png ({tower1_width}x{tower1_height} tiles)')
    
    tower2.save(f'{output_dir}/tower2.png')
    print(f'Created {output_dir}/tower2.png ({tower2_width}x{tower2_height} tiles)')
    
    tower3.save(f'{output_dir}/tower3.png')
    print(f'Created {output_dir}/tower3.png ({tower3_width}x{tower3_height} tiles)')
    
    tower4.save(f'{output_dir}/tower4.png')
    print(f'Created {output_dir}/tower4.png ({tower4_width}x{tower4_height} tiles)')
    
    print('\nDone! Tower tilesets updated with new ALttP-style art.')
    print('The old files have been backed up as tower*_old.png')

if __name__ == '__main__':
    create_tileset_from_atlas()
