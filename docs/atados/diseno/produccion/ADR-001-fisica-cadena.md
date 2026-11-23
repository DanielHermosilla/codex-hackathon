# ADR-001 — Física de la cadena: PBD propio en 2D, no Rapier

- Fecha: 2026-11-20 · Estado: aceptado · Hito 1 (greybox de la cadena)
- Decisiones que lo condicionan: D-011, D-013, D-019, D-022, D-048, D-079, D-137, D-147, D-148, D-149, D-150, D-184.

## Contexto
La cadena es física real de eslabones (D-011) y es el arma. El juego es plano: sin salto ni verticalidad (D-019).
Hay dos caminos: `@dimforge/rapier3d-compat` (ya instalado) o un solver propio de posiciones (Verlet + PBD).

## Comparación por criterio

| Criterio | Rapier 3D (WASM) | PBD propio 2D (XZ) |
|---|---|---|
| Enredo en pilares (D-048, D-184) | Sí, colisión eslabón–cilindro; con eslabones rápidos hace falta CCD | Sí: proyección de partículas **y segmentos** fuera de círculos; pilares estáticos = trivial |
| Largo fijo inextensible que arrastra (D-022) | Cadenas de joints ceden bajo carga (error del solver crece con N); hay que subir iteraciones o hacer trampas | Restricción de **largo de recorrido** (suma de eslabones ≤ L) resuelta como PBD sobre todas las partículas: inextensible por construcción, error < 2 % medido en test |
| Quién arrastra (D-149), ancla absoluta (D-150), dash gana | Cambiar tipo de cuerpo (kinematic) o masas en caliente, contactos con el suelo, fricción: ajuste indirecto | Peso inverso por extremo: ancla = 0, dash = masa × `dash.massMult`, cadáver = `corpse.mass`. Directo y legible |
| Tensión = rectitud por tramo (D-147) | Igual de fácil (se calcula de posiciones) pero hay que sacar los contactos del motor | Los contactos con pilar ya los conoce el solver; tramos = cortes en esos contactos |
| Corte que atraviesa al jefe (D-148) | Sensores o grupos de colisión | La cadena no colisiona con cuerpos: solo se mide solape segmento–círculo y velocidad relativa |
| Determinismo, paso fijo, `?seed` | Determinista en la misma plataforma; build determinista aparte | JS puro, paso fijo, sin azar: mismo input → mismo estado |
| Testabilidad en Node | Requiere `await RAPIER.init()` en cada test; estado opaco dentro de WASM | Funciones puras sobre arrays; Vitest directo |
| 60 fps (D-137) | Sobrado | ~24 eslabones × 24 iteraciones en 2D: microsegundos por paso |
| Coste de integración | Mundo 3D, cuerpos, colliders, sincronía con three | ~300 líneas en `src/gameplay/` |

## Decisión
**Solver propio Verlet + PBD en el plano XZ** (`src/gameplay/cadena.js`). Rapier no se usa en el hito 1.

Modelo:
1. Jugadores: integración por velocidad (impulso proporcional a la entrada; el dash fija velocidad).
2. Eslabones: Verlet con fricción de suelo; restricciones de distancia **de desigualdad** (la cadena se afloja, no se estira).
3. Solver en dos fases por paso: (a) con los jugadores fijos, los eslabones se arrastran tras ellos y rodean pilares; (b) restricción global de recorrido `S ≤ L`: primero una versión blanda con gradiente en todas las partículas (los eslabones, livianos, enderezan sus codos; desplazamiento limitado por iteración porque cerca de la recta el gradiente interior se anula y la proyección se dispara), y al final un cierre exacto que solo acorta el primer y último eslabón a lo largo de sí mismos, repartido por peso inverso. Ese cierre garantiza el largo sin meter la cadena en los pilares. Es lo que transmite la fuerza (D-013) y decide el arrastre (D-022, D-149).
   El cierre recoge cadena sobre la polilínea (amontona eslabones en el extremo) y, si eso mete a un jugador en un cuerpo, lo saca y deja que pague el otro: no atravesar cuerpos tiene prioridad.
   Último recurso: si largo y colisión no se pueden cumplir a la vez (ancla + choque contra el muñeco atravesado por la cadena), se cancela el paso y se vuelve al estado anterior (0,02 % de los pasos en 30 secuencias aleatorias de 60 s; `world.solverReverts`).
   Historia: una versión que movía solo a los extremos dejaba el interior clavado como un ancla; otra con solo el gradiente global estiraba la cadena a más del doble con dashes diagonales; el primer cierre recreaba largo tras eslabones colapsados y metía jugadores en el muñeco (hallazgos de Codex). Todo tiene test de regresión por paso.
4. Colisión de partículas y segmentos con pilares; jugadores con pilares, muñeco y borde.
5. Tensión por tramo: tramos libres = cuerda / largo nominal; tramos enrollados = extensión limitada por el tramo libre vecino. Curva continua a 0..1.

## Consecuencias
- La cadena es 2D: la caída visual (comba) la hace el render según la tensión. Si un jefe pide altura real, se revisa.
- Si algún día hace falta física de cuerpos rígidos (escombros, objetos), Rapier puede convivir para eso sin tocar la cadena.
- Todos los parámetros técnicos (`chain.iterations`, `chain.friction`, `chain.linkCount`) están en `CONFIG` y se pueden ajustar con `?dev`.
