import unittest
import pygame
import sys
import os

# Add parent directory to path to import game modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from environment import Ground, Cloud
from settings import SCREEN_WIDTH

class MockAssetManager:
    # Why is this implemented: Mocks the asset manager to provide dummy surfaces for testing.
    def get_sprite(self, name):
        if name == "ground":
            surf = pygame.Surface((100, 20))
            surf.fill((100, 100, 100))
            return surf
        elif name == "cloud":
            surf = pygame.Surface((30, 10))
            surf.fill((255, 255, 255))
            return surf
        return pygame.Surface((10, 10))

class TestEnvironment(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pygame.init()
        pygame.display.set_mode((1, 1), pygame.HIDDEN)

    def setUp(self):
        self.mock_assets = MockAssetManager()

    def test_ground_update_wrap(self):
        # Why: Validates that ground wraps around properly when moving off screen.
        ground = Ground(self.mock_assets)
        # ground.width is 100 based on mock surface
        speed = 50
        
        # Move left
        ground.update(speed)
        self.assertEqual(ground.x1, -50)
        self.assertEqual(ground.x2, 50)
        
        # Move left again, x1 should go past -width (-100) and wrap
        ground.update(speed + 1) # total 101 moved
        self.assertGreater(ground.x1, 0) # wrapped around

    def test_cloud_movement_and_kill(self):
        # Why: Validates that clouds move at parallax speed and are killed off-screen.
        cloud = Cloud(self.mock_assets)
        initial_x = cloud.rect.x
        speed = 10
        
        # Update moves cloud left by speed * 0.2
        cloud.update(speed)
        self.assertEqual(cloud.rect.x, initial_x - (speed * 0.2))
        
        # Force cloud off-screen
        cloud.rect.x = -100
        cloud.update(speed)
        
        # Verify it has been killed (not in any groups)
        self.assertFalse(cloud.alive())

if __name__ == '__main__':
    unittest.main()
