from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path

import pygame

from audio import SoundBank
from collision import CollisionBox, intersects, translated
from settings import (
    ACCELERATION,
    BG_CLOUD_SPEED,
    CLEAR_TIME_MS,
    COLOR_TRANSITION_DURATION_MS,
    CLOUD_FREQUENCY,
    CLOUD_MAX_GAP,
    CLOUD_MIN_GAP,
    DAY_BG,
    DAY_FG,
    FLASH_DURATION_MS,
    FPS,
    GAMEOVER_CLEAR_TIME_MS,
    GAP_COEFFICIENT,
    GROUND_Y,
    INITIAL_SPEED,
    INVERT_DISTANCE,
    INVERT_FADE_DURATION_MS,
    LOGICAL_HEIGHT,
    LOGICAL_WIDTH,
    MAX_CLOUDS,
    MAX_GAP_COEFFICIENT,
    MAX_OBSTACLE_DUPLICATION,
    MAX_OBSTACLE_LENGTH,
    MAX_SCORE_UNITS,
    MAX_SPEED,
    MOON_PHASES,
    MOON_SPEED,
    MS_PER_FRAME,
    NIGHT_BG,
    NIGHT_FG,
    NIGHT_MODE_OPACITY_STEP,
    NUM_STARS,
    OBSTACLE_SPECS,
    SCORE_ACHIEVEMENT_DISTANCE,
    SCORE_COEFFICIENT,
    SCORE_FLASH_DURATION_MS,
    SCORE_FLASH_ITERATIONS,
    TREX_BLINK_TIMING_MS,
    TREX_DUCK_HEIGHT,
    TREX_DUCK_WIDTH,
    TREX_DUCKING_BOXES,
    TREX_DROP_VELOCITY,
    TREX_GRAVITY,
    TREX_HEIGHT,
    TREX_INITIAL_JUMP_VELOCITY,
    TREX_MAX_JUMP_HEIGHT,
    TREX_MIN_JUMP_HEIGHT,
    TREX_RUNNING_BOXES,
    TREX_RUNNING_FRAME_MS,
    TREX_DUCKING_FRAME_MS,
    TREX_SPEED_DROP_COEFFICIENT,
    TREX_START_X,
    TREX_WAITING_FRAME_MS,
    TREX_WIDTH,
    WINDOW_SCALE,
    STAR_SPEED,
)
from sprites import SpritePack, build_sprite_pack


HIGH_SCORE_FILE = Path(__file__).with_name("highscore.json")


@dataclass
class Cloud:
    x: float
    y: float
    gap: float


@dataclass
class Star:
    x: float
    y: int
    size: int


def _lerp_color(
    start: tuple[int, int, int],
    end: tuple[int, int, int],
    blend: float,
) -> tuple[int, int, int]:
    blend = max(0.0, min(1.0, blend))
    return tuple(
        round(start[index] + (end[index] - start[index]) * blend)
        for index in range(3)
    )


