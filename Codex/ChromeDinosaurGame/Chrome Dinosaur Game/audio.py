from __future__ import annotations

import math
from array import array

import pygame


SAMPLE_RATE = 44100


def _wave_sample(waveform: str, phase: float) -> float:
    if waveform == "square":
        return 1.0 if math.sin(phase) >= 0 else -1.0
    if waveform == "triangle":
        return 2.0 * abs(2.0 * ((phase / (2.0 * math.pi)) % 1.0) - 1.0) - 1.0
    return math.sin(phase)


def generate_tone(
    frequencies: list[float],
    durations_ms: list[int],
    *,
    volume: float = 0.25,
    waveform: str = "square",
) -> pygame.mixer.Sound:
    samples = array("h")
    for frequency, duration_ms in zip(frequencies, durations_ms, strict=True):
        total_samples = int(SAMPLE_RATE * (duration_ms / 1000))
        for index in range(total_samples):
            phase = 2.0 * math.pi * frequency * (index / SAMPLE_RATE)
            envelope = 1.0 - (index / max(total_samples, 1))
            value = _wave_sample(waveform, phase) * envelope * volume
            samples.append(int(max(-1.0, min(1.0, value)) * 32767))
    return pygame.mixer.Sound(buffer=samples.tobytes())


class SoundBank:
    def __init__(self) -> None:
        self.jump = generate_tone([550, 690], [35, 60], volume=0.16, waveform="square")
        self.score = generate_tone([880, 1175], [45, 90], volume=0.18, waveform="triangle")
        self.hit = generate_tone([210, 160, 120], [65, 80, 140], volume=0.28, waveform="square")
