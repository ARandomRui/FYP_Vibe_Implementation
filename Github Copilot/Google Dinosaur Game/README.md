# Rectangle Dino Game (Python)

A Python recreation of the Chrome Dinosaur game using simple rectangle graphics with Tkinter.

## Visual Mapping
- Player (dinosaur): green rectangle
- Cactus obstacles: red rectangles
- Bird obstacles: pink rectangles

## Features
- Endless runner gameplay
- Jump physics with gravity
- Duck mechanic
- Mid-air fast fall by holding Down
- Progressive speed increase
- Score and best score tracking
- Restart after game over

## Requirements
- Python 3.10 or newer
- Tkinter (usually included with standard Python installs)

## Run the Game
From the project folder, run one of these:

Windows (using local virtual environment):
- .venv\Scripts\python.exe dino_game.py

General Python command:
- python dino_game.py

## Controls
- Space or Up Arrow: jump
- Hold Down Arrow or S: duck
- Hold Down Arrow or S while in air: dive down faster
- R: restart after game over

## Obstacle Behavior
- Red cactus rectangles are ground obstacles
- Pink bird rectangles spawn at multiple heights:
  - Low height: usually requires jumping
  - Middle height: can be avoided by either ducking or jumping
  - High height: usually safe to run under

## Project Structure
- dino_game.py: main game code
- README.md: project documentation