class Trex:
    def __init__(self) -> None:
        self.ground_y = LOGICAL_HEIGHT - TREX_HEIGHT - 10
        self.running_top = self.ground_y
        self.duck_top = self.ground_y + (TREX_HEIGHT - TREX_DUCK_HEIGHT)
        self.reset(waiting=True)

    def reset(self, *, waiting: bool = False) -> None:
        self.x = float(TREX_START_X)
        self.y = float(self.running_top)
        self.jump_velocity = 0.0
        self.jumping = False
        self.ducking = False
        self.speed_drop = False
        self.crashed = False
        self.jump_count = 0
        self.reached_min_height = False
        self.waiting = waiting
        self.waiting_timer = 0.0
        self.waiting_frame = 0
        self.waiting_blink_delay = random.randint(500, TREX_BLINK_TIMING_MS)
        self.anim_timer = 0.0
        self.anim_frame = 0

    @property
    def width(self) -> int:
        return TREX_DUCK_WIDTH if self.ducking and not self.jumping else TREX_WIDTH

    @property
    def height(self) -> int:
        return TREX_DUCK_HEIGHT if self.ducking and not self.jumping else TREX_HEIGHT

    def start_jump(self, speed: float) -> None:
        if self.jumping or self.crashed:
            return
        self.waiting = False
        self.jumping = True
        self.ducking = False
        self.speed_drop = False
        self.anim_frame = 0
        self.jump_velocity = TREX_INITIAL_JUMP_VELOCITY - (speed / 10.0)
        self.reached_min_height = False
        self.y = float(self.running_top)

    def end_jump(self) -> None:
        if self.reached_min_height and self.jump_velocity < TREX_DROP_VELOCITY:
            self.jump_velocity = TREX_DROP_VELOCITY

    def set_speed_drop(self) -> None:
        if self.jumping:
            self.speed_drop = True
            self.jump_velocity = 1.0

    def set_duck(self, is_ducking: bool) -> None:
        if self.crashed:
            return
        if is_ducking and not self.jumping:
            self.ducking = True
            self.y = float(self.duck_top)
            self.anim_frame = 0
            self.anim_timer = 0.0
        elif not self.jumping:
            self.ducking = False
            self.y = float(self.running_top)
            self.anim_frame = 0
            self.anim_timer = 0.0

    def update(self, dt_ms: float) -> None:
        if self.crashed:
            return
        if self.waiting:
            self._update_waiting(dt_ms)
            return
        if self.jumping:
            self._update_jump(dt_ms)
            return
        self.anim_timer += dt_ms
        frame_ms = TREX_DUCKING_FRAME_MS if self.ducking else TREX_RUNNING_FRAME_MS
        if self.anim_timer >= frame_ms:
            self.anim_frame = (self.anim_frame + 1) % 2
            self.anim_timer = 0.0

    def _update_waiting(self, dt_ms: float) -> None:
        self.waiting_timer += dt_ms
        if self.waiting_frame == 0:
            if self.waiting_timer >= self.waiting_blink_delay:
                self.waiting_frame = 1
                self.waiting_timer = 0.0
        elif self.waiting_timer >= TREX_WAITING_FRAME_MS:
            self.waiting_frame = 0
            self.waiting_timer = 0.0
            self.waiting_blink_delay = random.randint(500, TREX_BLINK_TIMING_MS)

    def _update_jump(self, dt_ms: float) -> None:
        frames_elapsed = dt_ms / MS_PER_FRAME
        if self.speed_drop:
            self.y += round(self.jump_velocity * TREX_SPEED_DROP_COEFFICIENT * frames_elapsed)
        else:
            self.y += round(self.jump_velocity * frames_elapsed)
        self.jump_velocity += TREX_GRAVITY * frames_elapsed
        min_jump_top = self.running_top - TREX_MIN_JUMP_HEIGHT
        if self.y < min_jump_top or self.speed_drop:
            self.reached_min_height = True
        if self.y < TREX_MAX_JUMP_HEIGHT or self.speed_drop:
            self.end_jump()
        if self.y >= self.running_top:
            self.y = float(self.running_top)
            self.jumping = False
            self.speed_drop = False
            self.ducking = False
            self.jump_velocity = 0.0
            self.jump_count += 1

    def draw(self, surface: pygame.Surface, sprites: SpritePack) -> None:
        if self.crashed:
            sprite = sprites.trex_crashed
        elif self.waiting:
            sprite = sprites.trex_waiting[self.waiting_frame]
        elif self.jumping:
            sprite = sprites.trex_jump
        elif self.ducking:
            sprite = sprites.trex_ducking[self.anim_frame]
        else:
            sprite = sprites.trex_running[self.anim_frame]
        surface.blit(sprite, (int(self.x), int(self.y)))

    def get_collision_boxes(self) -> list[CollisionBox]:
        specs = TREX_DUCKING_BOXES if self.ducking and not self.jumping else TREX_RUNNING_BOXES
        outer = CollisionBox(self.x + 1, self.y + 1, self.width - 2, self.height - 2)
        boxes = [
            translated(CollisionBox(spec.x, spec.y, spec.width, spec.height), outer)
            for spec in specs
        ]
        return boxes


