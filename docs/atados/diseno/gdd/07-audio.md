# Sonido y música

> Estado: ✅ sin huecos abiertos (todas las decisiones del área cerradas). Cada afirmación cita su `[D-NNN]`.

## Música
- Mezcla: orquestal mística, folk antiguo, ambient atmosférico, electrónica orgánica [D-059].
- Adaptativa por capas: tema por zona, calmo en pasillo; al entrar al jefe se suman capas y cambia por fase [D-060, D-005].
- Música con licencia libre, registrada en `CREDITS.md` [D-061].
- Pistas dedicadas (con licencia libre) para el menú (motivo principal), fanfarria corta de victoria por jefe y tema de derrota [D-134, D-182].

## Efectos
- Por código (zzfx/WebAudio), afinados al gameplay [D-061].
- Cadena: eslabones metálicos más un zumbido armónico divino que sube de tono con la tensión. Avisa del daño [D-062].
- Cada ataque de jefe tiene su sonido de aviso propio [D-106].

## Voces
- Narrador en el prólogo [D-103]. TTS primero; si no da el estándar, lo graba el equipo [D-105]. No entra en el recorte [D-179].
- Gruñidos y esfuerzos de los protagonistas [D-103].
- Rugidos y frases de jefes [D-103, D-093].
- Pullas cortas entre Odo y Sael [D-104, D-181]: pocas, al arrastrar al otro, al revivir y en pasillos. Apagables [D-108].
  (D-108 citaba también «al lanzar al otro»; el lanzamiento no existe [D-144].)
- Voces y pullas de personajes son lo segundo que se recorta [D-117].

## Silencios dramáticos [D-183]
Set aprobado de 5+1 (detalle en [`propuesta-D107-silencios.md`](propuesta-D107-silencios.md)):
1. Umbral antes del jefe.
2. Nombre del jefe en la presentación (solo la primera vez [D-074]).
3. Cambio de fase.
4. Golpe final al jefe.
5. Muerte de ambos.
6. Prólogo: se apaga la Brasa Eterna.

- El zumbido de la cadena se mantiene durante los silencios [D-183].
- Nunca se calla un aviso de ataque [D-106] ni un sonido de daño [D-062].
- Fuera del set, a probar en playtest: muerte de un jugador, Tavor cierra la cadena, final [D-183].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `audio.silencios.momentos.<id>` | Duración, buses, nivel, quién lo rompe | ver propuesta | D-183 |
| `audio.silencios.blancos` | Sonidos que nunca se callan | cadena, avisoAtaque, golpeRecibido | D-183 |

## Ajustes
Volumen general, música, efectos y voces. Pullas on/off [D-112].
