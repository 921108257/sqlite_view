"""Parametric generator for the SQLite View app icon.

The mark is a rounded tile carrying a white database cylinder crossed by two
blue row bands. It is deliberately built from three shapes only, with thick
strokes and a saturated background, so the silhouette still reads at 16 px and
stays visible against both light and dark docks.

Run via `scripts/generate-icons.sh`, which renders the master and then asks the
Tauri CLI to derive every platform-specific size from it.
"""

import math
import sys

import cairo

# Tile
BG_TOP = (0.31, 0.55, 0.99)
BG_BOTTOM = (0.19, 0.28, 0.82)
HIGHLIGHT = (1.0, 1.0, 1.0)

# Cylinder
CYL = (1.0, 1.0, 1.0)
LID = (0.74, 0.82, 0.98)
BAND = (0.20, 0.34, 0.86)
SHADE = (0.72, 0.79, 0.96)

# Geometry as fractions of the icon side.
CORNER_R = 0.224
CX = 0.5
TOP_CY = 0.300
LID_RY = 0.104
RX = 0.256
BOT_CY = 0.700
BOT_RY = 0.108

LID_INSET = 0.075                # lid ellipse shrunk toward the centre
SEAM_FRACS = (0.468, 0.612)      # vertical placement of the two row bands
SEAM_H = 0.048                   # band thickness
SEAM_INSET = 0.065               # band inset from the cylinder walls
BAND_SAG = 0.30                  # band bulge, as a fraction of the lid radius


def _tile(cr, s):
    r = CORNER_R * s
    cr.arc(s - r, r, r, -math.pi / 2, 0)
    cr.arc(s - r, s - r, r, 0, math.pi / 2)
    cr.arc(r, s - r, r, math.pi / 2, math.pi)
    cr.arc(r, r, r, math.pi, 3 * math.pi / 2)
    cr.close_path()


def _scaled_arc(cr, cx, cy, rx, ry, a0, a1):
    """Circular arc drawn in a space scaled to an ellipse."""
    cr.save()
    cr.translate(cx, cy)
    cr.scale(1.0, ry / rx)
    cr.arc(0, 0, rx, a0, a1)
    cr.restore()


def _bow(cr, x0, x1, y, sag):
    """Quadratic bulge from (x0, y) to (x1, y), dipping `sag` at the midpoint."""
    mid = (x0 + x1) / 2
    cr.curve_to(mid, y + 2 * sag, mid, y + 2 * sag, x1, y)


def _bulge(cr, cx, cy, rx, ry):
    """Upper half of an ellipse: travels left to right across the top."""
    _scaled_arc(cr, cx, cy, rx, ry, math.pi, 2 * math.pi)


def _trough(cr, cx, cy, rx, ry):
    """Lower half of an ellipse: travels left to right beneath the centre."""
    _scaled_arc(cr, cx, cy, rx, ry, 0, math.pi)


def _cylinder(cr, s):
    cx, rx = CX * s, RX * s
    top_cy, lid_ry = TOP_CY * s, LID_RY * s
    bot_cy, bot_ry = BOT_CY * s, BOT_RY * s

    cr.move_to(cx - rx, top_cy)
    _bulge(cr, cx, top_cy, rx, lid_ry)          # across the lid
    cr.line_to(cx + rx, bot_cy)                 # right wall
    _trough(cr, cx, bot_cy, rx, bot_ry)         # across the base
    cr.line_to(cx - rx, top_cy)                 # left wall
    cr.close_path()


def _seam(cr, s, frac):
    """One row band, following the cylinder's curve and inset from the walls.

    Both edges are drawn as Beziers with the same sagitta, traced in opposite
    directions, so the band keeps a uniform vertical thickness. Two elliptical
    arcs cannot be used here: `arc(0, pi)` sweeps below its own chord, so
    stacking two of them makes the band taper to a point at both ends.
    """
    cx, rx = CX * s, RX * s
    cy = frac * s
    sag = LID_RY * s * BAND_SAG
    rxi = rx - SEAM_INSET * rx
    top = cy - (SEAM_H * s) / 2
    bot = cy + (SEAM_H * s) / 2

    cr.move_to(cx - rxi, top)
    _bow(cr, cx - rxi, cx + rxi, top, sag)   # upper edge, left to right
    cr.line_to(cx + rxi, bot)
    _bow(cr, cx + rxi, cx - rxi, bot, sag)   # lower edge, traced back
    cr.close_path()


def render(size):
    """Render the icon at `size` px and return an ARGB32 ImageSurface."""
    s = float(size)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    cr = cairo.Context(surf)
    cr.set_antialias(cairo.ANTIALIAS_BEST)

    # Tile with a vertical gradient, plus a soft off-centre sheen.
    _tile(cr, s)
    grad = cairo.LinearGradient(0, 0, 0, s)
    grad.add_color_stop_rgb(0.0, *BG_TOP)
    grad.add_color_stop_rgb(1.0, *BG_BOTTOM)
    cr.set_source(grad)
    cr.fill_preserve()

    cr.save()
    cr.clip()
    sheen = cairo.RadialGradient(
        0.28 * s, 0.14 * s, 0.0, 0.28 * s, 0.14 * s, 1.05 * s
    )
    sheen.add_color_stop_rgba(0.0, *HIGHLIGHT, 0.22)
    sheen.add_color_stop_rgba(1.0, *HIGHLIGHT, 0.0)
    cr.set_source(sheen)
    cr.paint()
    cr.restore()

    # Cylinder body.
    _cylinder(cr, s)
    cr.set_source_rgb(*CYL)
    cr.fill()

    # Everything else is clipped to the silhouette.
    cr.save()
    _cylinder(cr, s)
    cr.clip()

    cr.set_source_rgb(*BAND)
    for frac in SEAM_FRACS:
        _seam(cr, s, frac)
        cr.fill()

    cx, top_cy = CX * s, TOP_CY * s
    rx, ry = RX * s, LID_RY * s
    r = 1 - LID_INSET
    _scaled_arc(cr, cx, top_cy, rx * r, ry * r, 0, 2 * math.pi)
    cr.set_source_rgb(*LID)
    cr.fill()

    # Cool shading down the right wall for a little dimension.
    shade = cairo.LinearGradient(cx, 0, cx + rx, 0)
    shade.add_color_stop_rgba(0.0, *SHADE, 0.0)
    shade.add_color_stop_rgba(0.45, *SHADE, 0.0)
    shade.add_color_stop_rgba(1.0, *SHADE, 0.45)
    cr.set_source(shade)
    cr.paint()
    cr.restore()

    surf.flush()
    return surf


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "app-icon.png"
    size = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
    render(size).write_to_png(out)
    print(f"wrote {out} ({size}x{size})")


if __name__ == "__main__":
    main()
