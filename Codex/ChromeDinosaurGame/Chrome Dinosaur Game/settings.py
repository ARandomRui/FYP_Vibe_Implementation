from __future__ import annotations

from dataclasses import dataclass


LOGICAL_WIDTH = 600
LOGICAL_HEIGHT = 150
WINDOW_SCALE = 2
FPS = 60
MS_PER_FRAME = 1000 / FPS

GROUND_Y = 127
BOTTOM_PAD = 10

INITIAL_SPEED = 6.0
ACCELERATION = 0.001
MAX_SPEED = 13.0
MOBILE_SPEED_COEFFICIENT = 1.2
GAP_COEFFICIENT = 0.6
MAX_GAP_COEFFICIENT = 1.5
MAX_OBSTACLE_LENGTH = 3
MAX_OBSTACLE_DUPLICATION = 2

CLEAR_TIME_MS = 3000
GAMEOVER_CLEAR_TIME_MS = 1200
INVERT_DISTANCE = 700
INVERT_FADE_DURATION_MS = 12000
COLOR_TRANSITION_DURATION_MS = 1500
FLASH_DURATION_MS = 1000
SCORE_ACHIEVEMENT_DISTANCE = 100
SCORE_FLASH_DURATION_MS = 1000 / 4
SCORE_FLASH_ITERATIONS = 3
SCORE_COEFFICIENT = 0.025
MAX_SCORE_UNITS = 5

TREX_START_X = 50
TREX_WIDTH = 44
TREX_HEIGHT = 47
TREX_DUCK_WIDTH = 59
TREX_DUCK_HEIGHT = 25
TREX_INTRO_DURATION_MS = 1500
TREX_BLINK_TIMING_MS = 7000
TREX_RUNNING_FRAME_MS = 1000 / 12
TREX_DUCKING_FRAME_MS = 1000 / 8
TREX_WAITING_FRAME_MS = 1000 / 3
TREX_GRAVITY = 0.6
TREX_MAX_JUMP_HEIGHT = 30
TREX_MIN_JUMP_HEIGHT = 30
TREX_INITIAL_JUMP_VELOCITY = -10.0
TREX_DROP_VELOCITY = -5.0
TREX_SPEED_DROP_COEFFICIENT = 3

CLOUD_FREQUENCY = 0.5
MAX_CLOUDS = 6
BG_CLOUD_SPEED = 0.2
CLOUD_MIN_GAP = 100
CLOUD_MAX_GAP = 400

DAY_BG = (247, 247, 247)
DAY_FG = (83, 83, 83)
NIGHT_BG = (32, 33, 36)
NIGHT_FG = (247, 247, 247)

MOON_PHASES = (140, 120, 100, 60, 40, 20, 0)
NUM_STARS = 2
MOON_SPEED = 0.25
STAR_SPEED = 0.3
NIGHT_MODE_OPACITY_STEP = 0.035


@dataclass(frozen=True)
class CollisionBoxSpec:
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class ObstacleSpec:
    name: str
    width: int
    height: int
    y_positions: tuple[int, ...]
    multiple_speed: float
    min_gap: int
    min_speed: float
    collision_boxes: tuple[CollisionBoxSpec, ...]
    num_frames: int = 1
    frame_rate_ms: float = 0.0
    speed_offset: float = 0.0


TREX_RUNNING_BOXES = (
    CollisionBoxSpec(22, 0, 17, 16),
    CollisionBoxSpec(1, 18, 30, 9),
    CollisionBoxSpec(10, 35, 14, 8),
    CollisionBoxSpec(1, 24, 29, 5),
    CollisionBoxSpec(5, 30, 21, 4),
    CollisionBoxSpec(9, 34, 15, 4),
)

TREX_DUCKING_BOXES = (
    CollisionBoxSpec(1, 18, 55, 25),
)

OBSTACLE_SPECS = (
    ObstacleSpec(
        name="cactus_small",
        width=17,
        height=35,
        y_positions=(105,),
        multiple_speed=4.0,
        min_gap=120,
        min_speed=0.0,
        collision_boxes=(
            CollisionBoxSpec(0, 7, 5, 27),
            CollisionBoxSpec(4, 0, 6, 34),
            CollisionBoxSpec(10, 4, 7, 14),
        ),
    ),
    ObstacleSpec(
        name="cactus_large",
        width=25,
        height=50,
        y_positions=(90,),
        multiple_speed=7.0,
        min_gap=120,
        min_speed=0.0,
        collision_boxes=(
            CollisionBoxSpec(0, 12, 7, 38),
            CollisionBoxSpec(8, 0, 7, 49),
            CollisionBoxSpec(13, 10, 10, 38),
        ),
    ),
    ObstacleSpec(
        name="pterodactyl",
        width=46,
        height=40,
        y_positions=(100, 75, 50),
        multiple_speed=999.0,
        min_gap=150,
        min_speed=8.5,
        collision_boxes=(
            CollisionBoxSpec(15, 15, 16, 5),
            CollisionBoxSpec(18, 21, 24, 6),
            CollisionBoxSpec(2, 14, 4, 3),
            CollisionBoxSpec(6, 10, 4, 7),
            CollisionBoxSpec(10, 8, 6, 9),
        ),
        num_frames=2,
        frame_rate_ms=1000 / 6,
        speed_offset=0.8,
    ),
)
