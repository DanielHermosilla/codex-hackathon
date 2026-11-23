# Dependencias

Versiones usadas en AtaDos (Mac de Diego, noviembre 2026). Para instalar el proyecto actual, sigue el [README principal](../../README.md).

## Librerías del juego (npm, con pnpm)
| Paquete | Versión | Para qué | Licencia |
| --- | --- | --- | --- |
| `three` | 0.187.0 (fijada) | Motor 3D | MIT |
| `@dimforge/rapier3d-compat` | ^0.21.0 | Física (evaluada; la cadena usó solver propio, ver ADR-001) | Apache-2.0 |
| `zzfx` | ^1.4.0 | Efectos de sonido por código | MIT |
| `tweakpane` | ^4.0.5 | Panel de ajuste en vivo (`?dev`) | MIT |

## Desarrollo y pruebas
| Paquete | Versión | Para qué |
| --- | --- | --- |
| `vite` | ^8.3.8 | Servidor y build |
| `vitest` | ^5.1.1 | Tests de lógica pura |
| `playwright` | ^1.65.1 | Smoke en Chromium headless con capturas |
| `@playwright/mcp` | ^0.0.86 | MCP para que el agente juegue en el navegador |
| `@gltf-transform/cli` | 4.5.1 | Optimizar GLB (meshopt + webp) |

## Herramientas locales
| Herramienta | Versión | Instalación (Mac) |
| --- | --- | --- |
| Node | 26.13 | `brew install node` |
| pnpm | 12.16 | `corepack enable` o `brew install pnpm` |
| Blender | 5.3 | blender.org (modelos por script Python → GLB) |
| uv / uvx | 0.13 | `brew install uv` (lanza el MCP de Blender) |
| ImageMagick | 7.1 | `brew install imagemagick` |
| ffmpeg | 9.0 | `brew install ffmpeg` (el de brew no trae libvorbis: usar Opus u `-strict -2`) |
| Codex CLI | 0.170 | revisión adversarial |
| `rg`, `fd`, `jq` | — | `brew install ripgrep fd jq` |

## MCP
| Servidor | Comando | Nota |
| --- | --- | --- |
| playwright | `pnpm exec playwright-mcp` | Navegar, teclas, leer `window.__game`, capturas |
| blender | `uvx mcp-for-blender==2.2.7` | `DISABLE_TELEMETRY=true`; Blender abierto con el addon |

## Assets de terceros usados
Música CC0 / CC BY 4.0 de OpenGameArt (RandomMind, Emma_MA, North Fantasy Music, cynicmusic) y fuentes OFL (Cinzel, Cormorant Garamond). Detalle en [diseno/candidatos-musica.md](diseno/candidatos-musica.md).
