# Inventario de `atados-info`

## Cambios al subirla a `codex-hackathon`
Lo de Dani manda. Esta carpeta va en `atados-info/` dentro de su repo.

| Elemento | Qué pasó |
| --- | --- |
| `verify-before-done` | Eliminada |
| `using-git-worktrees` | Adaptada a `.agents/skills/using-git-worktrees/` (reglas de Dani: `.worktrees/`, `feature/`, `develop`) |
| `claude/settings.json` + hooks | `magic-numbers.js` portado a `.codex/hooks/magic_numbers.py` (PostToolUse, solo avisa) y registrado en `.codex/hooks.json`. `guard.js` no se portó |
| `smoke.mjs` + `smoke-hud.mjs` | Adaptados a `scripts/` del repo (pista de Dani, sin estado interno del juego); no son etapa de `checks.toml` |
| `AGENTS.md` y `README.md` | Fusionados con los de Dani: su texto intacto y una sección «AtaDos» añadida al final |
| `herramientas/AGENTS-juego.md` | Sigue como referencia; manda el `AGENTS.md` raíz |

Los demás archivos de este inventario se copian tal cual. Las tablas de abajo describen la carpeta original.

Qué hay en la carpeta, por categoría. Solo documentación y herramientas: **no hay código del juego**.
Origen: **Propio** = de Diego. **Tercero** = de otra persona, con su licencia.

## 1. Skills (`herramientas/claude/skills/`)

### 1a. Propias (7)
| Skill | Qué es | Origen |
| --- | --- | --- |
| `diseno-jefe` | Diseñar o revisar un jefe, fase o ataque: telegrafía, rol de cada jugador con la cadena, fases con patrones nuevos | Propio |
| `playtest-ronda` | Registrar una ronda de playtest, separar hechos de opiniones, clasificar problemas (lectura, balance, bug) | Propio |
| `registrar-decision` | Registrar una decisión de Diego en `DECISIONES.md`, reflejarla en el doc de diseño y actualizar el contador del experimento | Propio |
| `threejs-trampas` | Revisar código three.js/Rapier contra las trampas silenciosas de r187 (Timer, colorSpace, luces, dispose, pools, dt) | Propio |
| `game-feel` | Juice (hit-stop, shake, partículas, flashes, sonido) con valores seguros en `config.js` | Propio, adaptada de awesome-gamedev (Apache-2.0) |
| `prototipo-rapido` | Validar una idea mecánica con greybox y HUD de depuración; mantener, matar o reajustar | Propio, adaptada de awesome-gamedev (Apache-2.0) |
| `recortar-alcance` | Decidir qué cortar antes de la demo: lista por impacto, congelar funciones | Propio, adaptada de awesome-gamedev (Apache-2.0) |

### 1b. De terceros (19; `using-git-worktrees` pasó al repo de Dani, ver abajo)
| Skill | Qué es (descripción del frontmatter) | Origen · licencia |
| --- | --- | --- |
| `threejs-fundamentals` | Escena, cámaras, renderer, tone mapping, loop, jerarquías, limpieza (WebGL o WebGPU/TSL) | CloudAI-X · MIT |
| `threejs-geometry` | Geometrías, texto 3D, buffers, merging, instancing, batching, puntos y líneas | CloudAI-X · MIT |
| `threejs-lighting` | Tipos de luz y unidades físicas, sombras, iluminación HDR, probes, rendimiento | CloudAI-X · MIT |
| `threejs-materials` | Elegir y configurar materiales (unlit, PBR, toon…), blending, stencil, nodos TSL | CloudAI-X · MIT |
| `threejs-textures` | Carga de imágenes, color spaces, UV, cubemaps, render targets, memoria | CloudAI-X · MIT |
| `threejs-animation` | Keyframes, esqueleto, morph targets, mezcla de clips, movimiento procedural | CloudAI-X · MIT |
| `threejs-loaders` | Cargar glTF (Draco, meshopt, KTX2), texturas, HDR/EXR, progreso, caché, dispose | CloudAI-X · MIT |
| `threejs-asset-pipeline` | Reducir glTF con gltf-transform: Draco, meshopt, KTX2, WebP/AVIF, gltfjsx | CloudAI-X · MIT |
| `threejs-performance` | Medir y optimizar: draw calls, instancing, LOD, fill rate, sombras, CPU por frame | CloudAI-X · MIT |
| `threejs-postprocessing` | Cadenas de composer, bloom, profundidad de campo, AO, efectos de pantalla | CloudAI-X · MIT |
| `threejs-shaders` | Shaders GLSL, uniforms, varyings, chunks, instanced attributes, equivalentes TSL | CloudAI-X · MIT |
| `systematic-debugging` | Ante cualquier bug o fallo, hallar la causa raíz antes de proponer arreglos (6 archivos) | obra/superpowers (Jesse Vincent) · MIT |
| `using-git-worktrees` | Aislar el trabajo de una feature con worktrees | obra/superpowers · MIT |
| `playwright-best-practices` | Tests Playwright, tests inestables, Page Object, CI, mocks, a11y (59 archivos) | currents-dev · MIT |
| `vite` | Configuración de Vite, plugins, SSR, migración a Vite 8 (8 archivos) | antfu/skills · MIT |
| `vitest` | Tests unitarios con Vitest: mocks, cobertura, fixtures (21 archivos) | antfu/skills · MIT |
| `design-action-combat` | Combate de acción legible: timing, guardia, esquiva, postura, fases de jefe, tests deterministas | tomchapin / Meng To · MIT |
| `tune-enemy-ai` | IA de enemigos: aggro, espaciado, ataques, telegrafías, máquinas de estado, tests | tomchapin / Meng To · MIT |
| `build-game-camera-controls` | Cámaras three.js: isométrica, seguimiento, límites, oclusión, shake, tests | tomchapin / Meng To · MIT |

