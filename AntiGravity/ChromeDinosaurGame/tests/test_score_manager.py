import unittest
import pygame
import sys
import os

# Add parent directory to path to import game modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from score_manager import ScoreManager

class MockAssetManager:
    # Why is this implemented: Mocks the asset manager for testing.
    def get_sprite(self, name):
        pass

class TestScoreManager(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pygame.init()
        pygame.display.set_mode((1, 1), pygame.HIDDEN)

    def setUp(self):
        self.mock_assets = MockAssetManager()
        self.score_manager = ScoreManager(self.mock_assets)
        # Use a temporary file for tests to avoid overwriting real highscores
        self.score_manager.score_file = "test_highscore.txt"
        if os.path.exists(self.score_manager.score_file):
            os.remove(self.score_manager.score_file)
        self.score_manager.high_score = 0

    def tearDown(self):
        # Clean up temporary test file
        if os.path.exists(self.score_manager.score_file):
            os.remove(self.score_manager.score_file)

    def test_initial_score(self):
        # Why: Validates that initial score is 0.
        self.assertEqual(self.score_manager.score, 0)
        self.assertEqual(self.score_manager.high_score, 0)

    def test_score_update(self):
        # Why: Validates that update method increases the score based on speed.
        speed = 10
        self.score_manager.update(speed)
        # score increases by speed * 0.025
        expected_score = speed * 0.025
        self.assertEqual(self.score_manager.score, expected_score)

    def test_high_score_update(self):
        # Why: Validates that high score is updated when current score exceeds it.
        self.score_manager.high_score = 10
        self.score_manager.score = 9
        self.score_manager.update(100) # increases score by 2.5
        self.assertEqual(self.score_manager.score, 11.5)
        self.assertEqual(self.score_manager.high_score, 11.5)

    def test_save_load_high_score(self):
        # Why: Validates saving and loading high score from file.
        self.score_manager.high_score = 150
        self.score_manager.save_high_score()
        
        # Create a new instance to test loading
        new_score_manager = ScoreManager(self.mock_assets)
        new_score_manager.score_file = "test_highscore.txt"
        new_score_manager._load_high_score()
        
        self.assertEqual(new_score_manager.high_score, 150)

if __name__ == '__main__':
    unittest.main()
