import pygame
import os
from settings import SCREEN_WIDTH, TEXT_COLOR

class ScoreManager:
    # Why is this implemented: Handles the game's scoring logic, text rendering, 
    # and safe file I/O for persistent high scores.
    def __init__(self, asset_manager):
        self.asset_manager = asset_manager
        self.score = 0
        self.high_score = 0
        self.score_file = "highscore.txt"
        
        # Use a default system font since we aren't guaranteed to have a specific pixel font file
        try:
            self.font = pygame.font.Font(pygame.font.match_font('consolas', bold=True), 20)
        except:
            self.font = pygame.font.Font(None, 24)
            
        self._load_high_score()

    def update(self, speed):
        # Why: Score increases dynamically based on game speed (0.025 coefficient roughly)
        self.score += speed * 0.025
        
        # Check for milestone (every 100 points) could go here (e.g., play a beep)
        
        if self.score > self.high_score:
            self.high_score = self.score

    def _load_high_score(self):
        # Why: Safely read from file. If missing/corrupt, default to 0 to prevent crashes.
        if os.path.exists(self.score_file):
            try:
                with open(self.score_file, "r") as f:
                    self.high_score = float(f.read().strip())
            except Exception as e:
                print(f"Warning: Could not read high score file: {e}")
                self.high_score = 0

    def save_high_score(self):
        # Why: Persist the score. Wrapped in try/except to prevent game crash on disk errors.
        try:
            with open(self.score_file, "w") as f:
                f.write(str(int(self.high_score)))
        except Exception as e:
            print(f"Warning: Could not save high score file: {e}")

    def draw(self, surface):
        # Why: Renders the current and high score to the top right of the screen.
        hi_score_text = f"HI {int(self.high_score):05d}"
        score_text = f"{int(self.score):05d}"
        
        # Render text surfaces
        hi_surf = self.font.render(hi_score_text, True, TEXT_COLOR)
        score_surf = self.font.render(score_text, True, TEXT_COLOR)
        
        # Blit to screen
        surface.blit(hi_surf, (SCREEN_WIDTH - 200, 20))
        surface.blit(score_surf, (SCREEN_WIDTH - 80, 20))

    def reset(self):
        # Why: Resets the current score when the game is restarted.
        self.score = 0
