# Google Chrome Dinosaur Game Clone - Implementation Plan

## 1. Project Overview
This project aims to create an exact clone of the Google Chrome offline dinosaur game (T-Rex Runner) using Python. The game will replicate the original mechanics, including speed progression, physics, collision detection, and visual features like the day/night cycle.

## 2. Technology Stack
- **Language**: Python 3.x
- **Graphics & Game Engine**: `pygame` (Industry standard for 2D Python games, excellent for handling sprites, collisions, and framerates).
- **Asset Generation**: Will use placeholder/generated assets initially, aiming to match the original sprite dimensions and hitboxes.

## 3. Core Mechanics & Specifications
Based on the original HTML5 Canvas game:
- **Speed**: Starts at 6 pixels/frame, increases by 0.001 pixels/frame, capped at 13 pixels/frame.
- **Physics**: 
  - Gravity will be applied constantly when not grounded.
  - Initial jump velocity needs to be tuned to allow jumping over large cacti but returning fast enough for close clusters.
- **Controls**:
  - `Up Arrow` / `Space`: Jump
  - `Down Arrow`: Duck (increases downward velocity if in air, reduces hitbox height on ground).
- **Obstacles**:
  - **Cacti**: Large and small variants, spawning in groups of 1 to 3.
  - **Pterodactyls**: Spawn at three distinct heights (high enough to run under, medium requiring a duck, low requiring a jump).
- **Score System**: 
  - Increases by 0.025 per distance traveled.
  - Milestone beep every 100 points.
  - Day/Night cycle flips every 700 points.
- **Collision (Hitboxes)**: 
  - Hitboxes will be strictly smaller than the visual sprites to ensure fairness, mimicking the original behavior.

## 4. Architecture & Separation of Concerns
The codebase will be modularized to ensure each file handles a specific concern:
- `main.py`: The entry point and main game loop (event handling, updating state, rendering).
- `settings.py`: Configuration file for constants (screen size, FPS, gravity, initial speeds, colors).
- `sprites.py`: Contains class definitions for the `Dino`, `Cactus`, `Pterodactyl`, `Cloud`, and `Ground`.
- `asset_manager.py`: Responsible for loading, scaling, and caching images and sounds.
- `score_manager.py`: Handles score calculation, UI rendering, and high-score persistence via local file.

## 5. Development Phases
1. **Phase 1: Foundation & Window Setup**
   - Initialize Pygame, set up the game loop, and render the scrolling ground.
2. **Phase 2: Dino Physics & Controls**
   - Implement the Dino class with running, jumping, and ducking states.
   - Fine-tune gravity and jump velocity.
3. **Phase 3: Obstacle Generation**
   - Create randomized spawning logic for Cacti and Pterodactyls.
4. **Phase 4: Collision & State Management**
   - Implement hitbox-based collision detection.
   - Add Game Over state and restart functionality.
5. **Phase 5: Polish & Fidelity**
   - Implement the score counter, 100-point milestone chime, and day/night cycle.
   - Ensure speed scaling matches the `0.001` increment rule.

## 6. Edge Cases & Considerations
- **Framerate Independence**: All speeds will be scaled with a strict 60 FPS clock to prevent physics anomalies on different machines.
- **Memory Management**: Obstacles and background elements must be deleted/dereferenced once they leave the left side of the screen to prevent memory leaks.
- **Persistent High Score**: High score will be saved to a local `.txt` or `.json` file, handled safely with `try/catch` blocks.
