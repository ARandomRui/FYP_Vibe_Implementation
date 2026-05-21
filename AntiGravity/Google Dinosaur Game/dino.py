import pygame
from settings import SCREEN_HEIGHT, GRAVITY, INITIAL_JUMP_VELOCITY

class Dino(pygame.sprite.Sprite):
    # Why is this implemented: Encapsulates the player character's state, physics, and rendering logic.
    # It manages animation frames and applies a smaller internal hitbox to mimic the original game's fairness.
    
    def __init__(self, asset_manager):
        super().__init__()
        self.asset_manager = asset_manager
        
        # Caching animation frames
        self.run_sprites = [
            self.asset_manager.get_sprite("dino_run_1"),
            self.asset_manager.get_sprite("dino_run_2")
        ]
        self.duck_sprites = [
            self.asset_manager.get_sprite("dino_duck_1"),
            self.asset_manager.get_sprite("dino_duck_2")
        ]
        self.jump_sprite = self.asset_manager.get_sprite("dino_jump")
        self.dead_sprite = self.asset_manager.get_sprite("dino_dead")
        
        self.image = self.run_sprites[0]
        self.rect = self.image.get_rect()
        
        # Physics setup
        # If SCREEN_HEIGHT is 300 (HDPI), offset is 40. If 150 (LDPI), offset is 20.
        self.ground_y = SCREEN_HEIGHT - int(40 * (SCREEN_HEIGHT / 300))
        self.rect.x = 50
        self.rect.bottom = self.ground_y
        
        self.velocity_y = 0
        self.is_jumping = False
        self.is_ducking = False
        self.is_dead = False
        
        # Animation
        self.current_frame = 0
        self.animation_timer = 0
        self.animation_speed = 10 
        
        # The collision hitbox (slightly smaller than visual rect for fairness)
        inf_x = int(-40 * (SCREEN_HEIGHT / 300))
        inf_y = int(-30 * (SCREEN_HEIGHT / 300))
        self.hitbox = self.rect.inflate(inf_x, inf_y)

    def handle_input(self, keys):
        # Why: Processes keyboard input safely. We map Up/Space to jump, Down to duck.
        if self.is_dead:
            return

        if (keys[pygame.K_SPACE] or keys[pygame.K_UP]) and not self.is_jumping:
            self.is_jumping = True
            self.velocity_y = INITIAL_JUMP_VELOCITY
            self.is_ducking = False
            
        if keys[pygame.K_DOWN]:
            if not self.is_jumping:
                self.is_ducking = True
            else:
                # Fast fall mechanic
                self.velocity_y += GRAVITY * 2 
        else:
            self.is_ducking = False

    def update(self):
        # Why: Advances the physics engine and animation state by one frame.
        if self.is_dead:
            self.image = self.dead_sprite
            return

        # Apply gravity
        self.velocity_y += GRAVITY
        self.rect.y += self.velocity_y

        # Ground collision logic
        if self.rect.bottom >= self.ground_y:
            self.rect.bottom = self.ground_y
            self.velocity_y = 0
            self.is_jumping = False

        self._update_animation()
        
        # Sync hitbox position with visual rect, adjusted for ducking
        self.hitbox.center = self.rect.center
        if self.is_ducking and not self.is_jumping:
            self.hitbox = self.rect.inflate(-20, -10)
            self.hitbox.bottom = self.rect.bottom
        else:
            self.hitbox = self.rect.inflate(-20, -15)

    def _update_animation(self):
        # Why: Cycles through sprite images based on the current action state.
        if self.is_jumping:
            self.image = self.jump_sprite
        elif self.is_ducking:
            self.animation_timer += 1
            if self.animation_timer >= self.animation_speed:
                self.animation_timer = 0
                self.current_frame = (self.current_frame + 1) % len(self.duck_sprites)
            self.image = self.duck_sprites[self.current_frame]
            # Ducking changes rect size
            old_bottom = self.rect.bottom
            self.rect = self.image.get_rect()
            self.rect.x = 50
            self.rect.bottom = old_bottom
        else:
            self.animation_timer += 1
            if self.animation_timer >= self.animation_speed:
                self.animation_timer = 0
                self.current_frame = (self.current_frame + 1) % len(self.run_sprites)
            self.image = self.run_sprites[self.current_frame]
            # Reset rect size just in case we stopped ducking
            old_bottom = self.rect.bottom
            self.rect = self.image.get_rect()
            self.rect.x = 50
            self.rect.bottom = old_bottom
