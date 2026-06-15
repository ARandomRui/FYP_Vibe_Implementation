# Chrome Dinosaur Game Clone Implementation Plan

## Goal

Create a Python clone of the Google Chrome dinosaur game with gameplay behavior matched as closely as practical to the original Chromium implementation before adding any optional polish.

This document is the pre-implementation requirements and delivery plan. It also records the final requirement decisions that were confirmed before coding started.

## Researched Baseline From Chromium

These are the key original mechanics I will treat as the default target unless you want us to intentionally diverge.

### Core playfield and loop

- Logical playfield size: `600 x 150`
- Target update rate: `60 FPS`
- Initial game speed: `6`
- Speed acceleration: `0.001`
- Max speed: `13`
- Obstacles do not begin spawning until `3000 ms` of running time
- Game over input lockout before jump-restart: `1200 ms`

### Controls

- `Up Arrow` or `Space`: jump
- `Down Arrow`: duck on ground, fast-drop while airborne
- `Enter`: restart after crash

### T-Rex movement

- Start X position: `50`
- Standing size: `44 x 47`
- Ducking size: `59 x 25`
- Normal jump gravity: `0.6`
- Normal jump max/min jump height setting: `30`
- Normal jump initial velocity is derived from `-10` in the current TypeScript code and from config value `12` in older JS config plumbing; for the Python clone I will validate the observable jump arc against Chromium behavior, not just copy one internal constant name
- While starting a jump, velocity is adjusted by current speed: `jump_velocity = initial_jump_velocity - (speed / 10)`
- Speed drop coefficient: `3`
- Releasing jump early shortens the jump once minimum height has been reached

### Obstacles

Standard obstacle set in the original game:

- Small cactus: `17 x 35`, y=`105`, min gap=`120`, multiple allowed from speed `4`
- Large cactus: `25 x 50`, y=`90`, min gap=`120`, multiple allowed from speed `7`
- Pterodactyl: `46 x 40`, y in `[100, 75, 50]`, min gap=`150`, min speed=`8.5`, animated with `2` frames at `6 FPS`, speed offset `+-0.8`

Spawn behavior:

- Obstacles are chosen randomly from the currently allowed obstacle types
- The game prevents too many repeated duplicates using a max duplication setting of `2`
- Obstacle groups can be length `1` to `3`
- Gap calculation uses:
  - `min_gap = round(obstacle_width * speed + obstacle_min_gap * 0.6)`
  - `max_gap = round(min_gap * 1.5)`
- A following obstacle is created once the prior obstacle plus its computed gap has moved far enough left

### Score and progression

- Score shown as a 5-digit distance counter initially
- Displayed score uses a coefficient of `0.025` applied to travelled distance
- Achievement flash and score sound trigger every `100` displayed distance units
- Speed increases continuously until max speed

### Visual behavior

- Ground/horizon scrolls continuously
- Clouds are enabled in the original mode
- Cloud frequency default: `0.5`
- Max clouds: `6`
- Night mode inversion trigger: every `700` displayed distance units
- Inversion fade duration: `12000 ms`
- The T-Rex idles with random blinking before the run starts
- Running animation: `12 FPS`
- Ducking animation: `8 FPS`

### Collision behavior

- Collision is not one rectangle; Chromium uses multiple collision boxes for both the T-Rex and obstacles
- This is important if we want the clone to feel exact rather than merely similar

## Recommended Technical Direction

- Language: Python
- Framework: `pygame`
- Rendering style: pixel-art sprites on a fixed logical canvas scaled to the window
- Timing model: delta-time update loop, but tuned against Chromium's 60 FPS behavior
- Architecture:
  - `game.py` for main loop/bootstrap
  - `settings.py` for mirrored gameplay constants
  - `entities/trex.py`
  - `entities/obstacle.py`
  - `systems/horizon.py`
  - `systems/score.py`
  - `assets/` for sprite sheet and sound files

## Asset Strategy

Two reasonable approaches:

1. Behavior-faithful and look-faithful:
   Use Chrome-like sprites and sounds, recreated or extracted from Chromium resources.

2. Behavior-faithful only:
   Match mechanics exactly, but use our own art/audio inspired by the original.

If your project needs to be safest from an originality/licensing standpoint, option 2 is cleaner.

## Confirmed Project Decisions

- Python library: `pygame`
- Fidelity target: overall faithful to the Chrome original in both gameplay feel and presentation
- Sound effects: included in version 1
- UX scope: minimal, no extra menu system beyond the original flow
- Documentation: include a `README.md` with setup and controls

## Implementation Milestones

1. Create project skeleton and game loop
2. Implement T-Rex idle, run, jump, duck, and speed-drop behavior
3. Implement horizon scrolling, clouds, and obstacle spawning rules
4. Implement obstacle collision boxes and crash handling
5. Implement score counter, high score, and achievement flashes
6. Implement night mode inversion timing
7. Tune movement and spawn timing against Chromium behavior
8. Add sounds if in scope
9. Run manual parity checks and document any unavoidable differences

## Acceptance Criteria

- The player can start, jump, duck, speed-drop, crash, and restart like the Chrome original
- Jump arc, gravity feel, obstacle pacing, and score pacing closely match Chromium behavior
- Small cactus, large cactus, and pterodactyl behavior matches original spawn constraints
- Collision feel is consistent with Chromium due to multi-box collision handling
- The game reaches night mode and score milestones at the same pacing as the original
- Any known deviations are documented explicitly

## Open Requirement Questions For You

Please answer these before implementation starts:

1. Do you want `pygame` as the Python library, or do you want a different library?
2. Should we aim for both behavior-faithful and visual-faithful, or behavior-faithful only?
3. Should sound effects be included in the first implementation?
4. Do you want a start menu and pause button, or should we stay strictly minimal like the original?
5. Is this for a coursework/demo submission where a short README and controls section should also be included?

## Research Sources

- Chromium Dino game source tree:
  - https://chromium.googlesource.com/chromium/src/+/main/components/neterror/resources/dino_game/
- Current obstacle logic:
  - https://chromium.googlesource.com/chromium/src/+/main/components/neterror/resources/dino_game/obstacle.ts
- Current T-Rex movement logic:
  - https://chromium.googlesource.com/chromium/src/+/main/components/neterror/resources/dino_game/trex.ts
- Current horizon/spawn logic:
  - https://chromium.googlesource.com/chromium/src/+/main/components/neterror/resources/dino_game/horizon.ts
- Current sprite definitions:
  - https://chromium.googlesource.com/chromium/src/+/main/components/neterror/resources/dino_game/offline_sprite_definitions.ts
- Current score logic:
  - https://chromium.googlesource.com/chromium/src/+/main/components/neterror/resources/dino_game/distance_meter.ts
- Stable historical `offline.js` config reference:
  - https://chromium.googlesource.com/chromium/src/+/refs/tags/98.0.4758.55/components/neterror/resources/offline.js
