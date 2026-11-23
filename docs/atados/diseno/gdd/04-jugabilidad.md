# Jugadores, controles y combate

> Estado: 🟡 parcial. Cada afirmación cita su `[D-NNN]`. Cadena, tensión, ancla y cadáver: `02-cadena.md`.
> Valor «❓» = sin decidir: provisional en config, marcado `// provisional`.

## 1. Quién es quién
- Sael = J1: WASD o mando 1. Odo = J2: flechas o mando 2 [D-123].
- Modelos distintos [D-052]. Stats idénticos [D-149].
- Anillo discreto en el suelo con color propio, fijo todo el juego [D-051]: **Sael limón `#f0e45a`, Odo celeste `#4fb0ff`** [D-142].

## 2. Acciones
Por jugador: **mover + dash + anclarse**. Sin salto [D-019].
- Anclarse es mantener; al soltar deja de anclar [D-019].
- Ningún botón de ataque: el daño es la cadena [D-012].
- Pausa: cualquiera de los dos, Esc o Start, en cualquier momento [D-113].

Teclas por defecto [D-151]:
| | Mover | Dash | Ancla (mantener) |
|---|---|---|---|
| Sael (teclado) | WASD | Espacio | Shift izq. |
| Odo (teclado) | Flechas | Shift der. | Enter |
| Mando (cada uno) | Stick izq. | A / Cruz | Gatillo der. |

## 3. Movimiento
- Plano. Sin salto ni verticalidad jugable [D-019].
- Ritmo medio-rápido y fluido [D-056]. Controles nada rígidos [D-118].
- Animación procedural: squash & stretch, inclinación, pasos, capa [D-090].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `player.moveSpeed` | Velocidad de carrera (igual para los dos) | ❓ | D-056, D-149 |
| `player.accel` | Aceleración / frenado | ❓ | D-056, D-118 |
| `player.turnSpeed` | Giro del cuerpo | ❓ | D-056 |

## 4. Dash
- Esquiva estilo souls: solo movilidad e invulnerabilidad [D-014, D-144].
- No lanza al compañero [D-144].
- Al largo máximo, el dash siempre gana el tirón [D-149] (ver P-32 en `02-cadena.md`).
- Sin dirección pulsada, va hacia donde mira [D-151].
- Cooldown corto: ~0,6 s de partida, ajustable [D-069].
- Invulnerable solo durante el dash [D-069].
- Anclado no puede dashear: hay que soltar [D-122].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `dash.cooldown` | Tiempo entre dashes | **0.6** s | D-069 |
| `dash.duration` | Duración = ventana de invulnerabilidad | ❓ | D-014, D-069 |
| `dash.distance` | Distancia recorrida | ❓ | D-014 |

## 5. Vida, caída y reviví
- Vida individual [D-020].
- Invulnerabilidad breve tras recibir un golpe [D-152].
- El cuerpo del jefe solo empuja, no daña [D-152].
- Si uno muere, su cadáver queda en la cadena y el otro lo arrastra [D-020, D-021]. Sigue cortando como mangual [D-070].
- El muerto revive al terminar el jefe, con vida llena [D-020, D-167].
- En pasillo igual: se arrastra el cadáver; el pasillo se reinicia solo si caen los dos [D-168, D-076].
- Si mueren los dos en un jefe: derrota con frase del jefe y reintento. El reintento conserva los ítems con que entraron [D-028, D-111, D-167].
- Modo difícil: caer los dos reinicia todo el rush [D-029, D-172].
- La vida se ve junto a cada personaje o su anillo [D-063].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `player.maxHp` | Vida de cada uno | ❓ | D-020 |
| `player.hurtIframes` | Invulnerabilidad tras recibir daño | ❓ (breve) | D-152 |
| `boss.bodyPush` | Empuje del cuerpo del jefe (sin daño) | ❓ | D-152 |

## 6. Combate
- Sin fuego amigo: la cadena solo daña enemigos. Empujar al compañero con la tensión sí puede exponerlo [D-023, D-013].
- Feedback de golpe fuerte: hit-stop al cruzar tensión alta, shake, chispas, número creciente. Desactivables [D-080, D-166, D-112].
- Drops del mundo: se recogen pasando por encima. Cada ítem lleva el color de su jugador y solo él lo recoge [D-135, D-170].

## 7. Modo solo
- Una persona mueve a los dos: WASD a Sael, flechas a Odo [D-016, D-123].
- Un solo botón de dash hace dashear a los dos a la vez [D-016].
- Dirección: la media de las dos entradas, la misma para los dos [D-120, D-145].
- Ajustes leves de balance en config: algo menos de vida del jefe, telegrafías algo más largas [D-121].
- El modo se activa solo: es coop si J2 pulsa algo en el menú [D-177].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `solo.bossHpMult` | Multiplicador de vida del jefe | ❓ (< 1) | D-121 |
| `solo.telegraphMult` | Multiplicador de duración de telegrafías | ❓ (> 1) | D-121 |

❓ Pregunta abierta (P-10) 🔴 si el greybox se prueba en solo: ¿qué tecla es el dash unificado y cómo se ancla en solo? D-145 descartó la tecla de ancla por personaje junto con la recomendación T1-08. ¿Y con un mando?

## 8. Mandos y teclado
- Teclado compartido (WASD + flechas) y 1–2 mandos [D-032].
- Remapeo de teclado y mando en ajustes [D-112].
- Sin móvil ni táctil [D-137].
