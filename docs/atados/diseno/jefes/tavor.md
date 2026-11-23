# Jefe: Tavor el Juez

**Orden en el rush:** 3 de 3, final [D-024, D-041, D-058] · **Duración objetivo:** 5–6 min [D-141] · **Qué enseña/prueba de la cadena:** todo lo aprendido, contra un jefe que se encoge entre fases. Al final, tirar juntos contra quien forjó la cadena («Juntos, o ninguno», L1). Ninguna táctica obligada [D-054, D-057, D-159] · **Decisiones:** D-012, D-013, D-017, D-018, D-022, D-025, D-041, D-047, D-048, D-054, D-055, D-057, D-058, D-070, D-084, D-085, D-086, D-088, D-091, D-092, D-093, D-098, D-101, D-106, D-128, D-141, D-144, D-147–D-153, D-155, D-156, D-159–D-165, D-169, D-171, D-174, D-176, D-178, D-180, D-183–D-185

> Convenciones: ver `docs/jefes/mirra.md`. Bloques: `docs/jefes/_BLOQUES.md`.
> El dash es solo movilidad + invulnerabilidad; no se lanza al compañero [D-144].

## Concepto
- El dios que se volvió malvado [D-041]. Juez de Hestera; ató a Odo y Sael con la urna fundida y luego se corrompió (L1) [D-057].
- Capa S1: justicia invertida en soberbia; se cree el único digno de la Brasa [D-128].
- La esquirla más grande está en su pecho y da la luz de la sala [D-084, D-086].
- Símbolo: su balanza solo pesa culpas (L1) [D-057].
- Tamaño de grande a pequeño: ~8× → ~4× → ~2× [D-085, D-159].
- Personalidad: frío, solemne, sentencioso; desprecio en la burla; destellos del juez justo [D-093].

## Arena
- Sala del juicio [D-088], de noche, iluminada por la Brasa [D-086]. Solo pilares estáticos que cambian por fase [D-184].
- Tamaño (propuesta): sala circular de ~7 L. Estrado al fondo. Anillo de 6 columnas a ~2,5 L del centro: enredan la cadena y sirven de ancla fija [D-048, D-147].
- Cámara: encuadra a los dos jugadores y a Tavor [D-176]. En fase 1 está al fondo y es enorme: la cámara abre mucho. Validar con captura.
- Estados de la arena (propuesta) [D-153, D-184]:
  - Fase 1: sala intacta, Tavor en el estrado, 6 columnas.
  - Fase 2: el estrado se derrumba; caen 2 columnas; el suelo se agrieta con vetas de Brasa [D-084]. 4 columnas.
  - Fase 3: la sala se oscurece; queda la luz de la esquirla y las vetas. 3 columnas.
- Legibilidad: de noche, los avisos llevan luz propia; las vetas no usan el color de peligro [D-087, D-089, D-143]. Riesgo alto.

## Fases
3 fases por vida [D-153]. Roles intercambiables [D-018]. Caso: Sael es el objetivo, Odo el otro [D-091].

| Fase | Vida % | Ataques (bloques) | Qué cambia | Rol J1 (Sael) | Rol J2 (Odo) |
|---|---|---|---|---|---|
| 1 · El Juez (~8×) | 100–70 (de partida) | `zona_circular` + `onda_anillo` (Mazazo), `proyectil_arco` (Sentencias), `linea_suelo` (Veredicto) | Sentado en el estrado; no se mueve. Se le corta en manos y brazos cuando golpea el suelo [D-092] | Objetivo: atrae el Mazazo hacia una columna | Otro: se ancla o enreda la cadena en la columna y el objetivo barre el brazo apoyado |
| Transición 1 | 70 | `transicion_fase` + `brasas_curacion` | Se levanta, el estrado cae y se encoge a ~4× [D-159]. Corta e invulnerable [D-153]. Brasas [D-171]. Silencio de cambio de fase [D-183] | Se aparta de la caída | Ídem |
| 2 · La Balanza (~4×) | 70–35 (de partida) | `salto` + `zona_circular` (Caída), `barrido` arco 360° (Balanza), `onda_anillo`, `proyectil_arco` | Baja a la sala. Usa la balanza como mangual: dos platillos en cadenas, reflejo de la cadena de los jugadores. Ritmo más rápido | Esquiva la Balanza y se ancla al terminar | Rodea y corta en el mareo |
| Transición 2 | 35 | `transicion_fase` + `destello` + `brasas_curacion` | Destello: baja el mazo y repite «Juntos, o ninguno», pausa real de 1–2 s [D-156]. Rompe la balanza. Se encoge a ~2× [D-159]. La sala se oscurece. Brasas [D-171] | Castiga el destello | Ídem |
| 3 · El Soberbio (~2×) | 35–0 (de partida) | `carga` ×3 (Embestidas), `linea_suelo` (Veredicto), `agarre_cadena` (Sentencia final) | Casi del tamaño de los jugadores, rápido. Esquirla expuesta: único punto débil [D-160]. Patrón nuevo: intenta romper la cadena [D-185] | Si agarra la cadena: tira hacia su lado o se ancla | Tira hacia el lado contrario o dashea en contra (el dash gana el tirón [D-149]) |

