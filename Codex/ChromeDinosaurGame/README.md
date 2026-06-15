# Chrome Dinosaur Game Clone

A Python `pygame` clone of the Google Chrome dinosaur game with mechanics tuned against Chromium's original Dino implementation.

## Features

- Faithful `600 x 150` logical playfield at `60 FPS`
- Chrome-like jump, duck, fast-drop, crash, and restart flow
- Chromium-based obstacle pacing and spawn rules
- Multi-box collision handling for the T-Rex and obstacles
- Score progression, high score tracking, and milestone flashes
- Night mode inversion cycle
- Minimal presentation, no extra menus
- Recreated sound effects for jump, score milestones, and crashes

## Requirements

- Python `3.12+`
- `pygame 2.6+`

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run

```bash
python game.py
```

## Controls

- `Up Arrow` or `Space`: jump
- `Down Arrow`: duck on ground, fast-drop while airborne
- `Enter`: restart after crash

## Files

- [game.py](</c:/Users/Home/Desktop/Vibe Coding FYP/FYP_Vibe_Implementation/Codex/Chrome Dinosaur Game/game.py>) - main loop and gameplay logic
- [settings.py](</c:/Users/Home/Desktop/Vibe Coding FYP/FYP_Vibe_Implementation/Codex/Chrome Dinosaur Game/settings.py>) - Chromium-derived constants and obstacle definitions
- [sprites.py](</c:/Users/Home/Desktop/Vibe Coding FYP/FYP_Vibe_Implementation/Codex/Chrome Dinosaur Game/sprites.py>) - procedural sprite recreation
- [audio.py](</c:/Users/Home/Desktop/Vibe Coding FYP/FYP_Vibe_Implementation/Codex/Chrome Dinosaur Game/audio.py>) - generated sound effects
- [plan.md](</c:/Users/Home/Desktop/Vibe Coding FYP/FYP_Vibe_Implementation/Codex/Chrome Dinosaur Game/plan.md>) - researched implementation plan and requirement decisions

## Notes

- The gameplay constants and spawn rules were based on Chromium's Dino sources.
- Visuals and sounds are recreated in `pygame` rather than copied directly from Chrome assets.
- High score is saved locally in `highscore.json` after a run beats the previous best.
