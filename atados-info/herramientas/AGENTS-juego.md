# AGENTS.md — AtaDos

## Proyecto
AtaDos: boss rush cooperativo local para dos jugadores en el navegador. Los dos están unidos por una cadena; la cadena es su única arma y el daño sale de cómo la usan.
Se construye **desde cero**. No leer, citar ni copiar `~/Documents/AtaDos-v0` (juego viejo) ni ningún juego anterior.
Experimento: comparar "juego de un prompt" contra "juego con dirección previa, skills y orden". Por eso **nada de diseño se inventa**: si falta una decisión, se pregunta a Diego y se registra.

## Estado actual
**Fase 0 — Preproducción.** Diseño en entrevista (`docs/ENTREVISTA.md`). No se escribe código de gameplay hasta que `docs/design/` tenga los bloques A–D cerrados (ver `docs/PRODUCCION.md`).

## Fuente de verdad (en este orden)
1. `docs/DECISIONES.md` — decisiones cerradas con ID (`D-001`…). Manda sobre todo lo demás.
2. `docs/design/*.md` — GDD por área, redactado a partir de las decisiones.
3. `src/core/config.js` — números. 4. Código.
Si el código contradice una decisión, el código está mal. Si una decisión falta, se pregunta: no se asume.

## Stack (verificado en `package.json`)
- three.js **0.187** (`import * as THREE from 'three'`), ES modules, **Vite** + **pnpm**. No hay build global; no usar `file://`.
- Física: `@dimforge/rapier3d-compat` (WASM; `await RAPIER.init()` antes de usar). Usar solo si el diseño lo pide.
- Sonido por código: `zzfx`. Panel de ajuste: `tweakpane` (solo con `?dev`).
- Tests: `vitest` (lógica pura, node). Navegador: `playwright` (Chromium headless) + MCP de Playwright.
- Herramientas locales: Blender 5.3 (modelos por script → GLB), ImageMagick (`magick`), `ffmpeg`, `fd`, `rg`, `jq`.
- Optimización de modelos: `@gltf-transform/cli` (meshopt + webp) vía `pnpm models`.
- MCP: `playwright` (navegador) y `blender` (`mcp-for-blender` 2.2.7, telemetría desactivada; necesita Blender abierto).

## Dirección 3D (D-044)
Mundo y personajes **3D low-poly estilizado**, cámara 3/4 dinámica (D-033). Nada de 2.5D ni billboards.
- Geometría de pocos polígonos, sombreado plano (`flatShading: true` o normales por cara del GLB).
- Modelos: script Python en `assets-src/blender/<nombre>.py` → `pnpm models` → `public/models/<nombre>.glb`. Formas simples se pueden hacer directo en three.js.
- Animación: procedural para protagonistas (squash & stretch, inclinación, pasos, capa); esqueleto hecho en Blender para jefes (D-090).
- La paleta y materiales salen de `docs/design/03-arte.md`; no se improvisan.

## Comandos
- `pnpm dev` — servidor con recarga (puerto 5173). En el desktop app: preview `atados-dev` (`.claude/launch.json`).
- `pnpm check` — build de Vite (imports rotos, sintaxis).
- `pnpm test` — Vitest.
- `pnpm smoke` — Chromium headless, paso fijo, capturas en `test-results/`; **falla ante cualquier error de consola, excepción o request fallido**.
- `pnpm verify` — los tres. **Es la definición de "hecho".**
- `pnpm models [nombre]` — Blender headless → GLB optimizado en `public/models/`.

## Estructura
- `src/core/` config (todos los números), rng, input, loop, estados
- `src/gameplay/` reglas puras (sin three.js ni DOM): cadena, daño, jugadores, jefes, ataques, progresión
- `src/render/` escena, cámara, modelos, materiales, vfx, telegrafías
- `src/audio/` música y efectos (zzfx / assets)
- `src/ui/` HUD, menús, panel `?dev`
- `src/main.js` arranque; expone `window.__game` para las pruebas
- `public/` assets servidos (con licencia, en `CREDITS.md`) · `assets-src/` fuentes (Blender, audio crudo), no se sirven
- `tests/` Vitest · `scripts/` smoke y utilidades · `docs/` diseño, producción, playtests

