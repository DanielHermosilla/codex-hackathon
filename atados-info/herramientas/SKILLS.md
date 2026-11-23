# Skillset base (heredado de la plantilla, evaluado para AtaDos)

Evaluado para: juego three.js r187 + Vite + pnpm + Rapier + Vitest + Playwright, 2 personas, agentes Claude Code/Codex.
Nota de lectura: **L** = leí el SKILL.md; **R** = solo README/listado (veredicto provisional); **D** = solo descripción (no lo leí).
Estado: **PROPIA** = ya adaptada en `.claude/skills/` · **INSTALADA** = ya disponible en tu entorno · **CANDIDATA** = externa, sin instalar.

| # | Skill | Fuente · licencia | Qué ofrece | Lect. | Nota | Estado |
|---|---|---|---|---|---|---|
| 1 | verify-before-done | superpowers · MIT | Verificación fresca antes de decir "listo" | L | 5 | PROPIA |
| 2 | threejs-fundamentals | CloudAI-X · MIT (r186) | Escena, Timer, import maps, cleanup, errores comunes | L | 5 | CANDIDATA |
| 3 | threejs-lighting | CloudAI-X · MIT | Luces en candelas, sombras, probes, HDR | L | 5 | CANDIDATA |
| 4 | threejs-performance | CloudAI-X · MIT | Draw calls, stalls de compilación, fill rate | R | 5* | CANDIDATA |
| 5 | game-feel | awesome-gamedev · Apache-2.0 | Hit-stop, shake por trauma², flashes | L | 5 | PROPIA |
| 6 | prototipo-rapido · recortar-alcance | awesome-gamedev · Apache-2.0 | Greybox, keep/kill/retune, lista de recorte | R | 5* | PROPIA |
| 7 | threejs-trampas | propia | Trampas de r187 verificadas | — | 5 | PROPIA |
| 8 | systematic-debugging | obra/superpowers · MIT | Causa raíz; parar tras 3 intentos | L | 4 | CANDIDATA |
| 9 | playwright-best-practices | currents-dev · MIT | 57 referencias, incl. canvas/WebGL | L | 4 | CANDIDATA |
| 10 | vite · vitest | antfu/skills · MIT | Config, mocking, fake timers | L | 4 | CANDIDATA |
| 11 | design-action-combat · tune-enemy-ai | tomchapin · MIT | Fases de ataque, IA justa | R | 4* | CANDIDATA |
| 12 | using-git-worktrees | obra/superpowers · MIT | Ramas paralelas para dos agentes | L | 4 | CANDIDATA |
| 13 | diseno-jefe | propia | Telegrafía, rol por jugador, fases | — | 4 | PROPIA |
| 14 | playtest-ronda | propia | Hechos vs opiniones | — | 4 | PROPIA |
| 15 | threejs-geometry/materials/textures/animation/loaders/asset-pipeline | CloudAI-X · MIT | Instancing, mixers, Draco/KTX2, raycasting, carga GLB | R | 4* | CANDIDATA |
| 16 | build-game-camera-controls | tomchapin · MIT | Seguimiento, oclusión, shake | R | 3* | CANDIDATA |
| 17 | audio-design · game-ui-ux · game-ai | awesome-gamedev · Apache-2.0 | Buses y ducking, UI accesible, IA | R | 3* | CANDIDATA |
| 18 | ship-web-games | tomchapin · MIT | Desplegar commit exacto y verificarlo | R | 3* | CANDIDATA |
| 19 | pnpm | antfu/skills · MIT | CLI, ajustes, CI | L | 3 | CANDIDATA |
| 20 | threejs-postprocessing | CloudAI-X · MIT | EffectComposer, bloom | R | 3* | CANDIDATA (si usan post-proceso) |
| 21 | impeccable · emil-design-eng · animate · apple-design · break-ui · find-animation-opportunities · improve-animations · animation-vocabulary | tu entorno | UI/HUD, motion, casos extremos | D | 3 | INSTALADA |
| 22 | testing-strategy · code-review · simplify · security-review · run | tu entorno | Plan de pruebas, revisión, ejecutar la app | D | 3 | INSTALADA |
| 23 | balance-check | Claude-Code-Game-Studios | DPS, TTK; exige docs de estudio | L | 2 | CANDIDATA (adaptar la idea) |
| 24 | skill-creator | anthropics/skills | Crear y evaluar skills propias | L | 2 | INSTALADA |

## Descartadas
| Skill | Motivo |
|---|---|
| dispatching-parallel-agents, test-driven-development, brainstorming, writing-plans, subagent-driven-development | Pedido de Diego (procesos pesados para 2 personas) |
| webapp-testing (Anthropic) | Se pisa con #9 y usa Python; licencia sin verificar |
| playwright-cli | Se pisa con #9 y con el MCP de Playwright ya configurado |
| requesting-code-review | Se pisa con `code-review` instalada |
| debug (instalada) | Se pisa con #8, que leí completa y es más específica |
| frontend-design · web-design-guidelines | Se pisan con `impeccable` |
| threejs oakoss | Se pisa con #2/#3 y está desactualizada (RGBELoader, Clock) |
| threejs claudekit | Se pisa con #2 y es obsoleta (build global) |
| threejs-scene-setup · gltf-loading (awesome-gamedev) | Se pisan con #2 y #15 |
| itch-publish | Se pisa con #18 y depende de publicar en itch |
| design-game-encounters | Se pisa con `diseno-jefe` |
| create-game-vfx | Se pisa con `game-feel` |
| build-game-audio-feedback | Se pisa con `audio-design` (#17) |
| optimize-threejs-games | Se pisa con #4 |
| test-playable-web-games | Se pisa con #9 |
| algorithmic-art · canvas-design · react-best-practices · threejs-react-three-fiber · build-game-inventory · build-vesperfall-review-assets | No aplican al juego |

`*` = veredicto provisional (solo README o listado). Lect.: L leí el SKILL.md · R README o listado · D solo descripción.
**Instaladas el 2026-11-20 en `.claude/skills/`:** #2, #3, #4, #8, #9, #10, #11, #12 y #16 (revisadas antes: sin comandos de red ni instrucciones ocultas). `impeccable` no se usa en este juego.
**Añadidas el 2026-11-20 para 3D low-poly (D-044):** #15 completo (`threejs-geometry`, `-materials`, `-textures`, `-animation`, `-loaders`, `-asset-pipeline`) y #20 + `threejs-shaders`, mismo commit 0e18186, revisadas con búsqueda de comandos de red/ocultos (limpias). Herramientas: `@gltf-transform/cli` 4.5.1 y MCP `mcp-for-blender` 2.2.7 (versión ≥2 semanas; la 2.3.1 salió el 2026-11-18).
