import unittest
import pygame
import sys
import os

# Add parent directory to path to import game modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dino import Dino
from settings import SCREEN_HEIGHT, INITIAL_JUMP_VELOCITY, GRAVITY

class MockAssetManager:
    # Why is this implemented: Mocks the asset manager to avoid needing real image files during unit testing.
    def get_sprite(self, name):
        # Return a dummy 50x50 surface
        surf = pygame.Surface((50, 50))
        surf.fill((255, 0, 0))
        return surf

class TestDinoPhysics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Initialize pygame display so Surface objects work
        pygame.init()
        pygame.display.set_mode((1, 1), pygame.HIDDEN)

    def setUp(self):
        self.mock_assets = MockAssetManager()
        self.dino = Dino(self.mock_assets)

    def test_initial_state(self):
        # Why: Verifies that the dinosaur spawns on the ground and isn't jumping.
        self.assertFalse(self.dino.is_jumping)
        self.assertFalse(self.dino.is_ducking)
        self.assertEqual(self.dino.velocity_y, 0)
        self.assertEqual(self.dino.rect.bottom, self.dino.ground_y)

    def test_jump_physics(self):
        # Why: Validates that jumping applies immediate upward velocity and detaches from the ground.
        # Simulate jump key press
        keys = {pygame.K_SPACE: True, pygame.K_UP: False, pygame.K_DOWN: False}
        self.dino.handle_input(keys)
        
        self.assertTrue(self.dino.is_jumping)
        self.assertEqual(self.dino.velocity_y, INITIAL_JUMP_VELOCITY)
        
        # Advance one frame
        self.dino.update()
        
        # Velocity should have gravity applied (less negative)
        self.assertEqual(self.dino.velocity_y, INITIAL_JUMP_VELOCITY + GRAVITY)
        # Dino should be off the ground (higher means lower Y value in pygame)
        self.assertLess(self.dino.rect.bottom, self.dino.ground_y)

    def test_duck_mechanic(self):
        # Why: Ensures the fast-fall mechanic works when ducking mid-air.
        # Force jump state mid-air
        self.dino.is_jumping = True
        self.dino.rect.bottom = self.dino.ground_y - 100
        self.dino.velocity_y = 0
        
        # Simulate duck key
        keys = {pygame.K_SPACE: False, pygame.K_UP: False, pygame.K_DOWN: True}
        self.dino.handle_input(keys)
        
        # Should apply 2x gravity immediately for fast fall
        self.assertEqual(self.dino.velocity_y, GRAVITY * 2)

if __name__ == '__main__':
    unittest.main()
