# Géneros y estilos viables en 10 h (19-11-2026)
Imágenes: `https://cdn.akamai.steamstatic.com/steam/apps/{ID}/header.jpg` (IDs verificados HTTP 200). Orden: simple → complejo. Opciones abiertas; Diego descartó usar AtaDos como ejemplo/base.

## Géneros
| # | Género | Referentes (Steam ID) | Ref. jam/IA | Riesgo | Motor |
|---|---|---|---|---|---|
| 1 | Arcade de una mecánica | Downwell 360740, Super Meat Boy 40800, Geometry Wars 3 310790 | Paper Glider (OpenAI showcase), Lightkeeper | muy bajo; difícil que sea memorable | Canvas/Phaser/Kaplay |
| 2 | Puzzle | Baba Is You 736260, Into the Breach 590380, Mini Metro 287980 | Coalheart (#1 AI Jam 5) | código bajo, diseño de niveles alto | Phaser/Canvas |
| 3 | Survivor-like | Vampire Survivors 1794680, Brotato 1942280, Halls of Torment 2218750 | Last Flame (#1 Fun AI Jam 5) | bajo-medio; muy trillado → necesita giro | Phaser/Three |
| 4 | Boss rush | Titan Souls 297130, Cuphead 268910, Hades 1145360 | Hollowflux (showcase) | medio: telegrafías legibles | Three/Phaser |
| 5 | Plataformas | Celeste 504230, Hollow Knight 367520, Shovel Knight 250760 | Brick Platformer (showcase) | medio-alto: game feel humano | Phaser/Godot |
| 6 | Roguelite | Slay the Spire 646570, Dead Cells 588650, Balatro 2379780 | Twilight Mountain Defense (Seúl, no finalista, 70+ revisiones) | medio-alto: contenido y balance | Phaser/Godot/Three |
| 7 | Tower defense | Kingdom Rush 246420, Bloons TD 6 960090, PvZ 3590 | Carry the Light (#3 AI Jam 5) | medio; género "familiar" penalizó en Seúl [NV] | Phaser/Three |
| 8 | Coop local | Overcooked! 2 728880, Lovers in a Dangerous Spacetime 252110, PICO PARK 1509960 | Pies in the Skies (GMTK, online) | medio; sin netcode | Phaser/Three/Godot |
| 9 | Narrativo | Return of the Obra Dinn 653530, Papers, Please 239030, Disco Elysium | Emberwick (Willison) | medio: escritura, estado de misiones; LLM en vivo = riesgo de demo | HTML/Phaser |
| 10 | 3D low-poly | A Short Hike 1055540, Townscaper 1291340, Tiny Glade 2198150 | Capibaras Delivering Food (1.º Vibe Jam 2026) | medio-alto: cámara, colisión, agentes fallan en 3D | Three.js |
| 11 | Multijugador online | Lethal Company 1966720, Risk of Rain 2 632360 | fly.pieter.com, VibeSail | alto: netcode, hosting | Three + WebSocket/Colyseus |
Lectura: para 10 h, una mecánica pulida con gancho de una frase (premio "Tiny Masterpiece" en Codex Game Jam v2). Evitar online y roguelite de mucho contenido.

## Qué impresiona en una demo de 3–5 min (inferencia de fuentes)
1. Gancho entendible en 5 s. 2. Momento wow visual+sonoro en 10 s. 3. Anécdota de iteración con Codex (qué falló y qué decidió el humano). Ganadores Vibe Jam: low-poly Three.js con humor/personalidad; premios especiales por atmósfera, arte, pulido, originalidad (https://github.com/lappemic/awesome-ai-built-games).

## Estilos visuales
| Estilo | Referentes (ID) | Costo con IA en 1 día |
|---|---|---|
| Flat vector / formas | Mini Metro 287980, Thomas Was Alone 220780 | mínimo, todo en código, muy consistente |
| Siluetas | LIMBO 48000, INSIDE 304430 | bajo; luz y capas hacen el trabajo |
| ASCII/texto | Caves of Qud 333640, Dwarf Fortress 975370 | mínimo; gancho distintivo |
| Neón/shader | Geometry Wars 3 310790, Rez Infinite 636450, Neon White 1533420, Hotline Miami 219150 | bajo asset, alto impacto (bloom, partículas) |
| Low-poly | A Short Hike 1055540, Monument Valley 1927720, Firewatch 383870 | medio; geometría procedural Three.js |
| Pixel art | Celeste 504230, Hyper Light Drifter 257850, Katana ZERO 460950 | medio-alto: consistencia de paleta/animación, limpieza |
| Voxel | Teardown 1167630 | medio; rendimiento web |
| Papercraft | Paper Mario, Tearaway | alto; difícil consistente con IA |

## Herramientas de assets (verificar precio/licencia oficial antes de usar)
- gpt-image-1.5: fondo transparente por API; gpt-image-2 no (Codex `$imagegen` usa chroma key). ~US$0.03–0.06/img [NV].
- Meshy (3D): free CC BY 4.0; Pro ~US$20/mes privado. Tripo (3D): free público CC BY; Pro ~US$16–20.
- Retro Diffusion (pixel, pago único ~US$20–65), PixelLab ~US$12/mes, Scenario [NV].
- Suno: free = no comercial, no retroactivo; Pro ~US$10. ElevenLabs: restricciones a redistribuir SFX sueltos.
- Sin riesgo de licencia: arte procedural en código, ZzFX/jsfxr/WebAudio, Kenney CC0, Poly Haven CC0.
Detalle audiovisual en `audiovisual.md`.
