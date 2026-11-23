# Jefe: Mirra la Hambrienta

**Orden en la demo:** primera de dos de acuerdo con D-203. El carro de completos conecta la victoria de Mirra con la sala del Farolero · **Duración objetivo:** 2–3 min [D-141] · **Qué enseña/prueba de la cadena:** la cuchilla tensa básica (uno ancla, el otro rodea), el corte contra una carga y el enredo en pilares. Lo enseña, no lo obliga [D-012, D-019, D-048, D-054, D-148] · **Decisiones:** D-012, D-018, D-025, D-043, D-047, D-048, D-054, D-055, D-057, D-058, D-078, D-084, D-085, D-086, D-088, D-091, D-092, D-093, D-098, D-106, D-128, D-141, D-147, D-148, D-150, D-152–D-156, D-160, D-163–D-165, D-169–D-172, D-174, D-176, D-180, D-183, D-184

> Convenciones de las fichas:
> - **(de partida)** = número propuesto para afinar en playtest. No es decisión. La configuración de la demo está en `src/atados/core/config.js`.
> - **(propuesta)** = idea derivada de las decisiones citadas, pendiente de visto bueno.
> - **(borrador)** = texto de jefe que Diego debe aprobar.
> - **L** = largo base de la cadena [D-079].
> - Telegrafía "normal / difícil" en segundos [D-055, D-172]. Modo solo: +15 % (de partida) [D-121].
> - Bloques y reglas comunes: `docs/jefes/_BLOQUES.md`.
> - Colores de aviso por función hasta que se apruebe la v2 [D-087, D-143].
> - Sael = J1, Odo = J2 [D-123]. Stats idénticos [D-149].

## Concepto
- Diosa menor de la cosecha, corrompida [D-043, D-058]. Antes «la que Alimentaba»; su esquirla invirtió la generosidad en gula [D-057, D-128].
- Forma: árbol-langosta gigante que devora el campo (L1) [D-057]. Tronco-cuerpo, patas de langosta, mandíbulas, copa de hojas secas que hace de alas.
- Tamaño fijo: ~4× los jugadores [D-085, D-154]. La gula se ve en que devora la arena, no en que crece [D-154].
- Esquirla de la Brasa clavada en el pecho; vetas brillantes por la corteza y el suelo [D-084].
- Personalidad: hambre que no se llena. Reacciona al dolor, se burla, tiene destellos de la diosa que daba de comer [D-093].
- Lugar en el lore: primera diosa que encuentran; prueba que la culpa de Odo y Sael tiene cuerpo [D-053, D-057].

## Arena
- Trigal seco con espantapájaros-pilar [D-088]. Pilares estáticos que pueden desaparecer durante la pelea [D-184].
- Tamaño (propuesta): claro circular de ~6 L de diámetro. Lindes de piedra baja y cerca; no se cae de la arena.
- Ocho espantapájaros a distintas distancias del centro, en grupos y claros asimétricos. Enredan la cadena [D-048]; la tensión se mide por tramo y funciona enrollada en ellos [D-147]: un pilar sirve de ancla fija.
- Los especiales interrumpen el ataque básico en curso. Mirra vuelve a su repertorio al resolverse el especial. El pozo de ácido se evapora desde el borde durante 12 s. Su tamaño en el suelo indica dónde sigue haciendo daño.
- Mirra fija la mira sobre uno de los dos personajes. El marcado tiene 4,5 s para ponerse dentro del anillo del barril. Al escupir, Mirra fija el punto de impacto. El marcado puede apartarse durante el vuelo sin desviar el ácido. Si la salpicadura alcanza el barril, apaga la mecha y conserva los espantapájaros. Si falla, el barril explota y derriba primero las coberturas más cercanas, entre el 30 % y el 50 % cuando esa fracción admite un número entero.
- Cada descarga tiene un color. El primer brasero que pisa cualquiera de los dos concede a ambos protección de ese color durante 3 s. El brillo de los personajes y la barra indican el color elegido y el tiempo restante. Los braseros aparecen con al menos 4,5 m libres entre su borde y cada jugador. Los proyectiles dirigidos tardan 4 s hasta el impacto, salvo que una cobertura los intercepte antes.
- Trigal (propuesta): por debajo de la rodilla. Nunca tapa anillos ni avisos [D-051, D-089].
- Iluminación: hora dorada, la base de los pasillos [D-086].
- Cámara: encuadra a los dos jugadores y a Mirra [D-176].
- Cambio de fase [D-153, D-154, D-184] (propuesta): Mirra devora 2 espantapájaros y siega el trigal en franjas. La arena queda más abierta y gris; las vetas se extienden por el suelo [D-084].

## Fases
2 fases por vida [D-153]. Roles intercambiables [D-018]: cualquiera ancla o corta según quién sea el objetivo (el más cercano o el que más daño hace [D-091]). La tabla pone un caso: Sael es el objetivo, Odo el otro. Si el objetivo cambia, los roles se invierten.

