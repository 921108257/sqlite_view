"""Assemble a multi-resolution .ico file from rendered icon sizes.

PIL's `append_images` argument is ignored by the ICO encoder, so the container
is written by hand: a 6-byte header, one 16-byte directory entry per image, then
the PNG-encoded payloads. PNG-in-ICO is understood by every modern renderer and
keeps the large sizes compact.

Invoked by `scripts/generate-icons.sh`; requires pycairo and Pillow.
"""

import io
import struct
import sys
from pathlib import Path

from PIL import Image  # noqa: F401  (keeps the dependency explicit)


def _load_render():
    """Import render() from generate-icon.py.

    The filename contains a hyphen, so it cannot be imported by module name.
    """
    import importlib.util

    path = Path(__file__).resolve().parent / "generate-icon.py"
    spec = importlib.util.spec_from_file_location("generate_icon", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.render


render = _load_render()

# Windows and most favicon consumers pick from this ladder.
DEFAULT_SIZES = [16, 24, 32, 48, 64, 128, 256]


def build_ico(sizes, out_path):
    payloads = []
    for size in sizes:
        buf = io.BytesIO()
        render(size).write_to_png(buf)
        payloads.append(buf.getvalue())

    header = struct.pack("<HHH", 0, 1, len(sizes))  # reserved, type=icon, count
    offset = len(header) + 16 * len(sizes)

    directory = b""
    for size, payload in zip(sizes, payloads):
        # A dimension byte of 0 means 256 in the ICO directory entry.
        dim = 0 if size >= 256 else size
        directory += struct.pack(
            "<BBBBHHII", dim, dim, 0, 0, 1, 32, len(payload), offset
        )
        offset += len(payload)

    with open(out_path, "wb") as fh:
        fh.write(header)
        fh.write(directory)
        for payload in payloads:
            fh.write(payload)

    return len(header) + len(directory) + sum(len(p) for p in payloads)


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: build-ico.py <out.ico> [size ...]")

    out = sys.argv[1]
    sizes = [int(s) for s in sys.argv[2:]] or DEFAULT_SIZES
    total = build_ico(sizes, out)
    print(f"wrote {out}: {len(sizes)} images {sizes}, {total} bytes")


if __name__ == "__main__":
    main()
