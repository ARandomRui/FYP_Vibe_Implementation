# settings.py
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