## Reglas técnicas (fijas)
1. Todo número de balance va en `src/core/config.js`. Nada de constantes mágicas en gameplay.
2. Un jefe nuevo = datos en config que combinan bloques de ataque reutilizables. Sin código por jefe.
3. Todo ataque se puede cancelar en cualquier frame y limpia lo que creó (`finally` o equivalente).
4. La lógica del juego son funciones puras con test; el render solo lee el estado.
5. Azar de gameplay por `RNG` (`?seed=N`), nunca `Math.random`. Paso de simulación fijo; `dt` con tope.
6. Pools pre-asignados para VFX y proyectiles: nada de `new THREE.*` por frame. `dispose()` al quitar.
7. Assets de terceros solo con licencia compatible, registrados en `CREDITS.md`.
8. Commits chicos, en español, uno por cambio lógico.

## Reglas de diseño
Se llenan desde `docs/DECISIONES.md`. Colores de Sael/Odo: par A, Sael limón `#f0e45a`, Odo celeste `#4fb0ff` (D-142). Código de colores de gameplay y paleta por zona aprobados en v2 (D-188): tokens en `CONFIG.paleta`, nunca hex sueltos; marcas planas, sin bordes ni bloom; el rojo/carmesí significa solo peligro. No existe el lanzamiento del compañero (D-144). Sael = J1 (WASD/mando 1), Odo = J2 (flechas/mando 2) (D-123).

## Trampas silenciosas de three.js 0.187 (comprobadas en `node_modules/three`)
- `THREE.Clock` deprecado desde r183 → `THREE.Timer`.
- Siempre `import ... from 'three'` y addons de `three/addons/...`.
- `renderer.outputEncoding` no existe → `renderer.outputColorSpace`. Texturas de color: `texture.colorSpace = THREE.SRGBColorSpace`; mapas de datos: espacio por defecto.
- Gestión de color activa: un hex se interpreta como sRGB. No "compensar" a ojo.
- Luces físicas: `PointLight`/`SpotLight` con `decay = 2`; hace falta mucha más intensidad que en tutoriales viejos. Ajustar con captura.
- HDR: `HDRLoader` (preferido) y `RGBELoader` en `three/addons/loaders/`.
- Rapier: `await RAPIER.init()` y paso fijo.
- Objetos `Vector3/Color/Mesh` creados en el bucle → tirones. Reusar temporales.
- Quitar sin `dispose()` → fuga de GPU visible tras varias rondas.
- Delta sin tope al volver de otra pestaña → limitar `dt` y simular con paso fijo.
- GLB de `pnpm models` usa `EXT_meshopt_compression`: el `GLTFLoader` necesita `loader.setMeshoptDecoder(MeshoptDecoder)` (`three/addons/libs/meshopt_decoder.module.js`) o falla al cargar.
- Playwright no ve dentro del `<canvas>`: estado vía `window.__game`, lo visual con capturas.

## Cómo trabajar
- Antes de editar, lee el módulo, su test y la decisión que lo respalda.
- Cambio visual: `pnpm smoke` y **abre las capturas** de `test-results/`. No digas "se ve bien" sin mirarlas.
- Antes de decir "listo": `pnpm verify` y lee la salida (skill `verify-before-done`).
- Bug: primero reprodúcelo (test o `?seed=N`), luego arregla (skill `systematic-debugging`). Tres arreglos fallidos → para y revisa el diseño.
- Decisión nueva de Diego → skill `registrar-decision` (DECISIONES + doc del área + contador del experimento).
- No toques `pnpm-lock.yaml`, `dist/`, `node_modules/` a mano, ni `.github/` sin petición explícita.
- Si el mismo error aparece dos veces, añade una línea a "Trampas".


## Límites de esta carpeta
- Aquí solo vive el juego: código, tests, assets con licencia, `CREDITS.md` y `docs/` (diseño, decisiones del juego, producción, playtests).
- Investigación y memoria del equipo: `~/Documents/DevDay OpenAI`.
- No tocar `~/Documents/codex-hackathon` (repo de Dani) ni `~/Documents/AtaDos-v0` (juego viejo).
