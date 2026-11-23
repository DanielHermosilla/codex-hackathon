# Jefe: Ondar el Ahogado

**Orden en el rush:** 2 de 3 [D-024, D-026, D-058] · **Duración objetivo:** 3–4 min [D-141] · **Qué enseña/prueba de la cadena:** la cadena en un espacio que se achica. Uno se ancla en un tramo y el otro barre con la cadena tendida sobre el agua; se arrastra al compañero por los tablones; los pilares desaparecen. Ninguna táctica obligada [D-012, D-022, D-048, D-054, D-149] · **Decisiones:** D-012, D-018, D-022, D-025, D-043, D-047, D-048, D-054, D-055, D-057, D-058, D-078, D-084, D-085, D-086, D-088, D-091, D-092, D-093, D-098, D-106, D-128, D-141, D-144, D-147–D-153, D-155–D-158, D-160, D-163–D-165, D-169–D-171, D-174, D-176, D-180, D-183–D-185

> Convenciones: ver `docs/jefes/mirra.md`. Bloques: `docs/jefes/_BLOQUES.md`.
> El dash es solo movilidad + invulnerabilidad; no se lanza al compañero [D-144].

## Concepto
- Dios menor del mar, corrompido [D-043, D-058]. Antes «el de las Mareas»; su esquirla invirtió la templanza en ira [D-057, D-128].
- Forma: cuerpo de agua negra con un ancla atravesada (L1) [D-057]. La esquirla brilla dentro del agua, junto al ancla [D-084].
- Tamaño: ~6× los jugadores [D-085]. Medio cuerpo fuera del agua, al borde del muelle.
- Personalidad: furia de oleaje. Reacciona al dolor, se burla, tiene destellos del dios sereno que era [D-093].

## Arena
- Muelle que se hunde por fases [D-088]. Solo pilares estáticos que cambian por fase [D-184].
- Tamaño (propuesta): muelle de ~3 L × ~7 L. Ondar en el agua, en el extremo y los costados; se desplaza a lo largo del borde.
- Pilares (propuesta): 6 bolardos de amarre. Enredan la cadena y sirven de ancla fija [D-048, D-147].
- Iluminación (propuesta): crepúsculo con tormenta. Deriva de D-086: la luz avanza de la hora dorada a la noche.
- Cámara: encuadra a los dos jugadores y a Ondar [D-176]. Con ~6× hará falta abrir bastante; validar con captura.
- Estados de la arena (propuesta) [D-153, D-184]:
  - Fase 1: muelle entero, 6 bolardos.
  - Fase 2: se hunde el tramo central. Quedan dos tramos unidos por 2 tablones; 4 bolardos.
  - Fase 3: quedan 3–4 plataformas unidas por tablones estrechos, a ≤1 L entre sí; 2–3 bolardos. Sin salto [D-019]: siempre se cruza caminando.
- Caer al agua: daño y vuelve junto al compañero [D-158]. Daño (de partida): 15.
- Legibilidad (propuesta): el cuerpo lleva espuma clara en los bordes y vetas brillantes, para leerse sobre mar oscuro [D-084, D-089].

## Fases
3 fases por vida [D-153]. Roles intercambiables [D-018]. Caso: Sael es el objetivo, Odo el otro; se invierten al cambiar el objetivo [D-091].

| Fase | Vida % | Ataques (bloques) | Qué cambia | Rol J1 (Sael) | Rol J2 (Odo) |
|---|---|---|---|---|---|
| 1 · El de las Mareas | 100–66 (de partida) | `barrido` franja (Ola lateral), `proyectil_arco` (Ancla lanzada), `zona_franja` (Marejada) | Base. Muelle entero. Ondar se mueve por el borde | Objetivo: atrae la Ola o el Ancla hacia un lado | Otro: corta el brazo de agua o el cuerpo en el borde; puede anclarse a un bolardo |
| Transición 1 | 66 | `transicion_fase` + `brasas_curacion` | Golpe al muelle: se hunde el tramo central. Corta e invulnerable [D-153]. Brasas de curación [D-171]. Silencio de cambio de fase [D-183] | Cruza al tramo más cercano o recoge brasas | Ídem |
| 2 · La Ira | 66–33 (de partida) | `barrido` franja, `proyectil_arco`, `onda_anillo` (Puñetazo al mar), `zona_circular` + `efecto_cadena` (Tormenta) | Forma: el agua se encrespa, crece una cresta de olas en la espalda. Ritmo: pausas un 25 % más cortas (de partida). Patrón nuevo: Tormenta (rara) | Se ancla en el borde de un tramo: la cadena queda tensa sobre el agua | Corre por el borde del otro tramo o del tablón: la cadena tendida barre el cuerpo de Ondar [D-012, D-148] |
| Transición 2 | 33 | `transicion_fase` + `destello` + `brasas_curacion` | Destello: el mar se queda plano y Ondar baja las manos, pausa real de 1–2 s [D-156]. Luego el muelle se rompe en plataformas. Brasas [D-171] | Castiga el destello o cruza | Ídem |
| 3 · El Ahogado | 33–0 (de partida) | `zona_franja` cíclica (Marea alta), `barrido` franja, `proyectil_arco`, `onda_anillo`, `efecto_cadena` | Arena en plataformas. Ondar se acerca al centro. Ritmo más denso, no más azaroso | En seco: se ancla. Si su plataforma se va a cubrir, cruza por el tablón | El otro barre con la cadena desde la plataforma vecina; si el compañero se queda atrás, lo arrastra por el tablón [D-022, D-149] |

