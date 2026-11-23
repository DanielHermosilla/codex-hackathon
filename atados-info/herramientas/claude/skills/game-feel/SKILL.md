---
name: game-feel
description: Añade o ajusta juice (hit-stop, shake, partículas, flashes, sonido) con valores de partida seguros, todos en config.js. Úsalo cuando un golpe, daño o ataque "no se siente".
---
Valores de partida (ajustar jugando, siempre en `CONFIG`):
- **Hit-stop:** 0.04–0.06 s en golpe medio; 0.10–0.15 s en golpe grande o cambio de fase. Más de ~0.15 s se siente como fallo.
- **Shake:** modelo de "trauma": el trauma sube con el golpe y el desplazamiento usa trauma² con decaimiento en tiempo real (no en frames).
- **Partículas:** poolear; escalar cantidad por tamaño del golpe; nada de crear objetos por frame.
- **Flashes:** como máximo 3 por segundo (accesibilidad); respetar `prefers-reduced-motion` reduciendo shake y flashes.
- **Telegrafía antes del daño** por varios canales a la vez: forma en el piso, animación, sonido y color según la regla 4.
- Cada efecto se puede apagar en `CONFIG` o con `?dev` para comparar en playtest.
Verifica con `pnpm smoke` y mira la captura; el feel real se juzga jugando.
