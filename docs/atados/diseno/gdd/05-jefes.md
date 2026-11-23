# Jefes: sistema general

> Estado: 🟡 parcial. Cada afirmación cita su `[D-NNN]`. Fichas individuales en `../jefes/` (las escribe otro agente):
> [Mirra](../jefes/mirra.md) · [Ondar](../jefes/ondar.md) · [Tavor](../jefes/tavor.md)

## Cantidad y orden
3 jefes en la demo, orden fijo [D-024, D-026]:

| # | Jefe | Lore | Tamaño | Fases | Duración | Arena |
|---|---|---|---|---|---|---|
| 1 | Mirra la Hambrienta | Diosa menor corrompida, cosecha, Gula | ~4×, fijo | 2 | 2–3 min | Trigal |
| 2 | Ondar el Ahogado | Dios menor corrompido, mar, Ira | ~6× | 3 | 3–4 min | Muelle que se hunde |
| 3 | Tavor el Juez | El dios que se volvió malvado, Soberbia | ~8× → ~4× → ~2× | 3 | 5–6 min | Sala del juicio |

Fuentes: [D-041, D-043, D-058, D-085, D-088, D-128, D-141, D-153, D-154, D-159].
Sin jefes secretos ni opcionales en la demo [D-115]. Los jefes no invocan esbirros [D-163].

## Qué prueba cada jefe
- Todas las tácticas de cadena sirven contra cualquier jefe. Ninguno obliga a una forma [D-054].
- Daño igual en todo el cuerpo [D-092]. Único punto débil: la esquirla de Tavor en su fase final [D-160].
- Mirra no crece: su gula se ve en que devora la arena [D-154].

## Fases
- El cambio de fase lo dispara la vida: Mirra 2, Ondar 3, Tavor 3 [D-153].
- Transición corta, con el jefe invulnerable mientras cambia la arena [D-153].
- Entre fases cambian los patrones, la forma, la arena y el ritmo [D-025]. Los pilares se quitan o mueven [D-184].
- La música suma capas y cambia por fase [D-060]. Silencio breve en el cambio [D-183].
- Curación: brasas al cambiar de fase en Ondar y Tavor; ninguna en Mirra [D-171].
- Si mueren los dos, se reintenta el jefe completo [D-028].

## Ataques: estructura
- Un jefe es datos en config que combinan bloques de ataque reutilizables. Sin código por jefe (regla técnica 2, `AGENTS.md`).
- Todo ataque se cancela en cualquier frame y limpia lo que creó (regla técnica 3).
- **Todo ataque da un rol a cada jugador** [D-164]. Obligatorio en las fichas.
- Cada ataque tiene su sonido de aviso propio [D-106].
- Efectos sobre la cadena: poco frecuentes [D-047]. Electrificada: no corta ~2 s, sin quitar vida [D-157].

Campos mínimos de un bloque: `telegraph` (visual + sonido) · `windup` · `active` · `recovery` · `target` · `damage` · `area` · `roles` (qué hace cada jugador, [D-164]). Los nombres son técnicos; los valores van en cada ficha.

## Objetivos [D-091]
- El jugador más cercano o el que más daño hace.
- Áreas que cubren a los dos.
- Rara vez, la cadena.

❓ Pregunta abierta (P-31): «el que más daño hace» ¿usa la atribución por cercanía de D-165?

## Contacto
- El cuerpo del jefe solo empuja, no daña [D-152].
- Si el jefe carga contra la cadena tensa, se corta [D-148].
- Caer al agua en Ondar: daño y vuelve junto al compañero [D-158].

## Telegrafía y justicia
- Generosas en normal, justas en difícil [D-055, D-172].
- En solo, algo más largas [D-121].
- Sonido de aviso propio por ataque [D-106].
- Los VFX nunca tapan un aviso [D-089].
- Colores de peligro y aviso: aprobados en v2 [D-188] (`CONFIG.paleta`): aviso rosa que se llena de peligro carmesí; marcas planas, sin bordes.
- Meta: 2–4 intentos por jefe para jugadores medios [D-109]. Reintento muy rápido [D-173].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `difficulty.normal.telegraphMult` | Multiplicador de telegrafía en normal | ❓ | D-055 |
| `difficulty.hard.telegraphMult` | Multiplicador en difícil | ❓ | D-055 |
| `solo.telegraphMult` | Multiplicador en solo | ❓ | D-121 |

## Jefes contra la cadena
- Solo Tavor intenta romperla, en su fase final. Nunca se rompe [D-185].
- Fallar su Sentencia final: daño y runas apagadas 4 s [D-161].
- Mirra no toca la cadena. Ondar solo la electrifica [D-185, D-157].

❓ Pregunta abierta (P-34): con las runas apagadas [D-161], ¿la cadena corta?
❓ Pregunta abierta (P-36): ¿cómo se libera la cadena de la Sentencia final? La propuesta aprobada [D-185] citaba tensar, jalón de dash, lanzar al compañero y el cadáver-mangual. El lanzamiento ya no existe [D-144] y el jalón de dash queda en duda (P-32). Lo resuelve la ficha de Tavor con D-164.

## Personalidad [D-093]
- Reaccionan al dolor: tambaleo de ~1 s por daño acumulado en poco tiempo [D-155].
- Se burlan o gesticulan, p. ej. cuando muere un jugador.
- Destellos del dios bueno: pausa real de 1–2 s sin ataques, ventana de castigo [D-156].
- Frase corta al presentarse y al morir.
- Rugidos y frases con voz [D-103].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `boss.stagger.duration` | Tambaleo | ~1 s | D-155 |
| `boss.stagger.damageWindow` | Ventana de daño acumulado | ❓ | D-155 |
| `boss.stagger.damageThreshold` | Daño que lo dispara | ❓ | D-155 |
| `boss.glimpse.duration` | Pausa del destello | 1–2 s | D-156 |

## Presentación
- Al llegar, el ambiente pasa a modo batalla y hay una mini presentación [D-006].
- Título: nombre corrupto grande y el antiguo tachado debajo [D-064, D-180]. Luego barra de vida [D-064].
- Completa la primera vez; saltable en reintentos [D-074].
- La cámara encuadra a los dos jugadores y al jefe [D-033, D-176].
- Silencios: en el umbral y antes del nombre (solo la primera vez) [D-183].

## Muerte del jefe
- Silencio en el golpe final; frase de muerte y fanfarria [D-183, D-093, D-134].
- El muerto revive con vida llena [D-020, D-167].
- Su esquirla se incrusta en la cadena (narrativa) [D-169].
- Suelta un ítem para cada jugador, de su pool temática; aparte de la esquirla [D-031, D-078, D-169].
- Tavor no suelta drop: su esquirla abre el final [D-162].
- Drop extra si lo vencen sin que ninguno reciba daño [D-099, D-174].
- Lápida en la arena con las stats del combate [D-098, D-100, D-174].

## Derrota
- Si mueren los dos: silencio, pantalla con frase del jefe y reintentar [D-183, D-111]. Tema de derrota [D-134].
- En difícil: reinicia el rush [D-029, D-172].

## Modo solo
- Algo menos de vida del jefe [D-121].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `boss.<id>.hp` | Vida de cada jefe | ❓ | D-141 |
| `boss.<id>.phaseHp` | Umbrales de vida por fase | ❓ | D-153 |
| `boss.phaseTransition.duration` | Transición invulnerable | ❓ (corta) | D-153 |
| `solo.bossHpMult` | Multiplicador en solo | ❓ | D-121 |
