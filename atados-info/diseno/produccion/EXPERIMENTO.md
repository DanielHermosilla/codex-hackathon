# Experimento: un prompt vs. dirección + herramientas

Comparar AtaDos (con preproducción, skills, agentes) contra un juego hecho de un solo prompt sin dirección.

## Línea de tiempo
| Evento | Fecha y hora |
|---|---|
| Inicio del andamiaje | 2026-11-20 13:43 |
| Andamiaje listo (`pnpm verify` pasa) | 2026-11-20 13:44 |
| Inicio de la entrevista | 2026-11-20 13:46 (aprox.) |
| Fin de la entrevista | 2026-11-20 15:50 |
| Inicio de la producción (sesión orquestadora) | 2026-11-20 15:56 |
| Fin de preproducción (hito 0) | 2026-11-20 16:20 (pitch aprobado, D-146) |
| Primera versión jugable (hito 1) | 2026-11-20 18:15 (greybox integrado; Diego: mantener, D-187) |
| Primer jefe completo (hito 2) | 2026-11-20 20:32 (Mirra greybox; mantener, D-189) |
| Demo final | |

## Métricas
| Métrica | AtaDos | Un prompt |
|---|---|---|
| Decisiones registradas antes de codear | 185 (D-001…D-185) | 0 |
| Tiempo hasta primera versión jugable | | |
| Tiempo total | | |
| Nº de jefes | | |
| Bugs por ronda de playtest (media) | | |
| Valoración Diego (1–10): diversión / claridad / arte / sonido | | |
| Valoración de terceros (1–10) | | |
| Líneas de código | | |

## Notas cualitativas
- 2026-11-20: 141 decisiones al cerrar la entrevista (~27 rondas). A mitad: 78 decisiones registradas en ~12 rondas de entrevista (D-000…D-078). Diego cambió de 2.5D a 3D low-poly a mitad de entrevista (D-044): cambio barato porque aún no había código.
- El lore se eligió en dos rondas de propuestas (3 + 3); la premisa salió de mezclar ideas de la primera ronda.
- 2026-11-20 16:20: tanda de producción 1 (39 preguntas + 3 propuestas delegadas) respondida en una sola vuelta; 44 decisiones nuevas (D-142…D-185). Diego eliminó el lanzamiento del compañero del juego entero (D-144) y pidió colores de gameplay más planos y menos neón (D-143).
- 2026-11-20 18:19: hito 1 cerrado con «mantener» al primer playtest, sin reajustes. Codex sol encontró 4 fallos reales de física en 4 pasadas antes de aprobar.
- 2026-11-20 20:32: hito 2 cerrado con «mantener» al primer playtest. Codex sol: 5 fallos reales en 4 rondas. El implementador detectó 2 números de la ficha que hacían imposible el rol pedido y los corrigió (provisional → aprobado en D-189).
- 2026-11-20 20:35: tanda 2 (10 huecos) aprobada en bloque → D-190…D-199. Total 199 decisiones.
