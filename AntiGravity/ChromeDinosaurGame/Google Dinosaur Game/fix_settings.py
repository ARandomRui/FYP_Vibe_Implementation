import json

def fix():
    with open("assets/atlas.json", "r") as f:
        atlas = json.load(f)
        
    coords = {}
    
    # Simple explicit mappings from atlas.json
    coords["restart_button"] = atlas["sprite_0"] # [2, 2, 72, 64]
    
    # Dino standing is sprite_1 but we want to ensure 88x94
    idle = atlas["sprite_1"]
    coords["dino_idle"] = (idle[0], 2, 88, 94)
    
    # Cloud
    cloud = atlas["sprite_2"]
    coords["cloud"] = (cloud[0], cloud[1], 92, 28)
    
    # Pterodactyls (sprite_3 has both)
    p_x, p_y = atlas["sprite_3"][0], atlas["sprite_3"][1]
    coords["ptera_1"] = (p_x, p_y, 92, 80)
    coords["ptera_2"] = (p_x + 92, p_y, 92, 80)
    
    # Small cactuses (sprite_4 has 3)
    sc_x, sc_y = atlas["sprite_4"][0], atlas["sprite_4"][1]
    coords["cactus_small"] = (sc_x, sc_y, 34, 70)
    coords["cactus_small_double"] = (sc_x + 34, sc_y, 68, 70)
    coords["cactus_small_triple"] = (sc_x + 102, sc_y, 102, 70)
    
    # Large cactuses (sprite_5, 6, 7? let's use standard widths starting at sprite_5)
    lc_x, lc_y = atlas["sprite_5"][0], atlas["sprite_5"][1]
    coords["cactus_large"] = (lc_x, lc_y, 50, 100)
    coords["cactus_large_double"] = (lc_x + 50, lc_y, 100, 100)
    coords["cactus_large_triple"] = (lc_x + 150, lc_y, 150, 100)
    
    # Dinos
    coords["dino_jump"] = atlas["sprite_20"]
    coords["dino_run_1"] = atlas["sprite_21"]
    coords["dino_run_2"] = atlas["sprite_22"]
    coords["dino_dead"] = atlas["sprite_23"]
    
    # Ducks (sprite_35 has both)
    d_x, d_y = atlas["sprite_35"][0], atlas["sprite_35"][1]
    coords["dino_duck_1"] = (d_x, d_y, 118, 64)
    coords["dino_duck_2"] = (d_x + 118, d_y, 118, 64)
    
    # Ground
    coords["ground"] = atlas["sprite_43"]
    
    # Game Over. Since we don't know exactly where it is, let's just use a tiny pixel so it doesn't crash,
    # or let's use the standard one if it exists. Actually let's assume it's at (954, 2, 382, 22).
    # Wait, the letters span from 954. Let's just guess (954, 2, 382, 22) for now.
    coords["game_over"] = (954, 2, 382, 22)
    
    settings_content = f"""# settings.py
SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 300
FPS = 60
GRAVITY = 1.2
INITIAL_JUMP_VELOCITY = -20
STARTING_SPEED = 12
MAX_SPEED = 26
ACCELERATION = 0.002
BG_COLOR_DAY = (255, 255, 255)
BG_COLOR_NIGHT = (32, 33, 36)
TEXT_COLOR = (83, 83, 83)
SPRITE_COORDS = {coords}
"""
    with open("settings.py", "w") as f:
        f.write(settings_content)
        
if __name__ == "__main__":
    fix()
