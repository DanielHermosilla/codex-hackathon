---
name: diseno-jefe
description: Diseña o revisa un jefe, fase o ataque nuevo: telegrafía, rol de cada jugador con la cadena, fases con patrones nuevos y entrada solo en config. Úsalo al crear o balancear jefes.
---
1. Todo ataque se telegrafía antes de dañar; el jugador debe morir por su error, no por sorpresa.
2. Define para cada ataque qué hace **cada uno de los dos jugadores** con la cadena (quién ancla, quién esquiva, quién ataca).
3. Una fuente de presión nueva a la vez; limita los ataques simultáneos.
4. Las fases cambian **patrones**, no solo vida y daño; el ritmo sube en densidad o velocidad, no en azar.
5. Cada fase y cada reintento arranca de un estado reproducible (`?seed=N`).
6. Diseño: ficha en `docs/jefes/` desde `_PLANTILLA.md`, respetando `docs/design/05-jefes.md`. Implementación: entrada en `CONFIG` combinando bloques de ataque cancelables; lógica de daño y fases en `src/gameplay/` con test.
7. Cierra con `pnpm verify`, captura de cada telegrafía y una ronda de playtest (skill `playtest-ronda`).