class Obstacle:
    def __init__(self, spec_index: int, speed: float) -> None:
        self.spec = OBSTACLE_SPECS[spec_index]
        self.size = random.randint(1, MAX_OBSTACLE_LENGTH)
        if self.size > 1 and self.spec.multiple_speed > speed:
            self.size = 1
        self.width = self.spec.width * self.size
        self.height = self.spec.height
        self.x = float(LOGICAL_WIDTH + self.spec.width)
        self.y = float(random.choice(self.spec.y_positions))
        self.remove = False
        self.following_obstacle_created = False
        self.anim_frame = 0
        self.anim_timer = 0.0
        if self.spec.speed_offset:
            self.speed_offset = self.spec.speed_offset if random.random() > 0.5 else -self.spec.speed_offset
        else:
            self.speed_offset = 0.0
        self.gap = self._compute_gap(speed)
        self.collision_boxes = self._build_collision_boxes()

    def _compute_gap(self, speed: float) -> int:
        min_gap = round(self.width * speed + self.spec.min_gap * GAP_COEFFICIENT)
        max_gap = round(min_gap * MAX_GAP_COEFFICIENT)
        return random.randint(min_gap, max_gap)

    def _build_collision_boxes(self) -> list[CollisionBox]:
        boxes = [
            CollisionBox(spec.x, spec.y, spec.width, spec.height)
            for spec in self.spec.collision_boxes
        ]
        if self.size > 1 and len(boxes) >= 3:
            first = boxes[0]
            last = boxes[2]
            boxes[1] = CollisionBox(
                boxes[1].x,
                boxes[1].y,
                self.width - first.width - last.width,
                boxes[1].height,
            )
            boxes[2] = CollisionBox(self.width - last.width, last.y, last.width, last.height)
        return boxes

    @property
    def type_name(self) -> str:
        return self.spec.name

    def update(self, dt_ms: float, speed: float) -> None:
        effective_speed = speed + self.speed_offset
        self.x -= math.floor((effective_speed * FPS / 1000.0) * dt_ms)
        if self.spec.num_frames > 1:
            self.anim_timer += dt_ms
            if self.anim_timer >= self.spec.frame_rate_ms:
                self.anim_frame = (self.anim_frame + 1) % self.spec.num_frames
                self.anim_timer = 0.0
        if self.x + self.width <= 0:
            self.remove = True

    def draw(self, surface: pygame.Surface, sprites: SpritePack) -> None:
        if self.type_name == "cactus_small":
            sprite = sprites.cactus_small[0]
            for index in range(self.size):
                surface.blit(sprite, (int(self.x + (self.spec.width * index)), int(self.y)))
            return
        if self.type_name == "cactus_large":
            sprite = sprites.cactus_large[0]
            for index in range(self.size):
                surface.blit(sprite, (int(self.x + (self.spec.width * index)), int(self.y)))
            return
        surface.blit(sprites.pterodactyl[self.anim_frame], (int(self.x), int(self.y)))

    def get_outer_box(self) -> CollisionBox:
        return CollisionBox(self.x + 1, self.y + 1, self.width - 2, self.height - 2)

    def get_collision_boxes(self) -> list[CollisionBox]:
        outer = self.get_outer_box()
        return [translated(box, outer) for box in self.collision_boxes]


