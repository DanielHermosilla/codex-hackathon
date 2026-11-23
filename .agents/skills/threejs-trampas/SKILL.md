---
name: threejs-trampas
description: Revisa código three.js/Rapier contra las trampas silenciosas de r187 (Timer, colorSpace, luces físicas, dispose, pools, dt). Úsalo antes de cerrar trabajo de render o físicas.
---
Sobre `git diff` busca y reporta con `archivo:línea`:
- `THREE.Clock` (deprecado r183) en vez de `THREE.Timer`; `outputEncoding`/`encoding` (ya no existen).
- Texturas de color sin `colorSpace = SRGBColorSpace`.
- Luces con intensidades de tutoriales viejos: confirmar con captura.
- `new THREE.Vector3/Color/Mesh/Material` en `update` o en generadores sin pool.
- Objetos quitados de la escena sin `dispose()` de geometría, material y textura.
- `dt` sin tope; físicas Rapier avanzadas con el delta del frame; falta `await RAPIER.init()`.
- `Math.random`/`Date.now` en `src/gameplay` o `src/core`.
Si dudas de una API, léela en `node_modules/three/src/` (la versión instalada manda sobre tu memoria). No arregles sin confirmar falsos positivos; ordena por gravedad.
