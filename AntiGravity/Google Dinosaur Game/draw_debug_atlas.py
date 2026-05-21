import pygame
import json
import sys
import os

# We need to import settings to get SPRITE_COORDS
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from settings import SPRITE_COORDS

def generate_debug_image():
    pygame.init()
    pygame.display.set_mode((1, 1), pygame.HIDDEN)
    
    try:
        img = pygame.image.load("assets/sprite.png").convert_alpha()
    except Exception as e:
        print(f"Error loading image: {e}")
        return
        
    # Create a surface with a green background to see transparency easily
    debug_surface = pygame.Surface(img.get_size(), pygame.SRCALPHA)
    debug_surface.fill((0, 255, 0, 100)) # Semi-transparent green
    debug_surface.blit(img, (0, 0))
    
    # Setup font
    font = pygame.font.SysFont(None, 16)
    
    # Draw boxes
    for name, coords in SPRITE_COORDS.items():
        x, y, w, h = coords
        rect = pygame.Rect(x, y, w, h)
        
        # Draw red border
        pygame.draw.rect(debug_surface, (255, 0, 0, 255), rect, 2)
        
        # Draw text with outline for visibility
        text_surf = font.render(name, True, (255, 255, 255))
        # Black background for text
        text_bg = pygame.Surface(text_surf.get_size())
        text_bg.fill((0, 0, 0))
        text_bg.blit(text_surf, (0, 0))
        
        # Place text slightly above or below
        text_y = y - 15
        if text_y < 0:
            text_y = y + h + 2
            
        debug_surface.blit(text_bg, (x, text_y))
        
    output_path = os.path.abspath("assets/atlas_debug_boxes.png")
    pygame.image.save(debug_surface, output_path)
    print(f"Success! Saved to {output_path}")

if __name__ == "__main__":
    generate_debug_image()