class DistanceMeter:
    def __init__(self) -> None:
        self.max_score_units = MAX_SCORE_UNITS
        self.default_string = "0" * self.max_score_units
        self.high_score = 0
        self.current_score = 0
        self.achievement = False
        self.flash_timer = 0.0
        self.flash_iterations = 0

    def _render_text(self, text: str, glyphs: dict[str, pygame.Surface]) -> pygame.Surface:
        spacing = 1
        glyph_surfaces = [glyphs[char] for char in text if char in glyphs]
        if not glyph_surfaces:
            return pygame.Surface((1, 1), pygame.SRCALPHA)
        width = sum(surface.get_width() for surface in glyph_surfaces)
        width += spacing * (len(glyph_surfaces) - 1)
        height = max(surface.get_height() for surface in glyph_surfaces)
        rendered = pygame.Surface((width, height), pygame.SRCALPHA)
        x = 0
        for surface in glyph_surfaces:
            rendered.blit(surface, (x, 0))
            x += surface.get_width() + spacing
        return rendered

    def get_actual_distance(self, distance: float) -> int:
        return round(distance * SCORE_COEFFICIENT) if distance else 0

    def update(self, dt_ms: float, distance: float) -> bool:
        play_sound = False
        if not self.achievement:
            actual_distance = self.get_actual_distance(distance)
            if actual_distance > int("9" * self.max_score_units):
                self.max_score_units += 1
                self.default_string = "0" * self.max_score_units
            self.current_score = actual_distance
            if actual_distance > 0 and actual_distance % SCORE_ACHIEVEMENT_DISTANCE == 0:
                self.achievement = True
                self.flash_timer = 0.0
                self.flash_iterations = 0
                play_sound = True
            if actual_distance > self.high_score:
                self.high_score = actual_distance
        else:
            self.flash_timer += dt_ms
            if self.flash_timer > SCORE_FLASH_DURATION_MS * 2:
                self.flash_timer = 0.0
                self.flash_iterations += 1
                if self.flash_iterations > SCORE_FLASH_ITERATIONS:
                    self.achievement = False
        return play_sound

    def draw(self, surface: pygame.Surface, sprites: SpritePack) -> None:
        if self.achievement and self.flash_timer < SCORE_FLASH_DURATION_MS:
            score_text = ""
        else:
            score_text = str(self.current_score).rjust(self.max_score_units, "0")
        score_render = self._render_text(score_text, sprites.score_glyphs)
        score_x = LOGICAL_WIDTH - score_render.get_width() - 12
        surface.blit(score_render, (score_x, 8))

        if self.high_score > 0:
            hi_value = str(self.high_score).rjust(self.max_score_units, "0")
            hi_text = self._render_text(f"HI{hi_value}", sprites.score_glyphs)
            surface.blit(hi_text, (score_x - hi_text.get_width() - 12, 10))


