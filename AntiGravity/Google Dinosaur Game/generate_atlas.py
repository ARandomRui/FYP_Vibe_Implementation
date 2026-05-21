import pygame
import json
import os

def generate_atlas():
    pygame.init()
    # Dummy window to allow image loading
    pygame.display.set_mode((1, 1), pygame.HIDDEN)
    
    sprite_path = "assets/sprite.png"
    if not os.path.exists(sprite_path):
        print(f"Error: {sprite_path} not found.")
        return
        
    img = pygame.image.load(sprite_path).convert_alpha()
    
    # The official sprite sheet usually has a transparent background or white.
    # Let's check the top-left pixel
    bg_color = img.get_at((0, 0))
    print(f"Detected background color: {bg_color}")
    
    # If the background is solid (alpha 255), set it as the colorkey to generate the mask
    if bg_color[3] == 255:
        img.set_colorkey(bg_color)
        
    mask = pygame.mask.from_surface(img)
    rects = mask.get_bounding_rects()
    
    # Filter out tiny noise artifacts (like 1x1 pixels)
    valid_rects = [r for r in rects if r.width > 3 and r.height > 3]
    
    # Sort them primarily left-to-right, then top-to-bottom
    valid_rects.sort(key=lambda r: (r.y // 20, r.x))
    
    atlas_data = {}
    
    # To help identify, let's also save a debug image where each box is drawn
    debug_img = img.copy()
    if bg_color[3] == 255:
        debug_img.fill((0, 255, 0)) # Green background to see clearly
        debug_img.blit(img, (0, 0))
        
    font = pygame.font.SysFont(None, 14)
    
    for i, r in enumerate(valid_rects):
        name = f"sprite_{i}"
        atlas_data[name] = [r.x, r.y, r.width, r.height]
        
        # Draw red bounding box
        pygame.draw.rect(debug_img, (255, 0, 0), r, 1)
        # Draw ID text
        text = font.render(str(i), True, (0, 0, 255))
        debug_img.blit(text, (r.x, r.y - 12 if r.y > 12 else r.y))
        
    # Save the atlas dictionary
    with open("assets/atlas.json", "w") as f:
        json.dump(atlas_data, f, indent=4)
        
    # Save the visual debug map
    pygame.image.save(debug_img, "assets/atlas_debug.png")
    
    print(f"Successfully found {len(valid_rects)} sprites.")
    print("Saved 'assets/atlas.json' and 'assets/atlas_debug.png'.")

if __name__ == "__main__":
    generate_atlas()
