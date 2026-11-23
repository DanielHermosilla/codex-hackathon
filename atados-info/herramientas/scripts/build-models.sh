#!/usr/bin/env bash
# Construye los modelos: assets-src/blender/<nombre>.py → public/models/<nombre>.glb (optimizado con gltf-transform).
# Uso: pnpm models            (todos los .py que no empiezan con "_")
#      pnpm models roca        (solo uno)
set -euo pipefail
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
SRC="assets-src/blender"
OUT="public/models"
TMP="$(mktemp -d)"
trap 'rm -r "$TMP"' EXIT
mkdir -p "$OUT"
if [ $# -gt 0 ]; then files=("$SRC/$1.py"); else files=("$SRC"/[!_]*.py); fi
for py in "${files[@]}"; do
  [ -f "$py" ] || { echo "sin modelos en $SRC"; exit 0; }
  name="$(basename "$py" .py)"
  "$BLENDER" -b --factory-startup --python-exit-code 1 -P "$py" -- "$TMP/$name.glb" >"$TMP/$name.log" 2>&1 || { cat "$TMP/$name.log"; exit 1; }
  [ -f "$TMP/$name.glb" ] || { cat "$TMP/$name.log"; echo "✖ $name: Blender no exportó"; exit 1; }
  # Sin aplanar, unir, simplificar ni paletizar: el juego anima partes por nombre y cambia materiales por función.
  pnpm exec gltf-transform optimize "$TMP/$name.glb" "$OUT/$name.glb" --compress meshopt --texture-compress webp \
    --flatten false --join false --instance false --palette false --simplify false >/dev/null
  echo "✔ $OUT/$name.glb ($(du -h "$OUT/$name.glb" | cut -f1))"
done
