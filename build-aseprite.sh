#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  build-aseprite.sh — compile Aseprite from source on Apple Silicon (M2 Ultra)
#  Free + legal: you build the app yourself. Uses the prebuilt aseprite-m124
#  Skia so you skip the long Skia compile. Native arm64.
#
#  Run:  bash build-aseprite.sh
#  Time: ~10–20 min (mostly the Aseprite compile). Needs ~3 GB free.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPS="$HOME/deps"
SRC="$HOME/aseprite"
SKIA_URL="https://github.com/aseprite/skia/releases/download/m124-08a5439a6b/Skia-macOS-Release-arm64.zip"

say(){ printf "\n==> %s\n" "$*"; }

# 1) Prerequisites ------------------------------------------------------------
say "Checking tools"
if ! xcrun --sdk macosx --show-sdk-path >/dev/null 2>&1; then
  echo "✗ Xcode command line tools / SDK not found."
  echo "  Install Xcode from the App Store (recommended), then run:"
  echo "      sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  echo "  or at minimum:  xcode-select --install"
  exit 1
fi
SDK="$(xcrun --sdk macosx --show-sdk-path)"
echo "  SDK: $SDK"

if ! command -v brew >/dev/null 2>&1; then
  echo "✗ Homebrew not found. Install it first (one line, from https://brew.sh):"
  echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  exit 1
fi

say "Installing cmake + ninja (via Homebrew)"
brew list cmake >/dev/null 2>&1 || brew install cmake
brew list ninja >/dev/null 2>&1 || brew install ninja

# 2) Get the source -----------------------------------------------------------
if [ -d "$SRC/.git" ]; then
  say "Updating existing Aseprite clone"
  git -C "$SRC" pull
  git -C "$SRC" submodule update --init --recursive
else
  say "Cloning Aseprite (with submodules)"
  git clone --recursive https://github.com/aseprite/aseprite.git "$SRC"
fi

# 3) Prebuilt Skia ------------------------------------------------------------
if [ -f "$DEPS/skia/out/Release-arm64/libskia.a" ]; then
  say "Skia already present — skipping download"
else
  say "Downloading prebuilt Skia (aseprite-m124, arm64)"
  mkdir -p "$DEPS/skia"
  curl -L --fail -o /tmp/skia-arm64.zip "$SKIA_URL"
  say "Unzipping Skia into $DEPS/skia"
  ditto -x -k /tmp/skia-arm64.zip "$DEPS/skia"
  rm -f /tmp/skia-arm64.zip
fi

# 4) Configure ----------------------------------------------------------------
say "Configuring with CMake (native arm64)"
mkdir -p "$SRC/build"
cd "$SRC/build"
cmake \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
  -DCMAKE_OSX_SYSROOT="$SDK" \
  -DLAF_BACKEND=skia \
  -DSKIA_DIR="$DEPS/skia" \
  -DSKIA_LIBRARY_DIR="$DEPS/skia/out/Release-arm64" \
  -DSKIA_LIBRARY="$DEPS/skia/out/Release-arm64/libskia.a" \
  -DPNG_ARM_NEON:STRING=on \
  -G Ninja \
  ..

# 5) Compile ------------------------------------------------------------------
say "Compiling Aseprite (this is the long part)"
ninja aseprite

# 6) Done ---------------------------------------------------------------------
BIN="$SRC/build/bin/aseprite"
say "BUILD COMPLETE"
echo "  Run it:    $BIN"
echo "  Or from the build folder:  cd \"$SRC/build/bin\" && ./aseprite"
echo
echo "  To keep the app together, the whole runnable folder is:"
echo "    $SRC/build/bin   (aseprite + its data/ folder)"
echo "  You can copy that 'bin' folder anywhere and run ./aseprite from inside it."
