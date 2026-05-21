from PIL import Image

def get_bounding_boxes(image_path, bg_color):
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    pixels = img.load()
    
    # Simple connected components / flood fill to find disjoint sprites
    visited = set()
    boxes = []
    
    for y in range(height):
        for x in range(width):
            if pixels[x, y] != bg_color and (x, y) not in visited:
                # Start flood fill
                q = [(x, y)]
                min_x, min_y = x, y
                max_x, max_y = x, y
                
                while q:
                    cx, cy = q.pop(0)
                    if (cx, cy) in visited:
                        continue
                    visited.add((cx, cy))
                    
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    
                    # check neighbors
                    for nx, ny in [(cx-1, cy), (cx+1, cy), (cx, cy-1), (cx, cy+1), (cx-1, cy-1), (cx+1, cy+1), (cx-1, cy+1), (cx+1, cy-1)]:
                        if 0 <= nx < width and 0 <= ny < height:
                            if (nx, ny) not in visited and pixels[nx, ny] != bg_color:
                                q.append((nx, ny))
                                
                boxes.append({
                    'x': min_x, 'y': min_y, 
                    'w': max_x - min_x + 1, 'h': max_y - min_y + 1,
                    'area': (max_x - min_x + 1) * (max_y - min_y + 1)
                })
                
    # Sort boxes by y then x
    boxes.sort(key=lambda b: (b['y'] // 10, b['x']))
    return boxes

def analyze_sprites():
    bg_color = (64, 200, 200) # #40c8c8 in RGB
    
    print("--- sprite.png (Dinos) ---")
    dino_boxes = get_bounding_boxes("assets/sprite.png", bg_color)
    # Filter out very small noise like dust
    dino_boxes = [b for b in dino_boxes if b['area'] > 50]
    for i, b in enumerate(dino_boxes):
        print(f"Box {i}: {b}")
        
    print("\n--- sprite2.png (Birds, Cacti) ---")
    obj_boxes = get_bounding_boxes("assets/sprite2.png", bg_color)
    obj_boxes = [b for b in obj_boxes if b['area'] > 50]
    for i, b in enumerate(obj_boxes):
        print(f"Box {i}: {b}")

if __name__ == "__main__":
    analyze_sprites()
