import pygame
import os
from settings import SPRITE_COORDS

class AssetManager:
    # Why is this implemented: To centralize the loading and parsing of the single sprite sheet.
    # It extracts individual sprites based on coordinates and manages image caching to save memory.
    
    def __init__(self):
        self.sheet = None
        self.sprites = {}

    def load_sprite_sheet(self, filepath):
        # Why: Loads the main image into memory once, preventing redundant disk I/O.
        try:
            self.sheet = pygame.image.load(filepath).convert_alpha()
        except pygame.error as e:
            print(f"Warning: Failed to load sprite sheet from {filepath}: {e}")
            # Fallback: create a dummy surface so the game doesn't crash completely.
            self.sheet = pygame.Surface((1200, 100))
            self.sheet.fill((255, 0, 255)) # Magenta for missing texture
            
        self._parse_sprites()

    def _parse_sprites(self):
        # Why: Iterates through defined coordinates in settings and crops out subsurfaces.
        for name, rect_tuple in SPRITE_COORDS.items():
            rect = pygame.Rect(*rect_tuple)
            image = pygame.Surface(rect.size, pygame.SRCALPHA).convert_alpha()
            
            # Check if the rect is within the bounds of the loaded sheet
            if self.sheet.get_width() >= rect.right and self.sheet.get_height() >= rect.bottom:
                image.blit(self.sheet, (0, 0), rect)
            else:
                # If coordinates exceed the image size, fill with a placeholder color
                image.fill((255, 0, 255)) 
                
            self.sprites[name] = image

    def get_sprite(self, name):
        # Why: Provides safe access to cached sprite surfaces.
        return self.sprites.get(name)