class DinoGame:
    def __init__(self) -> None:
        pygame.init()
        try:
            pygame.mixer.init(frequency=44100, size=-16, channels=1)
            self.sounds = SoundBank()
        except pygame.error:
            self.sounds = None

        self.window = pygame.display.set_mode(
            (LOGICAL_WIDTH * WINDOW_SCALE, LOGICAL_HEIGHT * WINDOW_SCALE),
            pygame.RESIZABLE,
        )
        pygame.display.set_caption("Chrome Dinosaur Game Clone")
        self.clock = pygame.time.Clock()
        self.canvas = pygame.Surface((LOGICAL_WIDTH, LOGICAL_HEIGHT))

        self.sprite_cache: dict[tuple[int, int, int], SpritePack] = {}
        self.stars = self._build_stars()
        self.moon_phase_index = 0
        self.moon_x = float(LOGICAL_WIDTH)

        self.high_score = self._load_high_score()
        self.distance_meter = DistanceMeter()
        self.distance_meter.high_score = self.high_score
        self.reset(full_reset=True)

    def reset(self, *, full_reset: bool = False) -> None:
        self.trex = Trex()
        self.current_speed = INITIAL_SPEED
        self.running_time = 0.0
        self.distance_ran = 0.0
        self.playing = False
        self.crashed = False
        self.crash_elapsed = 0.0
        self.inverted = False
        self.invert_timer = 0.0
        self.night_mix = 0.0
        self.night_opacity = 0.0
        self.last_invert_score = 0
        self.clouds = [self._new_cloud(initial=True)]
        self.obstacles: list[Obstacle] = []
        self.obstacle_history: list[str] = []
        self.ground_offset = 0.0
        self.moon_x = float(LOGICAL_WIDTH)
        self.stars = self._build_stars()
        self.distance_meter.current_score = 0
        self.distance_meter.achievement = False
        self.distance_meter.flash_timer = 0.0
        self.distance_meter.flash_iterations = 0
        if full_reset:
            self.distance_meter.high_score = self.high_score

    def _load_high_score(self) -> int:
        if not HIGH_SCORE_FILE.exists():
            return 0
        try:
            return int(json.loads(HIGH_SCORE_FILE.read_text(encoding="utf-8")).get("high_score", 0))
        except (ValueError, json.JSONDecodeError, OSError):
            return 0

    def _save_high_score(self) -> None:
        try:
            HIGH_SCORE_FILE.write_text(
                json.dumps({"high_score": self.distance_meter.high_score}, indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass

    def _play_sound(self, sound_name: str) -> None:
        if not self.sounds:
            return
        getattr(self.sounds, sound_name).play()

    def _build_stars(self) -> list[Star]:
        stars: list[Star] = []
        segment_width = LOGICAL_WIDTH // NUM_STARS
        for index in range(NUM_STARS):
            stars.append(
                Star(
                    x=float(random.randint(segment_width * index, segment_width * (index + 1) - 16)),
                    y=random.randint(8, 70),
                    size=random.randint(2, 4),
                )
            )
        return stars

    def _get_sprites(self, fg_color: tuple[int, int, int]) -> SpritePack:
        if fg_color not in self.sprite_cache:
            self.sprite_cache[fg_color] = build_sprite_pack(fg_color)
        return self.sprite_cache[fg_color]

    def _new_cloud(self, *, initial: bool = False) -> Cloud:
        x = random.randint(450, LOGICAL_WIDTH + 80) if initial else LOGICAL_WIDTH + 20
        y = random.randint(15, 55)
        gap = random.randint(CLOUD_MIN_GAP, CLOUD_MAX_GAP)
        return Cloud(x=float(x), y=float(y), gap=float(gap))

    def _start_game(self) -> None:
        if not self.playing and not self.crashed:
            self.playing = True
            self.trex.waiting = False

    def _restart(self) -> None:
        self.high_score = max(self.high_score, self.distance_meter.high_score)
        self._save_high_score()
        self.distance_meter.high_score = self.high_score
        self.reset()

    def _can_restart(self) -> bool:
        return self.crashed and self.crash_elapsed >= GAMEOVER_CLEAR_TIME_MS

    def _handle_jump_press(self) -> None:
        if self._can_restart():
            self._restart()
            return
        if self.crashed:
            return
        self._start_game()
        if not self.trex.jumping and not self.trex.ducking:
            self.trex.start_jump(self.current_speed)
            self._play_sound("jump")

    def _handle_jump_release(self) -> None:
        if self.playing and not self.crashed:
            self.trex.end_jump()

    def _handle_duck_press(self) -> None:
        if self.crashed:
            return
        if self.trex.jumping:
            self.trex.set_speed_drop()
        else:
            self.trex.set_duck(True)

    def _handle_duck_release(self) -> None:
        self.trex.speed_drop = False
        self.trex.set_duck(False)

    def _update_clouds(self, dt_ms: float) -> None:
        frames_elapsed = dt_ms / MS_PER_FRAME
        for cloud in self.clouds:
            cloud.x -= BG_CLOUD_SPEED * self.current_speed * frames_elapsed
        self.clouds = [cloud for cloud in self.clouds if cloud.x + 46 > 0]
        if not self.clouds:
            self.clouds.append(self._new_cloud())
            return
        last_cloud = self.clouds[-1]
        if (
            len(self.clouds) < MAX_CLOUDS
            and (LOGICAL_WIDTH - last_cloud.x) > last_cloud.gap
            and random.random() < CLOUD_FREQUENCY * 0.02
        ):
            self.clouds.append(self._new_cloud())

    def _duplicate_obstacle_check(self, next_type: str) -> bool:
        duplicate_count = 0
        for obstacle_type in self.obstacle_history:
            duplicate_count = duplicate_count + 1 if obstacle_type == next_type else 0
        return duplicate_count >= MAX_OBSTACLE_DUPLICATION

    def _add_new_obstacle(self) -> None:
        valid_indices = [
            index
            for index, spec in enumerate(OBSTACLE_SPECS)
            if self.current_speed >= spec.min_speed
        ]
        if not valid_indices:
            return
        for _ in range(12):
            index = random.choice(valid_indices)
            spec = OBSTACLE_SPECS[index]
            if self._duplicate_obstacle_check(spec.name):
                continue
            obstacle = Obstacle(index, self.current_speed)
            self.obstacles.append(obstacle)
            self.obstacle_history.insert(0, spec.name)
            del self.obstacle_history[MAX_OBSTACLE_DUPLICATION:]
            return

    def _update_obstacles(self, dt_ms: float) -> None:
        for obstacle in self.obstacles:
            obstacle.update(dt_ms, self.current_speed)
        self.obstacles = [obstacle for obstacle in self.obstacles if not obstacle.remove]
        if self.obstacles:
            last_obstacle = self.obstacles[-1]
            if (
                not last_obstacle.following_obstacle_created
                and last_obstacle.x + last_obstacle.width + last_obstacle.gap < LOGICAL_WIDTH
            ):
                self._add_new_obstacle()
                last_obstacle.following_obstacle_created = True
        else:
            self._add_new_obstacle()

    def _check_collision(self) -> bool:
        if not self.obstacles:
            return False
        obstacle = self.obstacles[0]
        trex_outer = CollisionBox(self.trex.x + 1, self.trex.y + 1, self.trex.width - 2, self.trex.height - 2)
        obstacle_outer = obstacle.get_outer_box()
        if not intersects(trex_outer, obstacle_outer):
            return False
        for trex_box in self.trex.get_collision_boxes():
            for obstacle_box in obstacle.get_collision_boxes():
                if intersects(trex_box, obstacle_box):
                    return True
        return False

    def _update_night_mode(self, dt_ms: float) -> None:
        actual_distance = self.distance_meter.get_actual_distance(math.ceil(self.distance_ran))
        if self.inverted:
            self.invert_timer += dt_ms
            if self.invert_timer >= INVERT_FADE_DURATION_MS:
                self.inverted = False
                self.invert_timer = 0.0
        elif actual_distance > 0 and actual_distance % INVERT_DISTANCE == 0 and actual_distance != self.last_invert_score:
            self.inverted = True
            self.invert_timer = 0.0
            self.last_invert_score = actual_distance
            self.moon_phase_index = (self.moon_phase_index + 1) % len(MOON_PHASES)
            self.moon_x = float(LOGICAL_WIDTH)
            self.stars = self._build_stars()

        color_step = dt_ms / COLOR_TRANSITION_DURATION_MS
        opacity_step = NIGHT_MODE_OPACITY_STEP * (dt_ms / MS_PER_FRAME)
        if self.inverted:
            self.night_mix = min(1.0, self.night_mix + color_step)
            self.night_opacity = min(1.0, self.night_opacity + opacity_step)
        else:
            self.night_mix = max(0.0, self.night_mix - color_step)
            self.night_opacity = max(0.0, self.night_opacity - opacity_step)

        if self.night_opacity > 0.0:
            self.moon_x -= MOON_SPEED * (dt_ms / MS_PER_FRAME)
            if self.moon_x < -40:
                self.moon_x = float(LOGICAL_WIDTH)
            for star in self.stars:
                star.x -= STAR_SPEED * (dt_ms / MS_PER_FRAME)
                if star.x < -star.size:
                    star.x = float(LOGICAL_WIDTH + star.size)

    def _update_ground(self, dt_ms: float) -> None:
        self.ground_offset += (self.current_speed * FPS / 1000.0) * dt_ms
        self.ground_offset %= 24

    def update(self, dt_ms: float) -> None:
        dt_ms = min(dt_ms, 100)
        if self.crashed:
            self.crash_elapsed += dt_ms
            return

        self.trex.update(dt_ms)
        if not self.playing:
            return

        self.running_time += dt_ms
        self._update_ground(dt_ms)
        self._update_clouds(dt_ms)
        has_obstacles = self.running_time > CLEAR_TIME_MS
        if has_obstacles:
            self._update_obstacles(dt_ms)
        collision = has_obstacles and self._check_collision()
        if collision:
            self.crashed = True
            self.trex.crashed = True
            self.playing = False
            self.crash_elapsed = 0.0
            self._play_sound("hit")
            if self.distance_meter.high_score > self.high_score:
                self.high_score = self.distance_meter.high_score
                self._save_high_score()
            return

        self.distance_ran += self.current_speed * (dt_ms / MS_PER_FRAME)
        if self.current_speed < MAX_SPEED:
            self.current_speed = min(MAX_SPEED, self.current_speed + ACCELERATION * (dt_ms / MS_PER_FRAME))
        if self.distance_meter.update(dt_ms, math.ceil(self.distance_ran)):
            self._play_sound("score")
        self._update_night_mode(dt_ms)

    def draw(self) -> None:
        bg_color = _lerp_color(DAY_BG, NIGHT_BG, self.night_mix)
        fg_color = _lerp_color(DAY_FG, NIGHT_FG, self.night_mix)
        sprites = self._get_sprites(fg_color)

        self.canvas.fill(bg_color)
        if self.night_opacity > 0.0:
            self._draw_night_sky(fg_color, bg_color)
        self._draw_clouds(sprites)
        self._draw_ground(sprites)
        for obstacle in self.obstacles:
            obstacle.draw(self.canvas, sprites)
        self.trex.draw(self.canvas, sprites)
        self.distance_meter.draw(self.canvas, sprites)
        if self.crashed:
            self._draw_game_over(sprites, fg_color)

        scaled = self._scale_canvas()
        self.window.fill((20, 20, 20))
        self.window.blit(scaled, self._canvas_position(scaled))
        pygame.display.flip()

    def _draw_clouds(self, sprites: SpritePack) -> None:
        for cloud in self.clouds:
            self.canvas.blit(sprites.cloud, (int(cloud.x), int(cloud.y)))

    def _draw_ground(self, sprites: SpritePack) -> None:
        offset = int(self.ground_offset) % sprites.ground_strip.get_width()
        self.canvas.blit(sprites.ground_strip, (-offset, GROUND_Y - 10))
        self.canvas.blit(
            sprites.ground_strip,
            (sprites.ground_strip.get_width() - offset, GROUND_Y - 10),
        )

    def _draw_night_sky(self, fg_color: tuple[int, int, int], bg_color: tuple[int, int, int]) -> None:
        moon_y = 20
        radius = 16
        alpha = max(0, min(255, round(self.night_opacity * 255)))
        overlay = pygame.Surface((LOGICAL_WIDTH, LOGICAL_HEIGHT), pygame.SRCALPHA)
        night_color = (*fg_color, alpha)
        bg_cutout = (*bg_color, alpha)
        pygame.draw.circle(overlay, night_color, (int(self.moon_x), moon_y), radius, 0)
        phase_shift = self.moon_phase_index - ((len(MOON_PHASES) - 1) / 2)
        pygame.draw.circle(overlay, bg_cutout, (int(self.moon_x + phase_shift * 4), moon_y), radius, 0)
        for star in self.stars:
            pygame.draw.rect(overlay, night_color, (int(star.x), star.y, star.size, star.size))
        self.canvas.blit(overlay, (0, 0))

    def _draw_game_over(self, sprites: SpritePack, fg_color: tuple[int, int, int]) -> None:
        title = sprites.game_over_text
        self.canvas.blit(title, ((LOGICAL_WIDTH - title.get_width()) // 2, 42))
        if self.crash_elapsed >= GAMEOVER_CLEAR_TIME_MS:
            button = sprites.restart_button
            self.canvas.blit(button, ((LOGICAL_WIDTH - button.get_width()) // 2, 72))

    def _scale_canvas(self) -> pygame.Surface:
        window_w, window_h = self.window.get_size()
        scale = min(window_w / LOGICAL_WIDTH, window_h / LOGICAL_HEIGHT)
        scaled_w = max(1, int(LOGICAL_WIDTH * scale))
        scaled_h = max(1, int(LOGICAL_HEIGHT * scale))
        return pygame.transform.scale(self.canvas, (scaled_w, scaled_h))

    def _canvas_position(self, scaled: pygame.Surface) -> tuple[int, int]:
        window_w, window_h = self.window.get_size()
        return ((window_w - scaled.get_width()) // 2, (window_h - scaled.get_height()) // 2)

    def run(self) -> None:
        while True:
            dt_ms = self.clock.tick(FPS)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    raise SystemExit
                if event.type == pygame.KEYDOWN:
                    if event.key in (pygame.K_UP, pygame.K_SPACE):
                        self._handle_jump_press()
                    elif event.key == pygame.K_DOWN:
                        self._handle_duck_press()
                    elif event.key == pygame.K_RETURN and self._can_restart():
                        self._restart()
                if event.type == pygame.KEYUP:
                    if event.key in (pygame.K_UP, pygame.K_SPACE):
                        self._handle_jump_release()
                    elif event.key == pygame.K_DOWN:
                        self._handle_duck_release()
            self.update(dt_ms)
            self.draw()


if __name__ == "__main__":
    DinoGame().run()