| Fase | Vida % | Ataques (bloques) | Qué cambia | Rol J1 (Sael) | Rol J2 (Odo) |
|---|---|---|---|---|---|
| 1 · La que Alimentaba | 100–50 (de partida) | `barrido` (Siega), `proyectil_arco` (Grano), `carga` (Hambre) | Base. Un ataque por vez. Pausas largas. Ocho pilares al empezar | Objetivo: esquiva y, al terminar el ataque, se ancla cerca de Mirra | Otro: rodea con la cadena tensa y corta en la recuperación; o enreda la cadena en un pilar y corta desde ahí |
| Transición | 50 | `transicion_fase` + `destello` | Corta e invulnerable [D-153]. Destello: ofrece una espiga con la mano abierta, quieta 1–2 s, y la devora [D-156]. Come 2 pilares, siega el trigal. Silencio de cambio de fase [D-183]. Sin brasas de curación [D-171] | Se reagrupa o castiga el destello | Ídem |
| 2 · La Hambrienta | 50–0 (de partida) | `barrido` doble (Siega de ida y vuelta), `zona_movil` (Enjambre), `tiron_radial` + `zona_circular` (Banquete), `carga` (Hambre) | Forma: la copa se abre en alas de langosta. Ritmo: pausas un 30 % más cortas (de partida). Patrón nuevo: Banquete. Arena más abierta tras devorar los pilares restantes marcados para esta fase | Si el Enjambre lo sigue: lo lleva lejos y mantiene la cadena tensa | Corta mientras Mirra persigue al otro; en el Banquete, corta en el letargo |

## Ataques
Cada ataque da un rol a cada jugador [D-164]. "Objetivo" = a quien apunta; "otro" = el compañero.

| Ataque (bloque) | Telegrafía (visual + sonido, duración) | Daño (de partida) | Cómo se esquiva | Rol del objetivo / del otro [D-164] | Cómo se castiga con la cadena |
|---|---|---|---|---|---|
| **Siega** (`barrido` arco 120°, radio 1,5 L) | Echa atrás los brazos-rama; el arco se marca en el suelo. Sonido: hoz que se afila. 1,2 / 0,7 s | 200 | Salir del arco por detrás, o dash a través (invulnerable) [D-014, D-069] | Objetivo: sale por un lado y se ancla. Otro: se coloca al lado contrario para cruzar la cadena por la espalda | Brazos clavados 1,2 s: la cadena tensa pasa por la espalda [D-012, D-148] |
| **Siega doble** (`barrido` arco, 2 vueltas) · fase 2 | Gira el torso dos veces antes. Sonido: dos afiladas. 1,2 / 0,7 s; 0,6 / 0,4 s entre barridos | 200 por barrido | Dash a destiempo o salir por detrás | Igual que la Siega; el otro espera el segundo barrido antes de entrar | Recuperación 1,5 s |
| **Grano** (`proyectil_arco`: 5 semillas, `zona_circular` radio 0,4 L, `alrededorAmbos`) | Hincha el abdomen; círculos donde caerán, alrededor de los dos [D-091]. Sonido: tripas que rugen + silbido. 1,4 / 0,9 s | 150 por semilla; púas 0,5 s | Salir de los círculos. Siempre queda un hueco para los dos con la cadena puesta (propuesta) | Los dos esquivan; el que queda más cerca de Mirra se ancla y el otro rodea | Quieta escupiendo 1,5 s: se corta desde cualquier lado |
| **Hambre** (`carga`: línea hasta 4 L, ancho 1 L, `masDano`) | Abre las mandíbulas y raspa el suelo; la línea se marca. Sonido: chasquido de mandíbulas. 1,0 / 0,6 s | 250 | Salir de la línea de lado o dash | Objetivo: sale de la línea hacia un lado. Otro: sale hacia el lado contrario, así la cadena tensa cruza la línea | Si carga contra la cadena tensa, se corta sola: daño por velocidad relativa [D-148]. Además tropieza y queda 1,5 s |
| **Enjambre** (`zona_movil` radio 0,8 L, 6 s, 70 % de velocidad del jugador) · fase 2 | La copa se sacude; la nube se forma 1 s antes de moverse. Sonido: zumbido creciente. 1,5 / 1,0 s | 50 por tick de 0,5 s | Moverse | Objetivo: arrastra la nube lejos de Mirra. Otro: libre para cortar | Mirra no lanza otro bloque mientras dura (propuesta): ventana larga. Es un área de langostas, no esbirros [D-163] |
| **Banquete** (`tiron_radial` 2 s + `zona_circular` radio 1,2 L bajo Mirra) · fase 2 | Se clava y aspira; trigal y polvo fluyen hacia ella; el círculo de la mordida se marca. Sonido: inhalación larga y grave. Tirón 2 s; mordida avisada 1,2 / 0,8 s | 300 | Varias salidas [D-054]: correr contra el tirón, dash hacia fuera, anclarse (reduce el tirón, es un ataque) [D-122, D-150], o enredar la cadena en un pilar [D-048] | El más cercano sale primero; el otro se ancla para frenarlo o lo arrastra con la cadena [D-022, D-149] | Tras la mordida queda saciada 2,5 s (letargo de la gula) [D-128]: ventana para el corte fuerte coordinado [D-017] |

