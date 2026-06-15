from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import pygame


ASSET_DIR = Path(__file__).with_name("assets")
ASSET_SHEET_PATH = ASSET_DIR / "sprite.png"
ATLAS_PATH = ASSET_DIR / "sprite.atlas.json"

SCORE_GLYPHS = "0123456789HI"


@dataclass
class SpritePack:
    trex_waiting: list[pygame.Surface]
    trex_running: list[pygame.Surface]
    trex_ducking: list[pygame.Surface]
    trex_jump: pygame.Surface
    trex_crashed: pygame.Surface
    cactus_small: list[pygame.Surface]
    cactus_large: list[pygame.Surface]
    pterodactyl: list[pygame.Surface]
    cloud: pygame.Surface
    ground_strip: pygame.Surface
    restart_button: pygame.Surface
    game_over_text: pygame.Surface
    score_glyphs: dict[str, pygame.Surface]


@dataclass
class SpriteTemplatePack:
    trex_waiting: list[pygame.Surface]
    trex_running: list[pygame.Surface]
    trex_ducking: list[pygame.Surface]
    trex_jump: pygame.Surface
    trex_crashed: pygame.Surface
    cactus_small: list[pygame.Surface]
    cactus_large: list[pygame.Surface]
    pterodactyl: list[pygame.Surface]
    cloud: pygame.Surface
    ground_strip: pygame.Surface
    restart_button: pygame.Surface
    game_over_text: pygame.Surface
    score_glyphs: dict[str, pygame.Surface]


def _split_glyph_row(surface: pygame.Surface, glyph_order: str) -> dict[str, pygame.Surface]:
    glyphs: list[pygame.Surface] = []
    start_x: int | None = None
    width, height = surface.get_size()

    for x in range(width):
        has_pixels = any(surface.get_at((x, y)).a > 0 for y in range(height))
        if has_pixels and start_x is None:
            start_x = x
        elif not has_pixels and start_x is not None:
            glyphs.append(surface.subsurface(pygame.Rect(start_x, 0, x - start_x, height)).copy())
            start_x = None

    if start_x is not None:
        glyphs.append(surface.subsurface(pygame.Rect(start_x, 0, width - start_x, height)).copy())

    return {
        glyph: glyphs[index]
        for index, glyph in enumerate(glyph_order)
        if index < len(glyphs)
    }


def _tint_sprite(surface: pygame.Surface, color: tuple[int, int, int]) -> pygame.Surface:
    tinted = surface.copy()
    width, height = tinted.get_size()
    for x in range(width):
        for y in range(height):
            pixel = tinted.get_at((x, y))
            if pixel.a == 0:
                continue
            brightness = max(pixel.r, pixel.g, pixel.b) / 255.0
            tinted.set_at(
                (x, y),
                (
                    round(color[0] + (255 - color[0]) * brightness),
                    round(color[1] + (255 - color[1]) * brightness),
                    round(color[2] + (255 - color[2]) * brightness),
                    pixel.a,
                ),
            )
    return tinted


@lru_cache(maxsize=1)
def _load_atlas() -> dict:
    return json.loads(ATLAS_PATH.read_text(encoding="utf-8"))


def _crop_frame(sheet: pygame.Surface, atlas: dict, frame_name: str) -> pygame.Surface:
    frame = atlas["frames"][frame_name]
    rect = frame["frame"]
    source_size = frame["sourceSize"]
    cropped = pygame.Surface((rect["w"], rect["h"]), pygame.SRCALPHA)
    cropped.blit(
        sheet,
        (0, 0),
        pygame.Rect(rect["x"], rect["y"], rect["w"], rect["h"]),
    )
    target_size = (source_size["w"], source_size["h"])
    if cropped.get_size() != target_size:
        cropped = pygame.transform.scale(cropped, target_size)
    return cropped


@lru_cache(maxsize=1)
def _load_template_pack() -> SpriteTemplatePack:
    atlas = _load_atlas()
    sheet = pygame.image.load(str(ASSET_SHEET_PATH)).convert_alpha()

    wait_open = _crop_frame(sheet, atlas, "dino_idle")
    wait_closed = _crop_frame(sheet, atlas, "dino_blink")
    run_1 = _crop_frame(sheet, atlas, "dino_run_1")
    run_2 = _crop_frame(sheet, atlas, "dino_run_2")
    dead = _crop_frame(sheet, atlas, "dino_dead")
    duck_1 = _crop_frame(sheet, atlas, "dino_duck_1")
    duck_2 = _crop_frame(sheet, atlas, "dino_duck_2")
    ptero_1 = _crop_frame(sheet, atlas, "pterodactyl_wings_up")
    ptero_2 = _crop_frame(sheet, atlas, "pterodactyl_wings_down")
    cloud = _crop_frame(sheet, atlas, "cloud")
    ground_strip = _crop_frame(sheet, atlas, "ground_strip")
    restart_button = _crop_frame(sheet, atlas, "restart_button")
    game_over_text = _crop_frame(sheet, atlas, "game_over_text")
    score_row = _crop_frame(sheet, atlas, "score_row")

    return SpriteTemplatePack(
        trex_waiting=[wait_open, wait_closed],
        trex_running=[run_1, run_2],
        trex_ducking=[duck_1, duck_2],
        trex_jump=wait_open,
        trex_crashed=dead,
        cactus_small=[
            _crop_frame(sheet, atlas, "cactus_small_1"),
            _crop_frame(sheet, atlas, "cactus_small_2"),
            _crop_frame(sheet, atlas, "cactus_small_3"),
        ],
        cactus_large=[
            _crop_frame(sheet, atlas, "cactus_large_1"),
            _crop_frame(sheet, atlas, "cactus_large_2"),
            _crop_frame(sheet, atlas, "cactus_large_3"),
        ],
        pterodactyl=[ptero_1, ptero_2],
        cloud=cloud,
        ground_strip=ground_strip,
        restart_button=restart_button,
        game_over_text=game_over_text,
        score_glyphs=_split_glyph_row(score_row, SCORE_GLYPHS),
    )


def build_sprite_pack(color: tuple[int, int, int]) -> SpritePack:
    template = _load_template_pack()
    return SpritePack(
        trex_waiting=[_tint_sprite(sprite, color) for sprite in template.trex_waiting],
        trex_running=[_tint_sprite(sprite, color) for sprite in template.trex_running],
        trex_ducking=[_tint_sprite(sprite, color) for sprite in template.trex_ducking],
        trex_jump=_tint_sprite(template.trex_jump, color),
        trex_crashed=_tint_sprite(template.trex_crashed, color),
        cactus_small=[_tint_sprite(sprite, color) for sprite in template.cactus_small],
        cactus_large=[_tint_sprite(sprite, color) for sprite in template.cactus_large],
        pterodactyl=[_tint_sprite(sprite, color) for sprite in template.pterodactyl],
        cloud=_tint_sprite(template.cloud, color),
        ground_strip=_tint_sprite(template.ground_strip, color),
        restart_button=_tint_sprite(template.restart_button, color),
        game_over_text=_tint_sprite(template.game_over_text, color),
        score_glyphs={
            key: _tint_sprite(sprite, color)
            for key, sprite in template.score_glyphs.items()
        },
    )
