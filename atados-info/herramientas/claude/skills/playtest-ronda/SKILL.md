---
name: playtest-ronda
description: Registra una ronda de playtest en docs/ITERACIONES.md con la plantilla de docs/PLAYTEST.md, separa hechos de opiniones y clasifica problemas en lectura, balance o bug.
---
1. Copia la plantilla de `docs/PLAYTEST.md` al final de `docs/ITERACIONES.md`; rellénala solo con lo que dijeron los jugadores (no inventes).
2. Hechos (intentos, dónde murieron, tiempos) separados de opiniones (citas literales).
3. Clasifica cada problema: **lectura** (no se entendió la amenaza), **balance** (números → solo `config.js`) o **bug** (reproducir con `?seed=N` antes de arreglar).
4. Cierra con `pnpm verify` y deja qué probar en la próxima ronda.
