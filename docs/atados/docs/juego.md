# El juego

## Tipo de juego
**Boss rush cooperativo local** (sofá coop) en **3D low-poly**, para el navegador, hecho con three.js. Dos jugadores en el mismo computador (teclado compartido o 1–2 mandos), o una persona sola moviendo a los dos. Partida completa: 15–20 min. [D-010, D-016, D-032, D-044]

## La mecánica: la cadena es el arma
- Los dos personajes están unidos por una cadena física de largo fijo. No hay otra arma. [D-011, D-079]
- **La tensión refuerza el corte.** A igual velocidad y contacto, la cadena floja inflige el 25 % del daño de una completamente tensa. Sin combos. [D-012, D-068, D-081]
- Golpes básicos con uno; los fuertes piden a los dos tirando hacia lados opuestos. [D-017]
- La cadena se enreda en pilares. En el largo máximo, el que tira más fuerte arrastra al otro; el dash siempre gana el tirón. [D-022, D-048, D-190]
- Botones por jugador: mover, **dash** (invulnerable, cooldown 0,6 s) y **ancla** (mantener: te clavas y el otro gira alrededor). Sin salto. [D-019, D-069, D-122]
- Si uno muere, su **cadáver queda atado** y el otro lo arrastra y lo usa **como mangual**. Revive al terminar el jefe. [D-020, D-070]
- Sin fuego amigo. Se eliminó lanzar al compañero. [D-023, D-144]

## La Brasa Eterna
Sael roba para alimentar a su familia y a su pueblo. Odo saquea tumbas para pagar sus deudas y sacar a su hermano de prisión. Durante un robo en el **Templo Celestial**, los dos apagan la **Brasa Eterna**. Los siete dioses de Hestera se corrompen y entran en guerra. Tavor, un juez antes benevolente y generoso, los destierra y los une con la **Cadena del Castigo Eterno**. El bronce de la urna conserva poder suficiente para cortar a los dioses. [D-128, D-217]

[Historia y prólogo](../diseno/gdd/01-setting-lore.md).

## Jefes
| Jefe | Virtud → pecado | Arena | Fases | Duración |
| --- | --- | --- | --- | --- |
| **Mirra, la Hambrienta** (árbol-langosta, ~4×) | Generosidad → gula | Trigal seco con espantapájaros | 2 | 2–3 min |
| **Ondar, el Ahogado** (agua negra con ancla, ~6×) | Templanza → ira | Muelle que se hunde | 3 | 3–4 min |
| **Tavor, el Soberbio** (8× → 4× → 2×) | Justicia → soberbia | Sala del juicio, de noche | 3 | 5–6 min |

Cada ataque tiene telegrafía visual y sonido propio; cada uno da un rol a cada jugador. Los jefes se burlan, reaccionan al dolor y muestran destellos del dios bueno (pausa real para castigar). Solo Tavor intenta romper la cadena, en su fase final. Fichas completas en [diseno/jefes/](../diseno/jefes/).

## Progresión
- Rush lineal: pasillo (1–2 min, calmo, murales de lore, enemigos fáciles) → jefe → pasillo… El primer pasillo es el tutorial. [D-004, D-026, D-066]
- **Drops** en el mundo y uno por jugador al morir cada jefe (pool temática): mejoras de cadena (compartidas), de personaje, curación e ítems con lore, con **sinergias** entre los dos. Sin tienda. [D-030, D-078, D-095, D-096, D-097]
- **Lápida** con stats en la arena al vencer un jefe; drop extra sin recibir daño. [D-098, D-099]
- Normal exigente y justo (2–4 intentos por jefe); **difícil** reinicia todo el rush. [D-109, D-029]
- Post-demo: meta-progresión estilo Isaac, finales alternativos. [D-027]

## Arte y sonido
Hora dorada que avanza a la noche, cadena de bronce/oro con runas, corrupción en ámbar. Referencias: Tunic, Death's Door, Journey, Hades, The Last Campfire. Música adaptativa por capas, zumbido de la cadena que sube con la tensión, silencios dramáticos. HUD diegético: la vida va en el anillo de cada jugador. [D-036, D-049, D-060, D-062, D-063, D-188]

## Estado del prototipo original al empezar la hackatón
Jugable: la pelea completa contra Mirra con arte, HUD, audio y música. Hecho en otra rama: pasillo 1 con tutorial. Falta: Ondar, Tavor, drops, prólogo, menú, ajustes.