### 1c. Licencias (`_LICENSES/`, 5 archivos)
| Archivo | Cubre | Titular |
| --- | --- | --- |
| `CloudAI-X.LICENSE` | `threejs-*` (menos `threejs-trampas`) | CloudAI-X · MIT |
| `obra-superpowers.LICENSE` | `systematic-debugging`, `using-git-worktrees` | Jesse Vincent · MIT |
| `currents-dev.LICENSE` | `playwright-best-practices` | Currents Software Inc. · MIT |
| `antfu.LICENSE` | `vite`, `vitest` | Anthony Fu · MIT |
| `tomchapin-MengTo.LICENSE` | `design-action-combat`, `tune-enemy-ai`, `build-game-camera-controls` | Meng To · MIT |

**Aviso:** `game-feel`, `prototipo-rapido` y `recortar-alcance` citan Apache-2.0 (awesome-gamedev) en `SKILLS.md`, pero **no hay archivo de licencia Apache en `_LICENSES/`**. Conviene añadirlo o confirmar que son obra propia.
**Aviso 2:** varias skills propias hablan de `docs/DECISIONES.md`, `docs/ITERACIONES.md`, `docs/PLAYTEST.md`. Aquí esos archivos están en `diseno/` y `diseno/produccion/`. Rutas por adaptar.

## 2. Docs Markdown de la raíz y `docs/`
| Archivo | Qué es | Origen |
| --- | --- | --- |
| `README.md` | Entrada: qué es AtaDos, qué hay en la carpeta, cómo usarla | Propio |
| `AGENTS.md` | Instrucciones para una IA que lea la carpeta | Propio |
| `DEPENDENCIAS.md` | Librerías y herramientas con versión, licencia e instalación | Propio |
| `docs/juego.md` | El juego explicado: género, jugabilidad, lore, jefes, progresión | Propio |
| `docs/como-se-trabajo.md` | El método: entrevista → decisiones → construcción → revisión con Codex | Propio |

## 3. Diseño (`diseno/`)
| Archivo/carpeta | Qué es | Origen |
| --- | --- | --- |
| `DECISIONES.md` | Registro de decisiones D-NNN (199). Fuente de verdad | Propio |
| `ENTREVISTA.md` | Entrevista de dirección de la que salen las decisiones | Propio |
| `candidatos-musica.md` | Música con licencia libre (CC0, CC BY 4.0, fuentes OFL) | Propio; assets de terceros en OpenGameArt |
| `propuesta-colores.md` | Propuesta de colores v2 | Propio |
| `gdd/README.md` | Índice del GDD | Propio |
| `gdd/00-vision.md` … `10-alcance-demo.md` (11 archivos) | GDD: visión, lore, cadena, arte, jugabilidad, jefes, progresión, audio, UI/cámara, dificultad/accesibilidad, alcance | Propio |
| `gdd/lore-propuestas.md` | Propuestas de lore (ronda 2) | Propio |
| `gdd/propuesta-D107-silencios.md` | Propuesta de silencios dramáticos | Propio |
| `gdd/propuesta-D138-D139.md` | Propuesta para D-138 y D-139 | Propio |
| `jefes/_BLOQUES.md`, `_PLANTILLA.md` | Catálogo de bloques de ataque y plantilla de jefe | Propio |
| `jefes/mirra.md`, `ondar.md`, `tavor.md` | Fichas de los tres jefes | Propio |
| `produccion/ADR-001-fisica-cadena.md` | Física de la cadena: PBD propio en 2D, no Rapier | Propio |
| `produccion/EXPERIMENTO.md` | Un prompt vs. dirección + herramientas | Propio |
| `produccion/ITERACIONES.md`, `PLAYTEST.md`, `PRODUCCION.md` | Iteraciones, plantilla de playtest, producción | Propio |

