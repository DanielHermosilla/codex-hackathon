# Cómo usar cada herramienta

## Flujo de trabajo (resumen)
1. **Decidir** → entrevista (`ENTREVISTA.md`) → skill `registrar-decision` → `DECISIONES.md` → `design/*.md` (agente `director-diseno`).
2. **Planificar** → `PRODUCCION.md` con la siguiente tarea y su dueño.
3. **Construir** → lógica pura con tests, render que solo lee el estado, audio aparte.
4. **Verificar** → `pnpm verify` + capturas; MCP de Playwright o preview `atados-dev`.
5. **Playtest** → skill `playtest-ronda` → `ITERACIONES.md` → nuevas decisiones o ajustes en `config.js`.
6. **Medir** → `EXPERIMENTO.md` en cada hito.


## Skills (`.claude/skills/`)
| Skill | Cuándo |
|---|---|
| `registrar-decision` | Cada respuesta o cambio de idea de Diego |
| `prototipo-rapido` | Validar una mecánica en greybox antes de invertir |
| `diseno-jefe` | Crear o balancear un jefe (ficha en `docs/jefes/`) |
| `design-action-combat`, `tune-enemy-ai` | Ritmo de combate, IA justa de jefes |
| `game-feel` | Golpes que no se sienten (hit-stop, shake, flash) |
| `build-game-camera-controls` | Cámara que encuadra a dos jugadores |
| `threejs-fundamentals`, `threejs-lighting`, `threejs-performance` | Escena, luces físicas, rendimiento (r186: manda `node_modules`) |
| `threejs-geometry`, `threejs-materials`, `threejs-textures` | Mallas low-poly, instancing, materiales planos/toon, texturas |
| `threejs-loaders`, `threejs-asset-pipeline` | Cargar GLB, compresión, presupuesto de assets |
| `threejs-animation` | Animación procedural o con mixer |
| `threejs-shaders`, `threejs-postprocessing` | Brillo de la cadena según tensión, niebla, bloom |
| `threejs-trampas` | Antes de cerrar trabajo de render/física |
| `systematic-debugging` | Cualquier bug: causa raíz primero, parar tras 3 intentos |
| `vitest`, `vite`, `playwright-best-practices` | Tests, config de build, pruebas de navegador |
| `verify-before-done` | Siempre antes de decir "listo" |
| `playtest-ronda` | Tras cada sesión de juego |
| `recortar-alcance` | Últimas horas antes de la demo |
| `using-git-worktrees` | Trabajo paralelo en ramas |

No usar `impeccable` en este juego. Lista evaluada y descartadas: `SKILLS.md`.

## MCP
- **Playwright** (`.mcp.json`, alcance de proyecto): al abrir AtaDos en Claude Code, aprobarlo cuando lo pida. Sirve para navegar a `http://localhost:5173/?seed=N&dev`, hacer clic/teclas, leer `window.__game` y sacar capturas. Necesita `pnpm dev` corriendo.
- **Blender** (`mcp-for-blender` 2.2.7, `.mcp.json`, telemetría desactivada por `DISABLE_TELEMETRY`): el addon ya está instalado y activado en Blender 5.3. Para usarlo: abrir Blender (el servidor del addon arranca solo; si no, `N` → pestaña *MCP for Blender* → *Start MCP Server*), abrir AtaDos en Claude Code y aprobar el MCP. Permite crear/editar objetos, ejecutar Python en Blender y capturar el viewport. Las integraciones de descarga (Poly Haven, Sketchfab, Hyper3D, etc.) están apagadas y quedan así salvo permiso de Diego. Lo aprobado se pasa a un script en `assets-src/blender/`.
- **Navegador del desktop app**: preview `atados-dev` (puerto 5173) o `atados-preview` (build, 4173) desde `.claude/launch.json`.

## Hooks (`.claude/settings.json`)
- `guard.js` (antes de editar): bloquea `node_modules/`, `dist/`, `pnpm-lock.yaml`, `.github/`.
- `magic-numbers.js` (después de editar): avisa de números sueltos en gameplay. Da falsos positivos; es un aviso, no un bloqueo.
- Solo aplican a Claude Code. Codex lee `AGENTS.md`.

## Comandos
```bash
pnpm dev        # jugar con recarga (http://localhost:5173, ?dev abre el panel, ?seed=N fija el azar)
pnpm verify     # check + test + smoke — definición de "hecho"
pnpm smoke      # capturas en test-results/
pnpm build && pnpm preview   # build de producción local
```

## Assets
| Tipo | Fuente | Salida | Herramienta |
|---|---|---|---|
| Modelos | `assets-src/blender/*.py` (ejemplo: `_ejemplo_roca.py`) | `public/models/*.glb` | `pnpm models` (Blender headless + gltf-transform meshopt/webp) |
| Texturas | `assets-src/textures/` | `public/textures/` | `magick` |
| Audio | `assets-src/audio/` o zzfx | `public/audio/` | `ffmpeg -af loudnorm` |
| GIF/trailer | capturas o grabación | raíz de `docs/` o release | `ffmpeg` |

Todo asset de terceros → `CREDITS.md` con licencia.

## Parámetros de URL
- `?seed=N` — azar reproducible. `?dev` — panel Tweakpane. `?capture` — `preserveDrawingBuffer` para capturas.
