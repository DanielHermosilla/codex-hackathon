# Catálogo de bloques de ataque

Un jefe = datos en config que combinan estos bloques. Sin código por jefe [AGENTS.md regla 2].
Todo bloque se cancela en cualquier frame y limpia lo que creó [AGENTS.md regla 3].

> (de partida) = número para afinar en playtest, va a `src/core/config.js`. L = largo base de la cadena [D-079].

## Reglas comunes a todos los bloques
- **Telegrafía antes de dañar.** Duración `normal / difícil`: generosa en normal, justa en difícil [D-055, D-172]. Modo solo: +15 % (de partida) [D-121].
- **Sonido de aviso propio** por ataque [D-106]. Nunca lo tapa un silencio [D-183].
- **Color de aviso**: pendiente de la propuesta v2 [D-087, D-143]. Marcas planas, sin bordes, poco neón [D-143].
- **Rol para cada jugador**: todo ataque deja algo que hacer al objetivo y al otro [D-164].
- **Objetivo** (`objetivo`): `cercano` | `masDano` | `ambos` (área que cubre a los dos) | `cadena` (raro) [D-091]. El daño se atribuye al más cercano al punto de contacto [D-165].
- **Recuperación** (`recuperacion`): segundos quieto tras el ataque. Es la ventana de castigo.
- **Una fuente de presión a la vez**: el `planificador` del jefe no solapa dos bloques activos salvo que la fase lo permita (de partida: nunca en la primera fase de cada jefe).
- **Invulnerabilidad breve** del jugador tras recibir un golpe [D-152]. El cuerpo del jefe solo empuja, no daña [D-152].
- **Sin esbirros**: ningún bloque invoca enemigos [D-163].

## Parámetros comunes
`id`, `telegrafia: {normal, dificil}`, `sonidoAviso`, `dano`, `empuje`, `objetivo`, `recuperacion`, `cooldown`, `fases` (en cuáles aparece), `peso` (para el `planificador` con RNG [AGENTS.md regla 5]).

## Bloques de ataque
| Bloque | Qué hace | Parámetros propios | Lo usan |
|---|---|---|---|
| `barrido` | Golpe que recorre un área: arco frente al jefe o franja que cruza la arena | `forma` (`arco` \| `franja`), `angulo` o `ancho`, `radio` o `largo`, `sentido`, `vueltas` (1 = simple, 2 = ida y vuelta o doble giro) | Mirra (Siega), Ondar (Ola lateral, `franja`), Tavor (Balanza) |
| `zona_circular` | Círculo en el suelo que estalla tras el aviso | `radio`, `cantidad`, `posicion` (`objetivo`, `jefe`, `alrededorAmbos`, RNG) | Los tres |
| `proyectil_arco` | Lanzamiento parabólico; cae en una `zona_circular` marcada | `cantidad`, `radioImpacto`, `efectoAlCaer` (p. ej. púas 0,5 s) | Mirra (Grano), Ondar (Ancla), Tavor (Sentencias) |
| `carga` | Embestida en línea recta | `distancia`, `ancho`, `repeticiones`, `recalcularObjetivo` | Mirra (Hambre), Tavor (Embestidas). Si choca con la cadena tensa, se corta [D-148] |
| `salto` | El jefe salta y cae sobre una `zona_circular` | `alcance`, `radio` | Tavor (Caída) |
| `onda_anillo` | Anillo que se expande desde un punto; se cruza con dash | `radioMax`, `ancho`, `velocidad` | Ondar (Puñetazo), Tavor (tras el Mazazo) |
| `linea_suelo` | Franja recta fija que se activa | `cantidad`, `ancho`, `separacion` (≥ 1 L para que quepan los dos), `alternas` | Ondar (recogida del ancla), Tavor (Veredicto) |
| `zona_franja` | Una franja de la arena queda cubierta (ola, marea) | `area` (tercio, plataforma), `ciclica`, `empuje` | Ondar (Marejada, Marea alta) |
| `zona_movil` | Zona que persigue a un jugador | `radio`, `duracion`, `velocidadRelativa` (< 1 = más lenta que el jugador), `danoPorTick` | Mirra (Enjambre). Es un área, no enemigos [D-163] |
| `tiron_radial` | Atrae a los jugadores hacia un punto | `fuerza`, `duracion`. El ancla lo reduce, no lo anula: es un ataque [D-122, D-150] | Mirra (Banquete) |
| `efecto_cadena` | Aplica un estado a los eslabones que cruzan una zona | `estado` (`electrificada`: no corta ~2 s, sin quitar vida [D-157]; `apagada`: runas apagadas [D-161]), `duracion` | Ondar (Tormenta). Raro [D-047] |
| `agarre_cadena` | El jefe sujeta un eslabón y amenaza la cadena; nunca la rompe [D-185] | `ventanaLiberacion`, `tensionLiberacion`, `castigoFallo` (daño + `efecto_cadena: apagada` 4 s [D-161]) | Solo Tavor, fase final [D-185] |

## Bloques que no son ataques
| Bloque | Qué hace | Decisión |
|---|---|---|
| `transicion_fase` | Corta, invulnerable; cancela lo activo; cambia arena, pilares y forma; silencio de cambio de fase | [D-025, D-153, D-183, D-184] |
| `destello` | Pausa real de 1–2 s sin ataques; gesto del dios bueno | [D-093, D-156] |
| `burla` | Gesto ~1,5 s al morir un jugador; no ataca (de partida) | [D-093] |
| `tambaleo` | ~1 s quieto tras daño acumulado en poco tiempo | [D-155] |
| `brasas_curacion` | Suelta brasas al cambiar de fase (solo Ondar y Tavor) | [D-171] |
