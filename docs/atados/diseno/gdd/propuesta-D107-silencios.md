# Propuesta D-107 · Silencios dramáticos

> Estado: **aprobada** [D-183]. Entra el set mínimo 5+1 de la recomendación; el zumbido de la cadena se mantiene en los silencios. Los opcionales (5, 8, 9) se prueban en playtest. Duraciones de partida: se ajustan en playtest.
> Reflejado en `07-audio.md`.

## Regla base
- El silencio es un recurso escaso. Si se usa siempre, deja de pesar.
- **Nunca se calla un aviso de ataque** [D-106] ni un sonido que avise daño [D-062]. Con combate vivo, el silencio solo afecta música y ambiente.
- El zumbido de la cadena [D-062] es el hilo del juego: la cadena es lo que los ata y lo único que hiere dioses (L1, [D-057]). En los silencios **se mantiene como único sonido**, a volumen normal. Así el silencio "suena a cadena" y el aviso de tensión nunca se pierde.

## Momentos candidatos

| # | Momento | Qué se calla | Duración | Qué lo rompe | Por qué | Nivel |
|---|---|---|---|---|---|---|
| 1 | Umbral antes del jefe (puerta de la arena) | Música del pasillo y ambiente; queda la cadena y pasos | 1,5–2,5 s | Primer golpe de la música de batalla + rugido [D-006, D-060] | Corte entre calma y batalla; marca el cambio de modo | Imprescindible |
| 2 | Nombre del jefe en la presentación | Música (la presentación ya arrancó) | 0,6–1 s antes del nombre | Golpe grave + frase corta del jefe [D-093] | El nombre cae sobre vacío y se recuerda | Imprescindible |
| 3 | Cambio de fase | Capas de música y ambiente durante la transformación | 0,8–1,2 s | Entra la capa de la fase nueva con un golpe [D-025, D-060] | Respiro y aviso: "cambian las reglas" | Imprescindible |
| 4 | Golpe final al jefe | Todo, menos la cadena | 1–1,5 s (con hitstop) | Frase de muerte del jefe y luego fanfarria [D-093, D-134] | El golpe ganador se siente propio y enorme | Imprescindible |
| 5 | Muerte de un jugador | Solo la capa alta de la música (baja, no corta) | 0,5 s de hueco y vuelta al 60 % | Burla del jefe [D-093] | Pesa sin frenar: el otro sigue peleando arrastrando el cuerpo [D-020] | Opcional |
| 6 | Muerte de ambos | Todo | 1,5–2 s | Frase del jefe en la derrota y tema de derrota [D-111, D-134] | La derrota necesita un instante de vacío antes del texto | Imprescindible |
| 7 | Prólogo: se apaga la Brasa Eterna | Narrador y música | 1,5–2 s tras el golpe de la urna | Siete esquirlas (agudo, una por dios) y vuelve la música en menor | Es el crimen: el centro del lore [D-037, D-072] | Imprescindible (cuenta como uno del set) |
| 8 | Prólogo: Tavor cierra la cadena | Música; quedan chispas de forja | 0,8 s antes del cierre | "Clac" de grillete + primer zumbido de la cadena + sentencia de destierro de Tavor | Presenta el sonido que será el hilo de todo el juego | Opcional (unir con 7 si el prólogo queda largo) |
| 9 | Final: la Brasa se reforma | Música | 2–3 s | Latido grave de la Brasa encendida y tema final [D-101] | Cierre del arco culpa y reparación | Opcional (es post-boss rush; demo según alcance) |

## Recomendación: set mínimo (5 + 1)
1. **Umbral del jefe** (1).
2. **Nombre del jefe** (2). Solo la primera vez; en reintento la presentación se salta [D-074] y el silencio también.
3. **Cambio de fase** (3).
4. **Golpe final** (4).
5. **Muerte de ambos** (6).
6. En el prólogo, **un solo** silencio: se apaga la Brasa Eterna (7).

Fuera del set: 5, 8 y 9 se prueban en playtest. La muerte de un jugador se resuelve con un hueco corto y bajada de música, no con silencio total, para no cortar el ritmo del jugador vivo.

## Implementación en la música por capas [D-060] (sin código)
Un silencio es un "duck" con nombre sobre los buses de música, ambiente y SFX, con lista blanca de sonidos que siguen sonando. Parámetros en `src/core/config.js`:

- `audio.silencios.activo` — interruptor global (para comparar en playtest).
- `audio.silencios.blancos` — sonidos que nunca se callan: `['cadena', 'avisoAtaque', 'golpeRecibido']`.
- `audio.silencios.fadeOutMs` / `audio.silencios.fadeInMs` — curva por defecto (p. ej. 150 / 60: se corta rápido, el golpe que rompe entra seco).
- `audio.silencios.momentos.<id>` con `<id>` ∈ `umbral`, `nombreJefe`, `cambioFase`, `golpeFinal`, `muerteUno`, `muerteAmbos`, `prologoBrasa`, `prologoCadena`, `finalBrasa`. Cada uno con:
  - `duracionMs` — largo del silencio.
  - `buses` — qué se calla: `['musica']`, `['musica','ambiente']` o `['todo']`.
  - `nivel` — volumen destino (0 = silencio; 0.6 para `muerteUno`).
  - `rompeCon` — id del sonido o capa que lo cierra.
  - `soloPrimeraVez` — `true` para `nombreJefe`.
  - `habilitado` — para activar los opcionales sin tocar código.
- `audio.silencios.cadenaGanancia` — volumen del zumbido durante el silencio (1 = igual que siempre; no se sube para no engañar sobre la tensión).
- `audio.silencios.cancelable` — si un evento de combate corta el silencio antes de tiempo (p. ej. un aviso de ataque durante `cambioFase`): `true`.
