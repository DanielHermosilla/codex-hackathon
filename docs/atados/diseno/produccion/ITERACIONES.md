# Iteraciones

(Una entrada por ronda de playtest o decisión de diseño. Plantilla en `docs/PLAYTEST.md`.)

## Hito 1 — greybox de la cadena — 2026-11-20
**Pregunta del prototipo:** ¿es divertido tirar entre los dos de una cadena inextensible para cortar a un muñeco según la tensión?
**Qué hay:** `/` (coop) y `/?solo`; `?dev` abre el panel de ajuste. Física PBD propia (ADR-001). HUD de depuración con tensión por tramo, dps, total y número de golpe.
**Medido (smoke):** barrido tenso ≈ 62 de daño, barrido flojo 0; recorrido 7.00/7.00 m; enredo en pilar con tensión 0.98 y 3 tramos.
**Decisión mantener / matar / reajustar:** ✅ **mantener** (Diego, 2026-11-20 18:19) → D-187. Sin comentarios adicionales: no se ajusta config.
**Provisional por confirmar:** dash gana el tirón sin impulso extra (D-149 + D-144); en solo, dash Espacio y anclas Shift izq./Enter; sin mando en solo.

## Hito 2 — Mirra greybox — 2026-11-20
**Pregunta del prototipo:** ¿la cadena (cuchilla tensa, ancla, enredo en pilares) aguanta una pelea de jefe de 2–3 min con fases, telegrafías legibles y reintento rápido?
**Qué hay:** `/` arranca la pelea con Mirra (`?muneco` = greybox del hito 1). `?dificil` (telegrafías justas, D-055/D-172), `?solo`, `?seed=N`, `?dev` (panel de tensión/daño + Tweakpane), `?lang=en`.
- Sistema genérico de jefes en `src/gameplay/` (`jefe.js`, `bloques.js`, `combate.js`, `pool.js`): un jefe = datos en `CONFIG.jefes.<id>` que combinan bloques (`barrido`, `zona_circular`, `proyectil_arco`, `carga`, `zona_movil`, `tiron_radial`) y no-ataques (`transicion_fase`, `destello`, `burla`, `tambaleo`). Telegrafía → activo → recuperación; todo se cancela en cualquier paso y libera sus pools.
- Mirra: 2 fases por vida, transición invulnerable que devora 2 espantapájaros y siega el trigal, destello vulnerable, tambaleo por daño acumulado, burla al caer uno, derrota con frase y reintento (dash), victoria con lápida de stats y marcadores de drop placeholder. Textos en `src/i18n/` (es/en).
- Eventos para audio (D-106): `telegrafia_inicio {ataque, sonido}`, `ataque_activo`, `golpe_jugador`, `tambaleo`, `transicion_inicio`, `destello`, `burla`, `silencio {motivo}`, `jefe_muere`, `derrota`, `victoria` (en `window.__game.eventos` / `onEvento`).
**Medido (tests + smoke):** telegrafía Siega 1,2 s normal / 0,7 s difícil; Grano siempre deja una salida alcanzable para los dos (150 semillas × 2 dificultades); Hambre contra la cadena tensa con los dos anclados: se corta por su propia velocidad y tropieza 1,5 s; dash en el paso del impacto protege; capturas `test-results/03-mirra-*.png` revisadas.
**Revisión Codex (gpt-6.1-sol), 4 rondas → approve.** Arreglado con test de regresión: (1) el empuje del cuerpo sacaba al objetivo del frente de Hambre (la carga no dañaba a quien se quedaba quieto); (2) el dash del paso del impacto se procesaba después del golpe; (3) Hambre dañaba todo el tramo ya recorrido; (4) un empuje a dos anclados estiraba la cadena (el último recurso del solver restauraba posiciones ya empujadas); (5) el dash mantenido de un jugador bloqueaba el reintento del otro.
**Para Diego (choque de números de la ficha, no de decisiones):**
- Hambre: la ficha da ancho 1 L = largo de la cadena. Así los dos no caben fuera de la línea a lados opuestos (rol del «otro» D-164 imposible). Provisional `anchoL: 0.6`.
- Mordida del Banquete y hoja de la Siega: la ventana activa debe durar ≤ `dash.duration` (0,18 s) para que el dash a tiempo esquive (D-014). Provisional: mordida 0,1 s; la Siega barre el arco en 0,2 s y golpea cuando la hoja pasa por cada jugador.
**Provisional por confirmar:** «el que más daño hace» usa la atribución de D-165 con memoria de 8 s (P-31); en difícil caer los dos reinicia la pelea con la presentación completa (no hay rush aún, D-172); daño por tick del Enjambre ignora la invulnerabilidad tras golpe (si no, 0,8 s se come los ticks de 0,5 s); pilares devorados = dos opuestos; vida en solo ×0,85; duraciones de presentación (4 s / 1,6 s), transición 1,6 s, destello 1,5 s; velocidad 3 m/s y pausas 1,8 s de Mirra; tirón 3,5 m/s.
**Decisión mantener / matar / reajustar:** ✅ **mantener** (Diego, 2026-11-20 20:32) → D-189.