## Ataques
Cada ataque da un rol a cada jugador [D-164].

| Ataque (bloque) | Telegrafía (visual + sonido, duración) | Daño (de partida) | Cómo se esquiva | Rol del objetivo / del otro [D-164] | Cómo se castiga con la cadena |
|---|---|---|---|---|---|
| **Mazazo** (`zona_circular` radio 1,2 L sobre el objetivo + `onda_anillo`) · fase 1 | Alza el mazo; círculo que se llena. Sonido: mazo de tribunal lejano, ×2. 1,5 / 0,9 s; anillo 0,5 / 0,3 s después | 30 + 15 el anillo | Salir del círculo; dash a través del anillo | Objetivo: lleva el golpe cerca de una columna. Otro: se coloca para que la cadena cruce el brazo al apoyarse | Mazo y mano apoyados 2 s: se cortan [D-092, D-148] |
| **Sentencias** (`proyectil_arco`: 6 tablillas, `zona_circular` radio 0,4 L, `alrededorAmbos`) · fase 1–2 | Lanza tablillas; círculos con sello de culpa. Sonido: pergamino que arde. 1,4 / 0,9 s | 15 por tablilla | Salir de los círculos; siempre queda hueco para los dos | Los dos esquivan; el más cercano a Tavor se ancla y el otro barre | Quieto lanzando 1,5 s |
| **Veredicto** (`linea_suelo`: franjas alternas, separación ≥ 1 L) · fase 1 y 3 | Las franjas se marcan y laten. Sonido: campana grave por franja. 1,6 / 1,0 s | 20 | Quedarse entre franjas | Los dos se meten en el mismo hueco entre franjas o en dos huecos vecinos con la cadena cruzando la franja (no daña la cadena) | En fase 1: brazos abiertos 1,5 s |
| **Caída** (`salto` + `zona_circular` radio 1,0 L) · fase 2 | Se agacha y salta; su sombra marca el destino y crece. Sonido: viento que sube. 1,3 / 0,8 s | 30 | Salir de la sombra | Objetivo: sale hacia un lado. Otro: hacia el contrario; la cadena queda tensa sobre el punto de caída | Clavado 1,5 s al caer; la cadena tensa ya está encima |
| **Balanza** (`barrido` arco 360°, radio 1,8 L, 2 vueltas) · fase 2 | Gira los platillos sobre la cabeza; anillo de aviso. Sonido: cadenas que giran y silban. 1,4 / 0,9 s | 25 por vuelta | Salir del radio o dash en el hueco entre platillos | Los dos salen; el que queda más cerca vuelve primero y se ancla | Mareado 1,5 s |
| **Embestidas** (`carga` ×3, línea 3 L, recalcula objetivo) · fase 3 | Patea el suelo; línea antes de cada carga. Sonido: paso metálico + exhalación. 1,0 / 0,6 s la primera; 0,6 / 0,4 s las siguientes | 20 por carga | Salir de cada línea | Objetivo: sale de lado. Otro: sale al lado contrario para que la carga cruce la cadena tensa | Si carga contra la cadena tensa, se corta [D-148]. Tras la tercera, jadea 1,5 s |
| **Sentencia final** (`agarre_cadena`) · fase 3, máx. 1 cada 25 s (de partida) | Salta hacia el centro de la cadena con las manos abiertas; los eslabones del punto de agarre se marcan con el color de "efecto sobre cadena" [D-087]. Sonido: el yunque de la forja del prólogo. 1,4 / 0,9 s | Si falla la liberación: daño a cada jugador (de partida 25) y runas apagadas 4 s [D-161] | Antes: sacar el centro de la cadena de su alcance (acercarse entre sí o moverse). Después: liberarla (abajo) | Los dos tiran hacia lados contrarios, o uno se ancla y el otro tira o dashea | Al soltarla queda quemado y aturdido 2,5 s, con la esquirla expuesta [D-160]: la ventana más grande del combate |

