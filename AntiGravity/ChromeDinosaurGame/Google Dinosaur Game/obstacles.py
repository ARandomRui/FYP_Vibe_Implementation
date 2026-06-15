import pygame
import random
from settings import SCREEN_WIDTH, SCREEN_HEIGHT

class Obstacle(pygame.sprite.Sprite):
    # Why is this implemented: Base class for moving entities that the player must avoid.
    # Handles common leftward movement and memory cleanup when off-screen to prevent memory leaks.
    def __init__(self, image, x, y):
        super().__init__()
        self.image = image
        self.rect = self.image.get_rect()
        self.rect.x = x
        self.rect.y = y
        # Make hitbox slightly smaller for fair gameplay
        self.hitbox = self.rect.inflate(-10, -10)

    def update(self, speed):
        # Why: Moves the obstacle to the left relative to game speed and updates the internal hitbox.
        self.rect.x -= speed
        self.hitbox.center = self.rect.center
        
        # De-allocate sprite if it leaves the screen
        if self.rect.right < 0:
            self.kill()

class Cactus(Obstacle):
    # Why is this implemented: Represents static ground obstacles of varying sizes.
    def __init__(self, asset_manager):
        # Randomly choose a cactus type
        cactus_types = [
            "cactus_small", "cactus_small_double", "cactus_small_triple",
            "cactus_large", "cactus_large_double", "cactus_large_triple"
        ]
        choice = random.choice(cactus_types)
        image = asset_manager.get_sprite(choice)
        
        # Align bottom of cactus to the ground level
        y = SCREEN_HEIGHT - int(40 * (SCREEN_HEIGHT / 300)) - image.get_height()
        super().__init__(image, SCREEN_WIDTH + 50, y)

class Pterodactyl(Obstacle):
    # Why is this implemented: Represents flying obstacles that require jumping or ducking.
    def __init__(self, asset_manager):
        self.frames = [
            asset_manager.get_sprite("ptera_1"),
            asset_manager.get_sprite("ptera_2")
        ]
        self.current_frame = 0
        
        # Spawn at 3 different heights: low (requires jump), mid (requires duck), high (run under)
        scale = SCREEN_HEIGHT / 300
        heights = [SCREEN_HEIGHT - int(90 * scale), SCREEN_HEIGHT - int(150 * scale), SCREEN_HEIGHT - int(200 * scale)]
        y = random.choice(heights)
        
        super().__init__(self.frames[0], SCREEN_WIDTH + 50, y)
        self.animation_timer = 0
        
        # Hitbox for ptera is much flatter than visual sprite
        self.hitbox = self.rect.inflate(int(-30 * scale), int(-40 * scale))

    def update(self, speed):
        # Why: Overrides update to include wing-flapping animation alongside movement.
        # Pterodactyls move slightly faster than the ground speed.
        super().update(speed + 1.5)
        
        self.animation_timer += 1
        if self.animation_timer >= 12:
            self.animation_timer = 0
            self.current_frame = (self.current_frame + 1) % len(self.frames)
            self.image = self.frames[self.current_frame]
