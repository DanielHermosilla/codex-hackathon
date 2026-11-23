# Modelos 3D (Blender por script)

Cada `<nombre>.py` construye un modelo low-poly con piezas con nombre (el juego anima y colorea por nombre) y lo exporta como GLB. `_comun.py` tiene las utilidades compartidas.

Para regenerar un modelo (Blender 5 y Node):

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 \
  -P assets-src/atados/blender/sael.py -- /tmp/sael.glb
npx @gltf-transform/cli optimize /tmp/sael.glb public/atados/models/sael.glb \
  --compress meshopt --texture-compress webp \
  --flatten false --join false --instance false --palette false --simplify false
```

Los GLB usan `EXT_meshopt_compression`: el cargador del juego (`src/atados/render/modelos.js`) registra el decodificador de meshopt.
