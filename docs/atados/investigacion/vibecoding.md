# Mejores prácticas de vibecoding de juegos (19-11-2026)
[NV] = no verificado en fuente primaria. Fuentes primarias: Codex browser-games https://learn.chatgpt.com/use-cases/browser-games · Codex best practices https://learn.chatgpt.com/guides/best-practices · Claude Code https://code.claude.com/docs/en/best-practices.md · Anthropic long-running agents https://anthropic.com/engineering/effective-harnesses-for-long-running-agents · OpenAI "build games with Astra" https://developers.openai.com/blog/how-to-build-games-with-astra

## Flujo base (oficial Codex)
1. `/plan` → `PLAN.md`: objetivo del jugador, loop, controles, victoria/derrota, progresión, dirección visual, stack/hosting, hitos. Brief vago = primera versión peor.
2. `AGENTS.md` corto: estructura, comandos run/build/test, convenciones, prohibiciones, definición de "terminado". Cuando el agente repite un error → retrospectiva → regla nueva. Reglas durables en AGENTS/skills, no en prompts.
3. Skills: playwright-interactive, imagegen (guardar prompts en `.prompts/` para lotes consistentes), docs del framework (Context7 MCP).
4. Iterar en rondas cortas con feedback de juego real + capturas. La primera versión con muchos assets "puede tomar horas" → limitar assets.

## Prompting
- Plantilla: Objetivo + Contexto (@archivos) + Restricciones ("demo jugable, sin features no pedidas, números en config") + Hecho cuando (checks medibles + captura + test limpio).
- Una mecánica por prompt; probar antes del siguiente; follow-ups más chicos que el original; revertir si empeora.
- Codex tiende a sobre-construir prompts abiertos (Rundown /goal).
- Tras 2 correcciones fallidas: `/clear` + mejor prompt. Vigilar el primer minuto, Esc si deriva.
- Para diversión: pedir explícitamente "make it a LOT more fun / surprise and delight" (Willison https://simonwillison.net/2026/oct/28/vibe-game-development). El cuello de botella ya no es ejecutar sino el concepto.
- Feel: lenguaje sensorial ("controles pegajosos, hazlos más snappy").

## Verificación (lo que más mejora resultados)
- Pedir evidencia (comando + salida, captura), no "tests pasan". Compila ≠ funciona.
- Automatización de navegador "como humano" detecta muchos más bugs que unit tests (Anthropic).
- Bucle determinista (skill develop-web-game): `window.advanceTime(ms)` paso fijo; `render_game_to_text()` vuelca estado; capturas que el agente debe abrir y mirar; capturar errores de consola; si WebGL headless sale negro → headed o `canvas.toDataURL()`.
- Escenas de prueba nombradas (saltar a nivel/jefe X), estado expuesto en `window.__debug`.
- Lista de features en JSON con `passes` (el modelo la corrompe menos que markdown) + log de progreso + commits descriptivos; una feature por sesión.
- FPS headless no es real; medir en navegador real.

## Lo que el agente hace mal (reservar humano)
- Game feel (salto, fricción, coyote time), netcode (introduce más bugs de los que arregla), sincronía de audio, música (falló en Seúl, Inven), espacio 3D sin plantillas, APIs de motor inventadas, scripts gigantes, estado global disfrazado de máquina de estados (post-mortem Godot https://forum.godotengine.org/t/post-mortem-of-my-failed-attempt-to-vibe-code-a-metroidvania-game/137567).
- Assets inconsistentes → fijar estilo y prompt-prefijo desde el minuto 0.

## Equipo de 4 en paralelo
- Ownership disjunto de archivos; compartidos = solo lectura declarados en AGENTS.md; si dos tareas tocan lo mismo, serializar.
- Un worktree por tarea (`git worktree add`, Claude `claude -w`); script de setup; PR borrador temprano para ver solapes.
- Integrador único (humano o agente líder) mergea en orden de dependencia y corre suite tras cada merge; merge limpio puede romper semántica.
- Máx 3–4 sesiones paralelas: el cuello es el review humano. Más agentes ≠ lineal en tokens.
- Puntos típicos de colisión: archivo de config, entrypoint/índice, loop principal → dueño único.
- Encaja con el harness de Dani (`feature/*` → `main`, new-feature / code-review / merge-feature).

## Casos
- Ganador Vibe Jam 2026 (capibaras delivery, Claude Code + Three.js, 2 semanas): 2–3 sesiones paralelas en zonas distintas; hizo que el agente le construyera un editor propio de niveles; ~188 commits [NV]; un gancho claro, no un sistema enorme.
- fly.pieter.com (Levels, feb-2025): Cursor + Claude + Three.js, construido en vivo en X.
- Lecciones Build Week: IA en roles acotados y verificables; lo determinista en código; UX pequeño pero pulido.

## Para el pitch (criterio "iteración con Codex")
Guardar un "Build Receipt" (formato Codex Game Jam v2): fantasía del jugador, qué hizo mal la IA, qué decisión humana cambió el juego, mecánica final en acción, capturas/video <45 s. Registrar cada ronda de playtest durante el día.
