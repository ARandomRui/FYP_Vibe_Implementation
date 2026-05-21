import pygame
import sys
import random
import os
from settings import *
from asset_manager import AssetManager
from dino import Dino
from obstacles import Cactus, Pterodactyl
from environment import Ground, Cloud
from score_manager import ScoreManager

class Game:
    # Why is this implemented: Acts as the core orchestrator for the entire application.
    # Manages the main game loop, event handling, speed scaling, and object coordination.
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Chrome Dinosaur Game Clone")
        self.clock = pygame.time.Clock()
        
        self.asset_manager = AssetManager()
        # Expect the user to place the sprite sheet here
        sprite_path = os.path.join(os.path.dirname(__file__), "assets", "sprite.png")
        self.asset_manager.load_sprite_sheet(sprite_path)
        
        self.score_manager = ScoreManager(self.asset_manager)
        self.reset_game()

    def reset_game(self):
        # Why: Resets all transient game state variables for a fresh start after death.
        self.dino = Dino(self.asset_manager)
        self.ground = Ground(self.asset_manager)
        
        # Sprite groups for automated updating and drawing
        self.obstacles = pygame.sprite.Group()
        self.clouds = pygame.sprite.Group()
        
        self.game_speed = STARTING_SPEED
        self.score_manager.reset()
        
        self.game_over = False
        self.obstacle_timer = 0
        self.cloud_timer = 0
        
        # Day/Night cycle logic
        self.is_night = False
        self.dev_night_mode = False # Developer override
        self.background_color = BG_COLOR_DAY

    def handle_events(self):
        # Why: Intercepts OS-level inputs (window close) and passes keyboard input to player.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.score_manager.save_high_score()
                pygame.quit()
                sys.exit()
                
            if event.type == pygame.KEYDOWN:
                if self.game_over:
                    if event.key == pygame.K_SPACE or event.key == pygame.K_UP:
                        self.reset_game()
                        
                # Developer Mode: Ctrl + I to toggle night mode
                mods = pygame.key.get_mods()
                if event.key == pygame.K_i and (mods & pygame.KMOD_CTRL):
                    self.dev_night_mode = not self.dev_night_mode

        keys = pygame.key.get_pressed()
        if not self.game_over:
            self.dino.handle_input(keys)

    def spawn_entities(self):
        # Why: Dynamically generates obstacles and clouds based on random timers to create varied gameplay.
        
        # Cloud spawning
        self.cloud_timer += 1
        if self.cloud_timer > random.randint(60, 150):
            self.clouds.add(Cloud(self.asset_manager))
            self.cloud_timer = 0

        # Obstacle spawning
        self.obstacle_timer += 1
        # Obstacles spawn faster as game speed increases
        spawn_threshold = random.randint(50, 150) - int(self.game_speed * 2)
        spawn_threshold = max(30, spawn_threshold) # Set a lower limit so they don't overlap too much
        
        if self.obstacle_timer > spawn_threshold:
            # Score > 500 unlocks Pterodactyls
            if self.score_manager.score > 500 and random.random() > 0.6:
                self.obstacles.add(Pterodactyl(self.asset_manager))
            else:
                self.obstacles.add(Cactus(self.asset_manager))
            self.obstacle_timer = 0

    def check_collisions(self):
        # Why: Determines if the player has hit an obstacle using the tight hitboxes.
        for obstacle in self.obstacles:
            if self.dino.hitbox.colliderect(obstacle.hitbox):
                self.game_over = True
                self.dino.is_dead = True
                self.score_manager.save_high_score()

    def update(self):
        # Why: Core physics and state update loop. Progresses the game by one frame.
        if not self.game_over:
            # Increase game speed linearly up to the cap
            if self.game_speed < MAX_SPEED:
                self.game_speed += ACCELERATION
                
            self.dino.update()
            self.ground.update(self.game_speed)
            self.clouds.update(self.game_speed)
            self.obstacles.update(self.game_speed)
            self.score_manager.update(self.game_speed)
            
            self.spawn_entities()
            self.check_collisions()
            
            # Day / Night cycle: Flips every 700 points, or overridden by dev mode
            if self.dev_night_mode:
                self.is_night = True
            elif int(self.score_manager.score) // 700 % 2 == 1:
                self.is_night = True
            else:
                self.is_night = False

    def draw(self):
        # Why: Renders all graphical elements to the frame buffer before flipping it to the display.
        # Always draw on a day background first
        self.screen.fill(BG_COLOR_DAY)
        
        self.ground.draw(self.screen)
        self.clouds.draw(self.screen)
        self.obstacles.draw(self.screen)
        self.screen.blit(self.dino.image, self.dino.rect)
        self.score_manager.draw(self.screen)
        
        if self.game_over:
            game_over_img = self.asset_manager.get_sprite("game_over")
            restart_img = self.asset_manager.get_sprite("restart_button")
            if game_over_img and restart_img:
                self.screen.blit(game_over_img, (SCREEN_WIDTH // 2 - game_over_img.get_width() // 2, SCREEN_HEIGHT // 2 - 30))
                self.screen.blit(restart_img, (SCREEN_WIDTH // 2 - restart_img.get_width() // 2, SCREEN_HEIGHT // 2 + 10))
            else:
                # Fallback if UI sprites are missing
                font = pygame.font.Font(None, 36)
                text = font.render("GAME OVER", True, TEXT_COLOR)
                self.screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, SCREEN_HEIGHT // 2 - 20))

        # If it's night, invert the entire screen colors!
        if self.is_night:
            invert_surface = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            # Fill with pure white
            invert_surface.fill((255, 255, 255))
            # Subtract the current screen colors FROM the white surface
            invert_surface.blit(self.screen, (0, 0), special_flags=pygame.BLEND_RGB_SUB)
            # Draw the newly inverted surface over the screen
            self.screen.blit(invert_surface, (0, 0))
            
        pygame.display.flip()

    def run(self):
        # Why: The main infinite loop that keeps the program running.
        while True:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)

if __name__ == "__main__":
    game = Game()
    game.run()
