# Skills, MCP y configuración de agentes (19-11-2026)

[V] = fuente abierta y verificada; [R] = solo búsqueda/blog, confirmar. Docs de Codex migraron a `learn.chatgpt.com`. Motor decidido: Three.js (20-11-2026); priorizar skills Three.js (p. ej. `three-webgl-game`). El concepto sigue abierto. Una skill es guía para el agente, no garantía.

## Modelos y config Codex
- GPT-6.2 **Astra** (difícil) y **Sol** (día a día), salieron 17-11-2026, en CLI/app; `/model`. [V https://learn.chatgpt.com/docs/whats-new/gpt-62-astra-sol]
- Perfiles sugeridos: `fast` = Sol effort low (números, copy); `deep` = Astra high (sistemas nuevos, bugs). Effort medium por defecto.
- `config.toml`: `model`, `model_reasoning_effort`, `approval_policy="on-request"`, `sandbox_mode="workspace-write"`, `web_search`. Capas: `~/.codex/config.toml` < perfil `--profile` < `.codex/config.toml` (repo trusted) < flags. Verificar con `/status`. [V https://learn.chatgpt.com/docs/config-file/config-basic]
- Comandos: `/plan` (Shift+Tab) antes de cada feature, `/review` (vs rama base / uncommitted / commit), `/resume`, `/fork`, `/compact`, `/subagents`, `/init`. Un chat por resultado. [V https://learn.chatgpt.com/guides/best-practices.md]
- Subagentes custom en `.codex/agents/*.toml` (name, description, developer_instructions); heredan sandbox; gastan más tokens. Ideas: `playtester` solo lectura, `balancer`. [V]
- Review en GitHub: activar Automatic review en chatgpt.com/settings/code-review o comentar `@codex review` (solo P0/P1). Reglas en `## Code Review Rules` del AGENTS.md más cercano. [V https://learn.chatgpt.com/docs/third-party/github]
- Colección oficial "Game development": juegos de navegador con playtest en vivo, loop de auto-evaluación, bug triage, review de PRs; recomienda combinar con generación de imágenes. [V https://learn.chatgpt.com/use-cases/collections/game-development]
- Blog OpenAI "How to build games with Astra": escenas de prueba nombradas (saltar a nivel X), exponer estado en `window.__debug` para tests, tests de recorrido con controles reales + capturas, concept art primero, feedback de juego real; FPS headless no es real; física, netcode y sync de audio requieren humano. [V https://developers.openai.com/blog/how-to-build-games-with-astra]

## Skills de juego
- **openai/plugins `game-studio`** (8k★, v0.1.2): game-studio (orquestador), web-game-foundations, phaser-2d-game, three-webgl-game, react-three-fiber-game, game-ui-frontend, sprite-pipeline, web-3d-asset-pipeline, game-playtest. Base recomendada en Codex (`/plugins`). Contenido de cada SKILL sin auditar.
- **Codex built-in**: `$imagegen` (gpt-image-2; sprites con chroma key → `remove_chroma_key.py`; salida en `~/.codex/generated_images/`) [R]; `$playwright-interactive` [R]; `$skill-creator`, `$skill-installer` [V]. Skills de repo en `.agents/skills/`.
- **gamedev-skills/awesome-gamedev-agent-skills** (9.5k★, Codex+Claude, auditorías pasadas): `game-feel` (19k installs; shake, hit-stop, easing, squash, flash, knockback, opción reducir shake; no toca simulación) — mayor retorno en "pulido". También `game-jam`, `prototype-fast`, `game-ui-ux`, `level-design`, `performance-optimization`, `itch-publish` (butler), y familias `godot-*`, `unity-*`, `unreal-*`, `phaser-arcade-physics`. `npx skills add gamedev-skills/awesome-gamedev-agent-skills --skill NOMBRE --agent codex|claude-code`.
- **MengTo/Skills** game-development: `create-game-vfx`, `design-game-encounters`, `build-game-audio-feedback` (Three.js-orientadas).
- **PlayableIntelligence/game-creator** (371★, MIT): Phaser 3/Three.js; game-assets (pixel art en código), game-designer, game-audio, game-qa, game-deploy; comandos `/game-creator:*`. ⚠ su audio usa `@strudel/web` (AGPL) → no usar esa parte si el repo es MIT. `npx skills add playableintelligence/game-creator -a codex`.
- **Phaser oficial**: skills en `.agents/skills/` del repo phaserjs/phaser (copiar). Solo si Phaser. [R]
- **willibrandon/pixel-plugin** (Claude, requiere Aseprite 1.3+): pixel art por lenguaje natural vía pixel-mcp.
- Audio procedural: no hay skill ZzFX; escribir una propia de ~30 líneas (ZzFX es dominio público, 1 archivo JS). Recomendado sobre ElevenLabs por licencia.
- No hay skills de shaders o level design de calidad que valgan la pena.

## MCP
- **Playwright** (39.9k★) `codex mcp add playwright npx "@playwright/mcp@latest"` / `claude mcp add playwright npx @playwright/mcp@latest`; `--caps vision` para canvas. Alternativa más barata en tokens: Playwright CLI skill (`npx skills add microsoft/playwright-cli --skill playwright-cli`). Uno de los dos. ⚠ canvas WebGL headless puede salir en blanco → capturar con `canvas.toDataURL()`; probar antes.
- **Chrome DevTools MCP** (58k★): perfil FPS, consola, red. `--slim`.
- **Blender MCP** (`uvx mcp-for-blender`, 35k★): Poly Haven CC0, Sketchfab, Meshy, Tripo, Hunyuan3D. ⚠ ejecuta Python arbitrario, socket sin auth → `BLENDER_MCP_SAFE_MODE=1`, guardar .blend.
- **Meshy MCP** `@meshy-ai/meshy-mcp-server` (API key de pago). **ElevenLabs** MCP local archivado → hosted `https://api.elevenlabs.io/v1/mcp` (OAuth, 10k créditos/mes free).
- Motor: Godot `Coding-Solo/godot-mcp`; Unity `CoplayDev/unity-mcp`, `IvanMurzak/Unity-MCP` (Codex+Claude). itch: no hay MCP, usar butler.

## Flujo de equipo
- **obra/superpowers** (Codex y Claude): using-git-worktrees, writing-plans, executing-plans, dispatching-parallel-agents, requesting/receiving-code-review, verification-before-completion, systematic-debugging, TDD. ⚠ sobre-planifica en 10 h; usar selectivo.
- Claude plugins oficiales: `feature-dev`, `code-review`, `frontend-design` (HUD/menús).
- Worktrees: no editar mismos archivos en paralelo; `git worktree add ../repo-x -b feature/x`; máx 3–4 sesiones paralelas (cuello = review humano). Encaja con harness de Dani (`feature/*` → `develop`, skills `new-feature`/`code-review`/`merge-feature`).

## Top 10 para preparar antes del lunes
1. Config Codex + perfiles fast/deep; AGENTS.md del repo con `## Code Review Rules`.
2. game-studio (leer web-game-foundations y game-playtest).
3. Playwright (CLI o MCP) + probar captura de canvas.
4. `game-feel`.
5. `@codex review` en GitHub (requiere admin del repo de Dani).
6. `$imagegen` con prompt-prefijo y paleta fija guardados.
7. Superpowers selectivo para devs.
8. Chrome DevTools MCP para rendimiento.
9. Skill propia ZzFX/Web Audio.
10. Blender MCP solo si se va a 3D.
Pendiente: leer SKILL.md de game-studio y game-creator; confirmar reglas del evento sobre plugins/assets.
