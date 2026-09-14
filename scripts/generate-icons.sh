#!/usr/bin/env bash
#
# Regenerate every app icon from the parametric source.
#
# Requires: python3 with pycairo + Pillow, and the project's pnpm dependencies.
# The Tauri CLI derives all platform-specific sizes from the 1024px master.
#
#   ./scripts/generate-icons.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

python3 -c "import cairo" 2>/dev/null || {
  echo "pycairo is required: sudo apt-get install -y python3-cairo" >&2
  exit 1
}
python3 -c "import PIL" 2>/dev/null || {
  echo "Pillow is required: pip install Pillow" >&2
  exit 1
}

echo "==> rendering 1024px master"
python3 scripts/generate-icon.py src-tauri/app-icon.png 1024

echo "==> deriving platform icons"
pnpm tauri icon src-tauri/app-icon.png

echo "==> building multi-resolution favicon"
python3 scripts/build-ico.py public/icon.ico

# The Tauri CLI also scaffolds mobile assets. This is a desktop-only project and
# tauri.conf.json has no mobile section, so drop them to avoid dead weight.
rm -rf src-tauri/icons/android src-tauri/icons/ios

echo
echo "done. Changed files:"
echo "  src-tauri/app-icon.png          (master, 1024px)"
echo "  src-tauri/icons/*               (png/ico/icns + Windows store logos)"
echo "  public/icon.ico                 (window favicon)"
