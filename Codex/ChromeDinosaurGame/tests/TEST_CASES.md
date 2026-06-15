# Test Cases

## Purpose

This file records the verification checks run on the current Chrome Dinosaur Game project and separates:

- pass cases: behavior or setup that should succeed
- fail cases: negative scenarios that should fail in a controlled way

Test run date: `2026-05-27`

## Summary

| ID | Type | Test | Result |
| --- | --- | --- | --- |
| TC-PASS-001 | Pass | Python compile check | Passed |
| TC-PASS-002 | Pass | Headless game boot and render smoke test | Passed |
| TC-PASS-003 | Pass | Atlas JSON integrity and bounds validation | Passed |
| TC-FAIL-001 | Fail | Missing atlas file should stop atlas loading | Failed as expected |

## Executed Test Cases

### TC-PASS-001: Python Compile Check

- Objective: confirm that all Python files compile without syntax errors
- Command:

```bash
python -m compileall .
```

- Expected result:
  - all project files compile
  - command exits with code `0`
- Actual result:
  - command completed successfully
  - exit code was `0`
- Status: `Passed`

### TC-PASS-002: Headless Game Boot And Render Smoke Test

- Objective: confirm that the game can initialize, build sprite assets, create an obstacle, and render at least one frame without a visible desktop window
- Command:

```bash
$env:SDL_AUDIODRIVER='dummy'; $env:SDL_VIDEODRIVER='dummy'; python -c "import pygame; from game import DinoGame, Obstacle; game=DinoGame(); game.playing=True; game.running_time=4000; game.distance_meter.current_score=123; game.clouds[0].x=180; obs=Obstacle(0, game.current_speed); obs.x=320; game.obstacles=[obs]; game.draw(); pygame.quit(); print('HEADLESS_SMOKE_PASS')"
```

- Expected result:
  - `pygame` initializes using dummy drivers
  - `DinoGame()` constructs successfully
  - one frame renders successfully
  - output includes `HEADLESS_SMOKE_PASS`
- Actual result:
  - test printed `HEADLESS_SMOKE_PASS`
  - no exception was raised
- Status: `Passed`

### TC-PASS-003: Atlas JSON Integrity And Bounds Validation

- Objective: confirm that the corrected `sprite.atlas.json` contains the required frame keys and that each checked frame stays within the bounds of `sprite.png`
- Command:

```bash
python -c "import json; atlas=json.load(open(r'assets\\sprite.atlas.json','r',encoding='utf-8')); w=atlas['meta']['size']['w']; h=atlas['meta']['size']['h']; required=['restart_button','dino_idle','dino_blink','dino_run_1','dino_run_2','dino_dead','dino_duck_1','dino_duck_2','cloud','pterodactyl_wings_up','pterodactyl_wings_down','cactus_small_1','cactus_large_1','ground_strip','game_over_text','score_row']; missing=[name for name in required if name not in atlas['frames']]; out=[]; [out.append((name, 0 <= atlas['frames'][name]['frame']['x'] < w and 0 <= atlas['frames'][name]['frame']['y'] < h and atlas['frames'][name]['frame']['x'] + atlas['frames'][name]['frame']['w'] <= w and atlas['frames'][name]['frame']['y'] + atlas['frames'][name]['frame']['h'] <= h)) for name in required if name in atlas['frames']]; print('missing=',missing); print('all_bounds_ok=',all(ok for _,ok in out)); print('ATLAS_VALIDATION_PASS' if (not missing and all(ok for _,ok in out)) else 'ATLAS_VALIDATION_FAIL')"
```

- Expected result:
  - no required frame names are missing
  - all checked frames stay within atlas bounds
  - output includes `ATLAS_VALIDATION_PASS`
- Actual result:
  - `missing= []`
  - `all_bounds_ok= True`
  - output included `ATLAS_VALIDATION_PASS`
- Status: `Passed`

### TC-FAIL-001: Missing Atlas File Should Stop Atlas Loading

- Objective: verify that atlas loading fails clearly when the atlas path is invalid
- Command:

```bash
python -c "from pathlib import Path; import sprites; sprites.ATLAS_PATH=Path(r'assets\\missing_sprite.atlas.json'); sprites._load_atlas.cache_clear(); sprites._load_template_pack.cache_clear(); \
try: \
    sprites._load_atlas(); print('NEGATIVE_TEST_UNEXPECTED_PASS') \
except FileNotFoundError: \
    print('NEGATIVE_TEST_EXPECTED_FAIL')"
```

- Expected result:
  - atlas loading should not succeed
  - the test should hit `FileNotFoundError`
  - output should include `NEGATIVE_TEST_EXPECTED_FAIL`
- Actual result:
  - output included `NEGATIVE_TEST_EXPECTED_FAIL`
- Status: `Failed as expected`

## Additional Manual Tests Recommended

These were not fully executed as scripted tests in this pass, but should be checked before final submission:

- Start the game normally with `python game.py` and verify controls:
  - `Space` / `Up` jumps
  - `Down` ducks and speed-drops
  - `Enter` restarts after crash
- Play long enough to verify:
  - pterodactyl spawn timing
  - score milestone flashing
  - day-to-night transition behavior
  - crash and restart flow
- Verify audio on a normal desktop audio device:
  - jump sound
  - score milestone sound
  - crash sound

## Notes

- The fail case above is an expected negative test, not a project defect.
- These checks verify startup, rendering, and atlas consistency, but they do not replace full gameplay QA.