**Sentencia final, detalle [D-185]:**
- Tavor agarra la cadena por el medio y alza el mazo para partirla: 2,0 / 1,3 s (de partida).
- La cadena es el único metal que contuvo la Brasa: quema la carne divina (L1) [D-057].
- Liberación, varias formas [D-054] (propuesta):
  - Tensarla entre los dos: la tensión le quema las manos [D-013, D-147].
  - Uno ancla (absoluto frente a la cadena [D-150]) y el otro tira.
  - Dash en contra: gana el tirón [D-149].
  - Si uno murió: el vivo tira del cadáver o lo gira como mangual contra Tavor [D-070].
- Nunca se rompe [D-185]. Mientras la sostiene no lanza otro ataque.

## Punto débil / reacción al daño
- Único punto débil del juego: la esquirla en su pecho, solo en fase 3 [D-092, D-160]. Multiplicador (de partida): ×1,5.
- Dolor [D-093]: la luz de la esquirla parpadea; gruñido contenido, nunca grita (soberbia).
- Tambaleo ~1 s por daño acumulado [D-155]. Umbral (de partida): 10 % de su vida en 3 s.
- Burla al morir un jugador [D-093]: golpea el mazo una vez, como quien cierra un caso, ~1,5 s; no ataca (de partida).
- Destello [D-093, D-156]: transición 2.

## Personalidad (borrador)
- **Presentación** [D-064, D-180]: «Tavor, el Soberbio» en grande; debajo, tachado, «el Juez». *«Yo los até. Yo los desato.»*
- **Muerte**: *«Juntos… Al menos eso lo hicieron bien.»*
- **Burla al morir un jugador**: *«Culpable.»*
- **Derrota de ambos** [D-111]: *«Sentencia cumplida.»*
- Tras morir: la escena final fija, los dos sostienen juntos la Brasa [D-101, D-178].

## Drop / recompensa
- No suelta drop: su esquirla abre el final [D-162, D-169].
- Marca en la arena [D-098, D-100, D-174] (propuesta): la balanza rota en el centro con las stats; antecede a los créditos con stats totales [D-101].

## Audio
- Tema de zona del juicio con capas por fase [D-059, D-060]. Propuesta: orquestal mística con campanas y órgano; fase 3 se vacía hasta percusión y el zumbido de la cadena [D-062].
- Avisos propios [D-106]: Mazazo = mazo de tribunal · Sentencias = pergamino · Veredicto = campana grave · Caída = viento · Balanza = cadenas que silban · Embestidas = paso metálico · Sentencia final = yunque del prólogo.
- Voz grave, sin gritos [D-103].
- Silencios [D-183]: umbral, nombre, cambios de fase (el segundo cae sobre el destello), golpe final antes de la escena de la Brasa, muerte de ambos.
- Victoria: fanfarria corta que enlaza con la escena final [D-101, D-134, D-182].

## Pruebas
- Semilla de referencia: `?seed=3` (propuesta). Cada fase arranca con tamaño, arena y RNG fijos.
- Smoke: forzar cada ataque, cada cambio de tamaño y la Sentencia final con cada forma de liberación (también con un cadáver); capturar telegrafías de noche en normal y difícil.
- Criterios de "justo": 2–4 intentos [D-109]; la Sentencia final se libera sin anclarse [D-054]; ningún aviso se pierde en la oscuridad.
- Vida (de partida): 3200 (≈ 64 pasadas a tensión máxima). Duración 5–6 min [D-141].

## ❓ Huecos abiertos
- **Título de Tavor** [D-180]: D-180 pide el nombre corrupto en grande y el antiguo tachado. Para Mirra y Ondar es claro; Tavor se llama «el Juez» en D-058. Opciones: «el Soberbio» grande con «el Juez» tachado; dejar «el Juez» sin tachar. Recomiendo «el Soberbio» / ~~el Juez~~.
- **Liberación de la Sentencia final**: esta ficha responde P-36 (`docs/design/05-jefes.md`) con cuatro formas, ninguna con lanzamiento [D-144, D-164]. La del dash depende de P-32.
- **Runas apagadas** [D-161]: ¿cortan o no? Es P-34. La ficha no lo fija.
- **Drop extra sin daño** [D-099] frente a Tavor sin drop [D-162]: es P-37.
- Riesgo: el limón de Sael [D-142] frente a la luz dorada de la Brasa de noche. Validar con captura.
