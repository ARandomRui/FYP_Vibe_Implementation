import pygame
import sys

def analyze():
    pygame.init()
    screen = pygame.display.set_mode((1, 1), pygame.HIDDEN)
    
    bg_color = (64, 200, 200, 255) # #40c8c8 
    
    files = ["assets/sprite.png", "assets/sprite2.png", "assets/sprite3.png", "assets/sprite4.png"]
    
    for f in files:
        print(f"\n--- {f} ---")
        try:
            img = pygame.image.load(f).convert_alpha()
        except:
            continue
            
        # Create a mask of all pixels that are NOT the bg_color
        # We can do this by creating a surface of bg_color, getting a mask of it, and inverting it?
        # Faster: threshold.
        # But pygame masks are based on alpha. 
        # So we can set the colorkey to bg_color, and then get a mask.
        img.set_colorkey((64, 200, 200))
        mask = pygame.mask.from_surface(img)
        rects = mask.get_bounding_rects()
        
        # Sort by y, then x
        rects.sort(key=lambda r: (r.y // 20, r.x))
        
        filtered = [r for r in rects if r.width * r.height > 50]
        
        for i, r in enumerate(filtered):
            print(f"Sprite {i}: x={r.x}, y={r.y}, w={r.width}, h={r.height}")

if __name__ == "__main__":
    analyze()
