"""Generate resources/icons/icon.ico — a multi-resolution Forge Neo mark.

The art: a stylized anvil silhouette with a single bright spark above it,
rendered in the project's accent neon-orange on the dark panel background.
A rounded-rect frame matches the chrome used throughout the renderer.

Run:
    python scripts/build-icon.py

Reproduces resources/icons/icon.ico byte-for-byte modulo PNG
deflate-determinism (which Pillow handles deterministically across
versions within a major release).
"""
from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

# Palette pulled from tailwind.config.ts.
BG = (11, 12, 15, 255)            # bg.DEFAULT  #0b0c0f
ACCENT = (255, 140, 50, 255)      # warm neon-orange
ACCENT_BRIGHT = (255, 196, 120, 255)  # spark core

SIZES = [256, 128, 64, 48, 32, 16]
OUT = Path(__file__).resolve().parent.parent / "resources" / "icons" / "icon.ico"


def anvil_polygon(s: int) -> list[tuple[float, float]]:
    """Anvil silhouette in icon coordinates (0..s).

    Built from a normalized 1.0-wide path then scaled. Going clockwise
    from the tip of the horn:
        - horn tip (left), up to top of horn, along top face, down right
          side ("heel"), inward to waist on right, down to base right,
          along bottom, up base left, inward to waist left, up to top
          face on left, close back to horn tip.
    """
    # Normalized coordinates (0..1, y grows downward).
    p = [
        (0.09, 0.58),  # horn tip
        (0.20, 0.50),  # horn upper
        (0.78, 0.50),  # top-right of top face
        (0.85, 0.58),  # right shoulder (heel)
        (0.85, 0.62),  # bottom of heel
        (0.72, 0.64),  # under top face, right side of waist top
        (0.66, 0.74),  # waist mid-right
        (0.84, 0.82),  # base top-right (small flare)
        (0.84, 0.90),  # base bottom-right
        (0.16, 0.90),  # base bottom-left
        (0.16, 0.82),  # base top-left
        (0.34, 0.74),  # waist mid-left
        (0.28, 0.64),  # under top face, left side of waist top
        (0.20, 0.62),  # left underside of top face
        (0.09, 0.62),  # bottom of horn root
    ]
    return [(x * s, y * s) for (x, y) in p]


def spark_polygon(cx: float, cy: float, r_outer: float, r_inner: float, points: int = 4) -> list[tuple[float, float]]:
    """A simple 4-point star centered at (cx, cy)."""
    out: list[tuple[float, float]] = []
    # rotate so a point faces up
    phase = -math.pi / 2
    step = math.pi / points
    for i in range(points * 2):
        r = r_outer if i % 2 == 0 else r_inner
        a = phase + i * step
        out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def render(s: int) -> Image.Image:
    img = Image.new("RGBA", (s, s), BG)
    draw = ImageDraw.Draw(img)

    # Rounded-rect chrome
    pad = max(1, s // 24)
    radius = max(2, s // 8)
    stroke = max(1, s // 28)
    draw.rounded_rectangle(
        [pad, pad, s - pad - 1, s - pad - 1],
        radius=radius,
        outline=ACCENT,
        width=stroke,
    )

    # Anvil silhouette
    draw.polygon(anvil_polygon(s), fill=ACCENT)

    # Spark above the top face. Skip on the smallest sizes where it'd
    # become a single muddy pixel.
    if s >= 32:
        sx, sy = s * 0.50, s * 0.30
        r_outer = max(2, s * 0.085)
        r_inner = max(1, s * 0.030)
        # Soft halo
        halo = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        hdraw = ImageDraw.Draw(halo)
        hr = r_outer * 2.2
        hdraw.ellipse(
            [sx - hr, sy - hr, sx + hr, sy + hr],
            fill=(*ACCENT[:3], 70),
        )
        halo = halo.filter(ImageFilter.GaussianBlur(radius=max(1, s // 64)))
        img = Image.alpha_composite(img, halo)
        draw = ImageDraw.Draw(img)
        # Star body + bright core
        draw.polygon(spark_polygon(sx, sy, r_outer, r_inner), fill=ACCENT)
        draw.polygon(
            spark_polygon(sx, sy, r_outer * 0.55, r_inner * 0.55),
            fill=ACCENT_BRIGHT,
        )

    return img


def main() -> None:
    images = [render(s) for s in SIZES]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(
        OUT,
        format="ICO",
        sizes=[(s, s) for s in SIZES],
        append_images=images[1:],
    )
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
