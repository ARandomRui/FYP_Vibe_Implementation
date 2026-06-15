# Chrome Dinosaur Game Test Cases

This document outlines the unit tests implemented for the Chrome Dinosaur Game to ensure the core mechanics function correctly.

## 1. Collisions (`test_collisions.py`)
- **Hitbox Intersection**: Validates that when an obstacle (cactus) physically intersects the dinosaur's hitbox, a collision is accurately detected.
- **Hitbox Clearance**: Validates that if the dinosaur jumps completely over the cactus without the hitboxes overlapping, no collision is registered.

## 2. Environment (`test_environment.py`)
- **Ground Update Wrap**: Validates that the ground surface wraps around properly when moving off the left side of the screen to create an infinite scrolling effect.
- **Cloud Movement and Cleanup**: Validates that clouds move at the correct parallax speed and are destroyed/killed once they move entirely off-screen to save memory.

## 3. Physics (`test_physics.py`)
- **Initial State**: Verifies that the dinosaur spawns on the ground correctly without jumping or ducking, and has zero vertical velocity.
- **Jump Physics**: Validates that initiating a jump applies immediate upward velocity and detaches the dinosaur from the ground, with gravity taking effect on the next frame.
- **Duck Mechanic**: Ensures the fast-fall mechanic works properly, applying double gravity when the player ducks while mid-air.

## 4. Score Management (`test_score_manager.py`)
- **Initial Score**: Validates that the starting score and high score are initialized to 0.
- **Score Update**: Validates that the score increases correctly over time based on the game's current speed.
- **High Score Update**: Validates that the high score updates dynamically when the current score exceeds it.
- **Save and Load High Score**: Validates that the high score is correctly persisted to a local file and loaded accurately upon restarting the game.
