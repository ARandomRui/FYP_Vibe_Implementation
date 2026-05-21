import pygame
import random
from settings import SCREEN_WIDTH, SCREEN_HEIGHT

class Ground:
    # Why is this implemented: Renders the scrolling ground. It uses two segments of the ground sprite
    # looping infinitely to create the illusion of endless movement.
    def __init__(self, asset_manager):
        self.image = asset_manager.get_sprite("ground")
        self.width = self.image.get_width()
        self.x1 = 0
        self.x2 = self.width
        self.y = SCREEN_HEIGHT - int(50 * (SCREEN_HEIGHT / 300))

    def update(self, speed):
        # Why: Moves the ground segments left and wraps them around when they go off screen.
        self.x1 -= speed
        self.x2 -= speed

        if self.x1 <= -self.width:
            self.x1 = self.x2 + self.width
        if self.x2 <= -self.width:
            self.x2 = self.x1 + self.width

    def draw(self, surface):
        # Why: Custom draw logic since Ground isn't a typical Pygame Sprite (needs two blits).
        surface.blit(self.image, (self.x1, self.y))
        surface.blit(self.image, (self.x2, self.y))

class Cloud(pygame.sprite.Sprite):
    # Why is this implemented: Background visual flair that moves slower than the ground (parallax).
    def __init__(self, asset_manager):
        super().__init__()
        self.image = asset_manager.get_sprite("cloud")
        self.rect = self.image.get_rect()
        # Spawn off-screen to the right with random variation
        self.rect.x = SCREEN_WIDTH + random.randint(10, 80)
        self.rect.y = random.randint(20, 80)

    def update(self, speed):
        # Why: Moves the cloud. Parallax effect achieved by moving at 20% of game speed.
        self.rect.x -= speed * 0.2
        if self.rect.right < 0:
            self.kill()
