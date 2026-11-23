# Propuesta para decisiones delegadas D-138 y D-139

> Estado: **aprobada**. D-138 → opción A [D-184]. D-139 → opción A [D-185].
> Aviso: la opción A de D-139 cita el lanzamiento del compañero y el jalón de dash [D-015, D-067] como formas de liberar la cadena. D-144 eliminó el lanzamiento del juego. Las formas de liberarse quedan para la ficha de Tavor.
> Reflejado en `02-cadena.md`, `03-arte.md` y `05-jefes.md`.
> L = largo base de la cadena [D-079].

---

## D-138 · Interacciones con el escenario
Criterio: no complejizar en este primer intento; base, pilares donde se enreda la cadena [D-048, D-138].

### Opción A (recomendada) · Solo pilares, que cambian por fase
- Pilares estáticos y sólidos. La física de la cadena hace el resto: se enreda, sirve de ancla fija, frena barridos [D-011, D-048].
- La transformación de arena entre fases quita o mueve pilares [D-025, D-088]. No hay pilares destructibles por el jugador.
- Arenas: Mirra, 4 espantapájaros → 2 (los devora) · Ondar, 6 bolardos → 4 → 2–3 (se hunden) · Tavor, 6 columnas → 4 → 3 (se derrumban).
- **Coste: bajo.** Colisionadores fijos y un guion de cambio por fase que la arena ya necesita.

### Opción B · A + un pilar que reacciona a la cadena por arena
- El pilar de cada arena cae si lo corta la cadena muy tensa y suelta una brasa de curación [D-030].
- Arenas: Mirra, espantapájaros que caen · Ondar, bolardos que se arrancan · Tavor, columnas que se agrietan.
- Riesgo: los jugadores gastan la arena en vez de pelear; menos pilares para enredar.
- **Coste: medio.** Estado por pilar, umbral de tensión, VFX y prueba de reinicio por semilla.

### Opción C · B + objetos que se usan contra el jefe
- Enredar al jefe contra un pilar lo inmoviliza; objetos atables a la cadena (barriles, campanas) para golpear.
- Arenas: Mirra, haces de trigal atables · Ondar, barriles del muelle · Tavor, campanas del tribunal.
- Choca con D-054: premia una táctica concreta. Agrega un sistema nuevo de física.
- **Coste: alto.**

**Recomendación:** A. Cumple D-048 y D-088 sin sistemas nuevos. B puede entrar después del primer playtest si los pilares se sienten pasivos.

---

## D-139 · Jefes que intentan separar o romper la cadena
Límites: los efectos sobre la cadena deben pasar poco [D-047]; la cadena rara vez es objetivo [D-091]; ningún jefe obliga a una táctica [D-054]; la cadena nunca se rompe (L1) [D-057], y D-020/D-022 asumen que siempre une a los dos.

### Opción A (recomendada) · Solo Tavor, en su fase final
- Tavor agarra la cadena por el medio e intenta partirla con el mazo (L1) [D-057]. «Sentencia final», máx. 1 cada ~25 s.
- Se libera tensando, con jalón de dash, lanzando al compañero o con el cadáver-mangual [D-013, D-015, D-067, D-070]. Si falla: daño y runas apagadas unos segundos. Nunca se rompe.
- Mirra no toca la cadena. Ondar solo la electrifica con la Tormenta (efecto D-047, no separa).
- **Coste: medio.** Un bloque nuevo `agarre_cadena`: fijar un eslabón a un punto móvil, leer tensión y cancelar con limpieza.

### Opción B · Ondar separa, Tavor rompe
- Ondar engancha la cadena con su ancla y la jala hacia el agua, separando o arrastrando a los dos. Tavor como en A.
- Escalada clara (1 → 2 → 3), pero la cadena pasa a ser objetivo en dos jefes: roza el límite de D-047.
- **Coste: medio-alto.** Reusa `agarre_cadena` con otro anclaje; más pruebas por el agua.

### Opción C · Los tres tocan la cadena
- Mirra la muerde y la retiene 1 s; Ondar la engancha; Tavor la intenta romper.
- Contradice «debe pasar poco» [D-047]. Mirra enseña la base y no debería complicarla.
- **Coste: alto.**

**Recomendación:** A. El momento queda único y climático en el jefe que forjó la cadena, y D-047 se respeta.

---

## Preguntas que dejan abiertas
- ~~Qué cuesta fallar la Sentencia final~~ → daño + runas apagadas 4 s [D-161].
- ~~Qué hace "electrificar" la cadena~~ → no corta durante ~2 s, sin quitar vida [D-157].
