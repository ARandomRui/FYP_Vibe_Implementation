import os
import pygame

def configure():
    pygame.init()
    # Dummy window to allow image loading
    pygame.display.set_mode((1, 1), pygame.HIDDEN)
    
    img = pygame.image.load("assets/sprite.png")
    width = img.get_width()
    
    print(f"Detected sprite sheet width: {width}")
    
    if width > 2000:
        print("Configuring for Native HDPI (2x scale)...")
        settings_content = """# settings.py
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
SPRITE_COORDS = {
    "dino_idle": (80, 8, 88, 94),
    "dino_jump": (1696, 8, 88, 94),
    "dino_run_1": (1872, 8, 88, 94),
    "dino_run_2": (1960, 8, 88, 94),
    "dino_dead": (2048, 8, 88, 94),
    "dino_duck_1": (2224, 38, 118, 64),
    "dino_duck_2": (2342, 38, 118, 64),
    "ground": (4, 108, 2400, 24),
    "cloud": (172, 4, 92, 28),
    "cactus_small": (456, 4, 34, 70),
    "cactus_small_double": (490, 4, 68, 70),
    "cactus_small_triple": (558, 4, 102, 70),
    "cactus_large": (664, 4, 50, 100),
    "cactus_large_double": (714, 4, 100, 100),
    "cactus_large_triple": (814, 4, 150, 100),
    "ptera_1": (268, 4, 92, 80),
    "ptera_2": (360, 4, 92, 80),
    "game_over": (1310, 30, 382, 22),
    "restart_button": (4, 4, 72, 64)
}
"""
        with open("settings.py", "w") as f:
            f.write(settings_content)
    else:
        print("Configuring for Standard LDPI (1x scale)...")
        settings_content = """# settings.py
SCREEN_WIDTH = 600
SCREEN_HEIGHT = 150
FPS = 60
GRAVITY = 0.6
INITIAL_JUMP_VELOCITY = -10
STARTING_SPEED = 6
MAX_SPEED = 13
ACCELERATION = 0.001
BG_COLOR_DAY = (255, 255, 255)
BG_COLOR_NIGHT = (32, 33, 36)
TEXT_COLOR = (83, 83, 83)
SPRITE_COORDS = {
    "dino_idle": (40, 4, 44, 47),
    "dino_jump": (848, 4, 44, 47),
    "dino_run_1": (936, 4, 44, 47),
    "dino_run_2": (980, 4, 44, 47),
    "dino_dead": (1024, 4, 44, 47),
    "dino_duck_1": (1112, 19, 59, 32),
    "dino_duck_2": (1171, 19, 59, 32),
    "ground": (2, 54, 1200, 12),
    "cloud": (86, 2, 46, 14),
    "cactus_small": (228, 2, 17, 35),
    "cactus_small_double": (245, 2, 34, 35),
    "cactus_small_triple": (279, 2, 51, 35),
    "cactus_large": (332, 2, 25, 50),
    "cactus_large_double": (357, 2, 50, 50),
    "cactus_large_triple": (407, 2, 75, 50),
    "ptera_1": (134, 2, 46, 40),
    "ptera_2": (180, 2, 46, 40),
    "game_over": (655, 15, 191, 11),
    "restart_button": (2, 2, 36, 32)
}
"""
        with open("settings.py", "w") as f:
            f.write(settings_content)

if __name__ == "__main__":
    configure()