- Ataques sobre la cadena: ninguno. Solo Tavor intenta romperla [D-185]; los efectos sobre la cadena pasan poco [D-047].
- Contacto con el cuerpo: solo empuja, no daña [D-152].

## Punto débil / reacción al daño
- Sin punto débil: el único es la esquirla de Tavor [D-092, D-160].
- Dolor [D-093]: corte fuerte → la corteza se astilla y suelta grano; chillido corto.
- Tambaleo: ~1 s quieta tras daño acumulado en poco tiempo [D-155]. Umbral (de partida): 15 % de su vida en 3 s.
- Burla al morir un jugador [D-093]: se agacha y mastica el aire ~1,5 s; no ataca (de partida).
- Destello [D-093, D-156]: la espiga de la transición, pausa real de 1–2 s.

## Personalidad (borrador)
- **Presentación** [D-064, D-093, D-180]: título «Mirra, la Hambrienta» en grande; debajo, tachado, «la que Alimentaba». Frase: *«Alimenté este valle mil cosechas. Ahora el valle me alimenta a mí.»*
- **Muerte**: *«Pan tibio… me acuerdo del pan tibio.»*
- **Burla al morir un jugador**: *«Uno menos en la mesa.»*
- **Derrota de ambos** [D-111]: *«Gracias por la comida.»*
- Tono serio con chispa de humor [D-002].

## Drop / recompensa
- En la demo, cada victoria entrega una moneda para la carta del furgón en el pasillo de salida [D-212].
- Al morir, su esquirla se incrusta en la cadena: es narrativa, no un ítem [D-169].
- Suelta un ítem para cada jugador, al azar de su pool [D-031, D-078]. Cada ítem lleva el color de su jugador y solo él lo recoge [D-170]. Pool de 3–4 ítems [D-170]. Todo nace del lore [D-030].
- Pool (propuesta). Capa S1: virtud vs pecado del mismo dios; juntos hacen sinergia [D-096, D-128]:

| Ítem | Tipo [D-030, D-095] | Efecto (propuesta) |
|---|---|---|
| Grano de Mirra | personaje | Curarse un poco al cortar (efecto de la esquirla en L1, ahora como ítem) [D-057, D-169] |
| Hoz de la Generosidad (virtud) | personaje | Al curarse, el compañero recibe parte |
| Diente de Mirra (pecado) | cadena, compartida | Cortes a tensión máxima sueltan una brasa de curación |
| Cerca de la Linde | cadena, compartida | Bloquear proyectiles con la cadena [D-046] |

- Sinergia Hoz + Diente: las brasas del Diente curan a los dos [D-096].
- Sin curación durante el combate [D-171].
- Drop extra si ninguno de los dos recibe daño [D-099, D-174].
- Marca en la arena [D-098, D-100, D-174] (propuesta): haz de trigal atado con una hoz clavada; tiempo, daño de cada uno [D-165], golpes recibidos y arrastres.

## Audio
- Tema de zona de la cosecha con capas por fase [D-059, D-060]. Propuesta: folk antiguo con percusión de madera; fase 2 suma un zumbido grave.
- Avisos propios [D-106]: Siega = hoz · Grano = tripas + silbido · Hambre = mandíbulas · Enjambre = zumbido · Banquete = inhalación.
- Dolor: crujido de corteza y chillido de insecto [D-103].
- Silencios [D-183]: umbral, nombre (solo la primera vez), cambio de fase (cae sobre el destello de la espiga), golpe final, muerte de ambos. El zumbido de la cadena se mantiene.
- Victoria: fanfarria corta propia [D-134, D-182].

## Pruebas
- Semilla de referencia: `?seed=1` (propuesta). Cada fase arranca de estado reproducible: posición de Mirra, pilares y RNG.
- Smoke: forzar cada ataque desde `window.__game`, capturar cada telegrafía en normal y difícil, forzar transición al 50 %, forzar muerte.
- Criterios de "justo": 2–4 intentos en normal [D-109]; ningún daño sin aviso; ningún patrón sin salida para los dos con la cadena puesta; nunca dos ataques activos a la vez en fase 1.
- Duración 2–3 min [D-141]. Vida (de partida): 12 000 (≈ 24 pasadas a tensión máxima de ~500) [D-202].
- Vida de cada jugador (de partida): 1000 [D-020, D-202]. Se revive con vida llena [D-167].

## ❓ Huecos abiertos
- Ninguno bloqueante. Dependencia: colores de aviso v2 [D-087, D-143].
- Grano de Mirra (efecto de la esquirla como ítem): depende de P-35 en `docs/design/06-progresion.md`.
- Hambre apunta a «el que más daño hace»: depende de P-31 (atribución por cercanía, D-165).
- Riesgo: trigal dorado y anillo limón de Sael [D-142] pueden confundirse. Validar con captura.
