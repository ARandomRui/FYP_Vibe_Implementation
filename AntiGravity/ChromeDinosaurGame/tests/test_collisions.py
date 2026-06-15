import unittest
import pygame
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from dino import Dino
from obstacles import Cactus

class MockAssetManager:
    def get_sprite(self, name):
        surf = pygame.Surface((50, 50))
        surf.fill((0, 255, 0))
        return surf

class TestCollisions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pygame.init()
        pygame.display.set_mode((1, 1), pygame.HIDDEN)

    def setUp(self):
        self.mock_assets = MockAssetManager()
        self.dino = Dino(self.mock_assets)
        self.cactus = Cactus(self.mock_assets)

    def test_hitbox_intersection(self):
        # Why: Validates that when a cactus physically intersects the dino's hitbox, a collision is detected.
        
        # Manually force the cactus into the exact same position as the dino
        self.cactus.rect.x = self.dino.rect.x
        self.cactus.hitbox.center = self.cactus.rect.center
        
        # Test collision using standard pygame colliderect on the hitboxes, exactly like main.py does
        collision_detected = self.dino.hitbox.colliderect(self.cactus.hitbox)
        self.assertTrue(collision_detected, "Hitboxes should collide when overlapping")

    def test_hitbox_clearance(self):
        # Why: Validates that if the dinosaur jumps completely over the cactus, no collision is registered.
        
        # Move cactus into X intersection
        self.cactus.rect.x = self.dino.rect.x
        self.cactus.hitbox.center = self.cactus.rect.center
        
        # Force dinosaur to be high up in the air (clearing the 50px cactus)
        self.dino.rect.bottom = self.cactus.rect.top - 10
        self.dino.hitbox.center = self.dino.rect.center
        
        collision_detected = self.dino.hitbox.colliderect(self.cactus.hitbox)
        self.assertFalse(collision_detected, "Hitboxes should NOT collide when Dino is above the cactus")

if __name__ == '__main__':
    unittest.main()