## Ataques
Cada ataque da un rol a cada jugador [D-164].

| Ataque (bloque) | Telegrafía (visual + sonido, duración) | Daño (de partida) | Cómo se esquiva | Rol del objetivo / del otro [D-164] | Cómo se castiga con la cadena |
|---|---|---|---|---|---|
| **Ola lateral** (`barrido` franja de 1,2 L que cruza el muelle) | Levanta un brazo de agua; la franja se marca con espuma. Sonido: ola que se recoge. 1,3 / 0,8 s | 25 + empuje | Dash a través o salir de la franja | Objetivo: sale de la franja. Otro: se pone del lado donde quedará apoyado el brazo | El brazo queda apoyado 1,2 s: se corta como parte del cuerpo [D-092] |
| **Ancla lanzada** (`proyectil_arco` + `zona_circular` radio 0,6 L, `masDano`) | Saca el ancla del pecho y la balancea; círculo en el destino. Sonido: cadena de hierro que chirría. 1,4 / 0,9 s | 30 | Salir del círculo | Objetivo: sale y se ancla cerca del borde. Otro: corre por el borde para tensar la cadena contra Ondar, ahora fijo | Ancla clavada 2 s: Ondar queda fijo al borde. Al recogerla arrastra una `linea_suelo` (aviso 0,6 / 0,4 s) |
| **Marejada** (`zona_franja`: ola desde el borde cubre 1/3 del muelle) | Espuma avanza por el borde que va a cubrir. Sonido: rumor de ola grande. 1,6 / 1,0 s | 20 + empuje | Pasar al otro tercio | Cubre a los dos [D-091]: el que está más lejos de la zona segura sale primero; el otro lo arrastra si se retrasa [D-149] | Ondar no lanza otro bloque mientras sube la ola (propuesta) |
| **Puñetazo al mar** (`onda_anillo`, ancho 0,3 L) · fase 2–3 | Alza el puño; el punto de impacto brilla. Sonido: trueno sordo bajo el agua. 1,2 / 0,7 s | 20 | Dash a través del anillo en el momento justo | Los dos dashean; el que llega primero al puño se ancla y el otro rodea | Puño hundido 1,5 s junto al muelle |
| **Tormenta** (`zona_circular` ×3 radio 0,5 L + `efecto_cadena: electrificada`) · fase 2–3, máx. 1 cada 30 s (de partida) | Nubes encima; círculos con chispas. Los eslabones que crucen un círculo se marcarán con el color de "efecto sobre cadena" [D-087]. Sonido: estática que crece. 1,8 / 1,2 s | 15 al jugador dentro. Cadena electrificada: no corta ~2 s, sin quitar vida [D-157] | Salir de los círculos y sacar la cadena de ellos | Objetivo: sale de su círculo. Otro: mueve su extremo para que la cadena no cruce ningún círculo | Brazos alzados 1,5 s mientras cae el rayo. Si la cadena se electrificó, el castigo llega tarde: ese es el coste |
| **Marea alta** (`zona_franja` cíclica sobre plataformas alternas) · fase 3 | El agua burbujea en la plataforma que se va a cubrir. Sonido: campana de boya. 2,0 / 1,3 s | 20 + empuje; si empuja al agua, ver D-158 | Cruzar a otra plataforma por el tablón | El que está en la plataforma que se cubre cruza; el otro se ancla en seco para que la cadena no lo arrastre al agua [D-150] | Ondar apoya los dos brazos en el muelle mientras sube: ventana larga |

- Ataques sobre la cadena: solo la Tormenta, rara [D-047, D-091, D-157]. Ondar no intenta separarla ni romperla [D-185].
- Contacto con el cuerpo: solo empuja [D-152]. Riesgo: un empujón cerca del borde tira al agua (ver huecos).