## 4. Hooks y configuración
| Archivo | Qué es | Origen |
| --- | --- | --- |
| `herramientas/claude/hooks/guard.js` | PreToolUse: bloquea editar a mano archivos generados o de infraestructura | Propio |
| `herramientas/claude/hooks/magic-numbers.js` | PostToolUse: avisa de números «mágicos» en `src/gameplay` | Propio |
| `herramientas/claude/settings.json` | Conecta los dos hooks (formato Claude Code). En el repo de Dani se porta a `.codex/hooks.json` | Propio |
| `herramientas/claude/launch.json` | Previews `atados-dev` (5173) y `atados-preview` (4173) | Propio |
| `herramientas/mcp.json` | Servidores MCP (ver 5) | Propio |
| `herramientas/package-referencia.json` | `package.json` de referencia (three 0.187, vite, vitest, playwright…) | Propio |

## 5. MCP (`herramientas/mcp.json`)
| Servidor | Comando | Origen |
| --- | --- | --- |
| `playwright` | `pnpm exec playwright-mcp` (`@playwright/mcp`) | Tercero · Microsoft, Apache-2.0 |
| `blender` | `uvx mcp-for-blender==2.2.7`, `DISABLE_TELEMETRY=true`; necesita Blender abierto | Tercero · paquete `mcp-for-blender` (licencia sin verificar) |

## 6. Scripts (`herramientas/scripts/`)
| Archivo | Qué es | Origen |
| --- | --- | --- |
| `smoke.mjs` | Smoke en Chromium headless: levanta Vite, avanza frames, guarda capturas, falla ante errores | Propio |
| `smoke-hud.mjs` | Smoke del HUD (capturas y comprobaciones de DOM); lo llama `smoke.mjs` | Propio |
| `capturas-propuestas.mjs` | Capturas de las propuestas de color (D-082, D-083, D-087) | Propio |
| `build-models.sh` | Blender `.py` → GLB optimizado con gltf-transform | Propio |

## 7. Investigación (`investigacion/`)
| Archivo | Qué es | Origen |
| --- | --- | --- |
| `README.md` | Índice (19-11-2026) | Propio |
| `motores.md` | Motores para la hackatón | Propio (fuentes citadas) |
| `generos-y-estilos.md` | Géneros y estilos viables en 10 h | Propio (fuentes citadas) |
| `precedentes.md` | Jams y hackatones de juegos anteriores | Propio (fuentes citadas) |
| `vibecoding.md` | Buenas prácticas de vibecoding de juegos | Propio (fuentes citadas) |
| `audiovisual.md` | Dirección audiovisual y audio | Propio |
| `skills-y-herramientas.md` | Skills, MCP y configuración de agentes | Propio (fuentes citadas) |

## 8. Referencias del juego (`herramientas/`)
| Archivo | Qué es | Origen |
| --- | --- | --- |
| `AGENTS-juego.md` | `AGENTS.md` técnico del juego original (three.js 0.187, lógica pura, config, pools, paso fijo, RNG con semilla) | Propio |
| `HERRAMIENTAS.md` | Cómo usar cada herramienta (skills, MCP, hooks, previews) | Propio |
| `SKILLS.md` | Evaluación del skillset: fuente, licencia, nota, estado y descartadas | Propio |

## Menciones residuales a agentes de Claude (no borradas)
| Dónde | Qué dice |
| --- | --- |
| `diseno/DECISIONES.md` L139 (D-131) | Reparto de modelos para subagentes (Opus / Sonnet 5.5) |
| `herramientas/SKILLS.md` L3, L5, L55 | «agentes Claude Code/Codex»; skills en `.claude/skills/`; instaladas en `.claude/skills/` |
| `herramientas/HERRAMIENTAS.md` L12, 37–44 | `.claude/skills/`, `.mcp.json` en Claude Code, `.claude/launch.json`, hooks «solo aplican a Claude Code» |
| `herramientas/AGENTS-juego.md` L34 | Preview `atados-dev` en `.claude/launch.json` |
| `herramientas/claude/settings.json` | Rutas `$CLAUDE_PROJECT_DIR/.claude/hooks/` |
| `README.md` L22, `AGENTS.md` L7–8 | Copiar a `.claude/skills/` (Claude Code); hooks «son de Claude Code» (explicativo, útil para Codex) |
| `investigacion/skills-y-herramientas.md`, `vibecoding.md`, `precedentes.md` | Comandos de Claude Code, subagentes (`/subagents`), ganadores que usaron Claude Code (datos de investigación) |

No hay carpeta de agentes (`.claude/agents/`) ni archivos de definición de agentes.

## Totales
| Categoría | Archivos | Tamaño aprox. |
| --- | --- | --- |
| 1. Skills (26 skills + 5 licencias) | 121 | 1,46 MB |
| 2. Docs raíz y `docs/` | 5 | 20 KB |
| 3. Diseño | 29 | 268 KB |
| 4. Hooks y configuración | 6 | ~12 KB |
| 5. MCP | 1 (`mcp.json`, contado en 4) | — |
| 6. Scripts | 4 | 32 KB |
| 7. Investigación | 7 | 48 KB |
| 8. Referencias del juego | 3 | ~60 KB |
| **Total carpeta** | **175 archivos** | **1,8 MB** |

Notas: 7 skills propias + 19 de terceros = 26. Las categorías 5 y 8 comparten carpeta con la 4; los tamaños son aproximados.
