from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CollisionBox:
    x: float
    y: float
    width: float
    height: float


def intersects(a: CollisionBox, b: CollisionBox) -> bool:
    return (
        a.x < b.x + b.width
        and a.x + a.width > b.x
        and a.y < b.y + b.height
        and a.y + a.height > b.y
    )


def translated(box: CollisionBox, container: CollisionBox) -> CollisionBox:
    return CollisionBox(
        x=container.x + box.x,
        y=container.y + box.y,
        width=box.width,
        height=box.height,
    )