## Punto débil / reacción al daño
- Sin punto débil; el único es la esquirla de Tavor [D-092, D-160].
- Dolor [D-093]: el agua salpica y se abre por un instante mostrando el ancla; rugido burbujeante.
- Tambaleo ~1 s por daño acumulado [D-155]. Umbral (de partida): 12 % de su vida en 3 s.
- Burla al morir un jugador [D-093]: golpea el agua con las dos manos y ríe con burbujas ~1,5 s; no ataca (de partida).
- Destello [D-093, D-156]: mar plano en la transición 2.

## Personalidad (borrador)
- **Presentación** [D-064, D-180]: «Ondar, el Ahogado» en grande; debajo, tachado, «el de las Mareas». *«El mar los perdonaba. Yo ya no.»*
- **Muerte**: *«…Baja la marea. Por fin… baja.»*
- **Burla al morir un jugador**: *«Que se lo lleve el fondo.»*
- **Derrota de ambos** [D-111]: *«Al fondo los dos. Juntos, como les gusta.»*

## Drop / recompensa
- Su esquirla se incrusta en la cadena [D-169]. Un ítem por jugador, al azar de la pool; color de su jugador, solo él lo recoge; 3–4 ítems [D-031, D-078, D-170]. Capa S1: templanza vs ira [D-128].

| Ítem | Tipo [D-030, D-095] | Efecto (propuesta) |
|---|---|---|
| Corriente de Ondar | personaje | El dash deja una corriente que daña poco al jefe (efecto de la esquirla en L1, ahora como ítem) [D-057, D-169] |
| Calma de las Mareas (virtud) | personaje | Cooldown del dash algo menor [D-069] |
| Ancla del Ahogado (pecado) | cadena, compartida | Alarga la cadena [D-079] |
| Nudo de los Dos Mares (raro) | cadena, compartida | Súper ataque coop [D-094] |

- Sinergia Calma + Ancla (propuesta, reemplaza la que dependía del lanzamiento [D-144]): con la cadena larga, el dash de quien tiene la Calma deja su tramo de cadena tenso al instante (más daño en la primera pasada) [D-096].
- Drop extra si ninguno recibe daño [D-099, D-174].
- Marca en la arena [D-098, D-100, D-174] (propuesta): el ancla de Ondar clavada de pie en la última plataforma, con las stats.

## Audio
- Tema de zona del mar con capas por fase [D-059, D-060]. Propuesta: coro grave y tambores de tormenta; fase 3 suma un pulso electrónico orgánico.
- Avisos propios [D-106]: Ola = ola que se recoge · Ancla = cadena que chirría · Marejada = rumor grande · Puñetazo = trueno sordo · Tormenta = estática · Marea alta = campana de boya.
- Dolor: salpicón y rugido con burbujas [D-103].
- Silencios [D-183]: el de cambio de fase de la transición 2 cae sobre el mar plano. Zumbido de la cadena siempre presente.
- Victoria: fanfarria corta propia [D-134, D-182].

## Pruebas
- Semilla de referencia: `?seed=2` (propuesta). Cada fase arranca con el muelle en su estado fijo y RNG reproducible.
- Smoke: forzar cada ataque y cada hundimiento; forzar caída al agua de uno y de los dos; capturar telegrafías en normal y difícil con luz de crepúsculo.
- Criterios de "justo": 2–4 intentos [D-109]; siempre hay un tramo o plataforma segura alcanzable por los dos; la Tormenta nunca coincide con la Marea alta.
- Vida (de partida): 2000 (≈ 40 pasadas a tensión máxima). Duración 3–4 min [D-141].

## ❓ Huecos abiertos
- **Caen los dos al agua a la vez** (D-158 dice «vuelve junto al compañero»). Opciones: los dos vuelven al último punto seco común; vuelven a la plataforma más cercana al jefe; vuelven a la más lejana. Recomiendo: al último punto seco común.
- **Empujón del cuerpo al agua** [D-152 + D-158]: el cuerpo solo empuja, pero un empujón cerca del borde termina en daño. Opciones: el cuerpo de Ondar no empuja fuera del muelle; empuja y se acepta. Recomiendo: no empuja fuera del muelle (el daño siempre llega por un ataque avisado).
- **Arrastre con dash** [D-144 + D-149]: ya abierta como P-32 en `docs/design/02-cadena.md`. La ficha supone que un dash al largo máximo arrastra sin impulso extra.
- **Ítems con el efecto de la esquirla** (Corriente de Ondar): depende de P-35 en `docs/design/06-progresion.md`.
- **«El que más daño hace»** para el Ancla lanzada: depende de P-31.
- Riesgo: el celeste de Odo [D-142] frente a las chispas de la Tormenta y el agua. Validar con captura.
