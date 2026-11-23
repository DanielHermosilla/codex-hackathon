# Registro de decisiones

Fuente de verdad del diseño. Una fila por decisión; nunca se borran, se reemplazan. En el prototipo original se utilizó la skill `registrar-decision`. Las decisiones de proceso y herramientas registran el contexto de ese prototipo.
Áreas: visión · lore · arte · cadena · jugabilidad · jefes · progresión · audio · ui · dificultad · alcance · proceso · técnica.

| ID | Fecha | Área | Decisión | Origen | Estado |
|---|---|---|---|---|---|
| D-000 | 2026-11-20 | técnica | Stack: three.js 0.187, ES modules, Vite, pnpm, Vitest, Playwright (heredado del handoff; Diego) | handoff | vigente |
| D-001 | 2026-11-20 | visión | Sensación buscada: mezcla de caos gracioso, tensión épica, coordinación precisa y vínculo entre los dos | A1 | vigente |
| D-002 | 2026-11-20 | visión | Tono: serio con chispas de humor | A2 | vigente |
| D-003 | 2026-11-20 | lore | Lore con trasfondo profundo: referencias a hechos históricos, dioses o conceptos simbólicos en los enemigos (al estilo The Binding of Isaac). Es idea a explorar, no cerrada | A2 | vigente |
| D-004 | 2026-11-20 | progresión | Entre jefe y jefe se recorre un camino que simula mundo abierto pero son pasillos definidos, con enemigos fáciles | A2 | vigente |
| D-005 | 2026-11-20 | progresión | En los pasillos la música y el setting son calmos y muestran algo de lore | A2 | vigente |
| D-006 | 2026-11-20 | jefes | Al llegar al jefe el ambiente cambia a modo batalla y hay una mini presentación del jefe (inspiración: FromSoftware, roguelites) | A2 | vigente |
| D-007 | 2026-11-20 | visión | Primera impresión: que choque por su belleza visual y muestre un mundo atrapante | A3 | vigente |
| D-008 | 2026-11-20 | ui | Arranque: créditos iniciales con el nombre del equipo (ej. "Geek Labs", provisional) → intro de lore (posible video hecho en código, a explorar) → menú principal ya inmerso en el mundo | A3 | vigente |
| D-009 | 2026-11-20 | ui | Muy pocos pasos para empezar a jugar: el jurado debe estar jugando en los primeros minutos | A3 | vigente |
| D-010 | 2026-11-20 | visión | Partida completa ideal: 15–20 min | A4 | vigente |
| D-011 | 2026-11-20 | cadena | La cadena es física real (eslabones simulados, se curva, se enreda, golpea) | D33 | vigente |
| D-012 | 2026-11-20 | cadena | Mecanismo principal de daño: cuchilla tensa; hace más o menos daño según lo tensa que esté | D35, D36 | vigente |
| D-013 | 2026-11-20 | cadena | La tensión transmite fuerza: si cada uno tira hacia un lado se jalan; se puede usar para empujar al compañero contra el jefe | D35 | vigente |
| D-014 | 2026-11-20 | jugabilidad | Dash/roll estilo souls: da movilidad y es inmune a ataques durante la esquiva | D35 | vigente |
| D-015 | 2026-11-20 | cadena | Dashear en dirección contraria al compañero lo jala hacia ti: sirve para lanzarlo contra el jefe pero puede exponerlo a ataques | D35 | reemplazada por D-144 |
| D-016 | 2026-11-20 | jugabilidad | Modo solo: una persona mueve ambos personajes (WASD y flechas); un solo botón de dash hace dashear a los dos a la vez. En coop cada uno tiene su dash | D50 | vigente |
| D-017 | 2026-11-20 | cadena | Daño mixto: golpes básicos posibles con uno; los fuertes exigen coordinación de los dos | D37 | vigente |
| D-018 | 2026-11-20 | cadena | Roles intercambiables: ambos pueden anclar o atacar según la situación | D38 | vigente |
| D-019 | 2026-11-20 | jugabilidad | Botones por jugador: mover + dash + anclarse. Anclarse es mantener (mientras se aprieta); al soltar deja de anclar. No es toggle. Sin salto (no lo eligió; interpretado) | D39, D40 | vigente |
| D-020 | 2026-11-20 | jugabilidad | Vida individual. Si un jugador muere queda su cadáver unido a la cadena y el otro lo arrastra; revive al terminar el jefe | D43, D44 | vigente |
| D-021 | 2026-11-20 | cadena | Arrastrar el cadáver con la cadena tensa vuelve al vivo más lento y tosco, con todas las físicas que implica | D44 | vigente |
| D-022 | 2026-11-20 | cadena | En el largo máximo la cadena no se estira: el que tira más fuerte arrastra al otro | D42 | vigente |
| D-023 | 2026-11-20 | cadena | Sin fuego amigo: la cadena solo daña enemigos (empujar al compañero sí puede exponerlo) | D45 | vigente |
| D-024 | 2026-11-20 | jefes | La demo tiene 3 jefes | E53 | vigente |
| D-025 | 2026-11-20 | jefes | Entre fases cambian los patrones de ataque, la forma del jefe, la arena y el ritmo | E55 | vigente |
| D-026 | 2026-11-20 | progresión | Rush lineal de orden fijo con drops aleatorios | F66 | vigente |
| D-027 | 2026-11-20 | progresión | Post-demo (cuando la demo esté 100%): meta-progresión estilo Isaac — terminar partidas desbloquea mejoras, ítems en la pool de drops, finales alternativos, jefes que escalan daño | F66, F74 | futuro |
| D-028 | 2026-11-20 | progresión | Si mueren los dos: se reintenta el jefe | F68 | vigente |
| D-029 | 2026-11-20 | dificultad | Modo difícil/hardcore: morir reinicia todo el rush y desbloquea más cosas (los desbloqueos son post-demo) | F68, I98 | vigente |
| D-030 | 2026-11-20 | progresión | Drops de la demo: mejoras de cadena, mejoras de personaje, curación e ítems con lore. Todas las mejoras nacen del lore del juego | F69 | vigente |
| D-031 | 2026-11-20 | progresión | Los drops aparecen en el mundo y se recogen; al morir, el jefe suelta un ítem para cada jugador | F70, F71 | vigente |
| D-032 | 2026-11-20 | ui | Controles: teclado compartido (WASD + flechas) y soporte de 1–2 mandos | H87 | vigente |
| D-033 | 2026-11-20 | ui | Cámara dinámica 3/4: sigue el centro de ambos con zoom según distancia; se abre en los jefes | H88 | vigente |
| D-034 | 2026-11-20 | alcance | Este proyecto es práctica para la hackatón: aprender a desarrollar juegos con IA. Sin fecha de entrega fija | J103 | vigente |
| D-035 | 2026-11-20 | alcance | Por ahora la demo se juega en el Mac de Diego (Chrome) | J104 | vigente |
| D-036 | 2026-11-20 | arte | Referencias de sensación (no copia): Tunic (cámara, transición por pasillos entre jefes, identidad visual, modelos); The Last Campfire (prólogo, música y visual, cámara y ángulo, el mundo); Journey (misticismo); Hades II (2.5D); Immortals Fenyx Rising (lo divino caricaturizado); Death's Door (fluidez de juego y arte) | C21, C32, A5 | vigente |
| D-037 | 2026-11-20 | lore | El lore inicial (prólogo) es extremadamente importante: según Diego, ~70% del éxito del juego | A3, B16 | vigente |
| D-038 | 2026-11-20 | lore | Setting: mitología antigua con fantasía oscura; uno de los dioses se volvió malvado | B11, B12 | vigente |
| D-039 | 2026-11-20 | lore | Los dos protagonistas fueron atados por castigo divino. Su relación (parientes, conocidos, desconocidos) está por definir | B13, A7 | vigente |
| D-040 | 2026-11-20 | lore | Los dos encadenados son la única oportunidad de salvación del mundo | B15 | vigente |
| D-041 | 2026-11-20 | jefes | El jefe final es el dios que se volvió malvado | B14, E63 | vigente |
| D-042 | 2026-11-20 | lore | Mitología inventada, inspirada en varias. El lore central: los dioses se corrompieron | B11 | vigente |
| D-043 | 2026-11-20 | jefes | Jefes 1 y 2: dioses menores corrompidos | B14, E62 | vigente |
| D-044 | 2026-11-20 | arte | Personajes y mundo en 3D low-poly estilizado con cámara 3/4. Se descarta el 2.5D; adaptar todo a 3D low-poly | C22, C24 | vigente |
| D-045 | 2026-11-20 | lore | Prólogo mixto: láminas ilustradas con narración para el mito antiguo y escena en tiempo real para el encadenamiento | B16 | vigente |
| D-046 | 2026-11-20 | cadena | Bloquear proyectiles con la cadena es un drop, no algo base | D41, F69 | vigente |
| D-047 | 2026-11-20 | jefes | Algunos ataques de jefe afectan la cadena si la golpean (electrificar, congelar). Debe pasar poco en el juego | D41, E57 | vigente |
| D-048 | 2026-11-20 | cadena | La cadena se enreda en pilares y obstáculos del escenario | D41, D51 | vigente |
| D-049 | 2026-11-20 | arte | Cadena de metal divino (bronce/oro antiguo) con runas que brillan más cuanto más tensa está | C25 | vigente |
| D-050 | 2026-11-20 | lore | Los dos protagonistas eran rivales/enemigos | B13, A7 | vigente |
| D-051 | 2026-11-20 | arte | Cada jugador tiene un anillo en el suelo discreto, que se integra con el arte pero se distingue, con su color propio. El color de cada jugador es fijo en todo el juego | C24 | vigente |
| D-052 | 2026-11-20 | lore | Dos protagonistas con modelos distintos, cada uno con nombre y lore propios | C24, A7 | vigente |
| D-053 | 2026-11-20 | lore | Premisa: los dos protagonistas hicieron algo malo (robaron, rompieron…) que corrompió a los dioses; el mundo está a punto de quedar en ruinas | B13, B15 | vigente |
| D-054 | 2026-11-20 | jefes | Todas las tácticas de cadena sirven contra cualquier jefe; no hay jefe que obligue a una forma concreta | E54 | vigente |
| D-055 | 2026-11-20 | dificultad | Telegrafías generosas en modo normal y justas en modo difícil | E60, I97 | vigente |
| D-056 | 2026-11-20 | jugabilidad | Ritmo de combate medio-rápido y fluido | D46 | vigente |
| D-057 | 2026-11-20 | lore | Lore base: L1 «La Brasa Primera» (docs/design/lore-propuestas.md). Odo y Sael, ladrones rivales, rompen la Brasa que mantenía puros a los dioses; Tavor el Juez los ata con la urna fundida y luego se corrompe. Nombres provisionales | B11–B16 | reemplazada por D-217 |
| D-058 | 2026-11-20 | jefes | Jefes provisionales según L1: 1 Mirra la Hambrienta (cosecha), 2 Ondar el Ahogado (mar), final Tavor el Juez | E62 | vigente |
| D-059 | 2026-11-20 | audio | Música: mezcla de orquestal mística, folk antiguo, ambient atmosférico y electrónica orgánica | G79 | vigente |
| D-060 | 2026-11-20 | audio | Música adaptativa por capas: tema por zona, calmo en pasillo; al entrar al jefe se suman capas y cambia por fase | G80 | vigente |
| D-061 | 2026-11-20 | audio | Fuente de audio: música con licencia libre (registrada en CREDITS) + efectos por código (zzfx/WebAudio) afinados al gameplay | G82 | vigente |
| D-062 | 2026-11-20 | audio | Sonido de la cadena: eslabones metálicos + zumbido armónico divino que sube de tono con la tensión (avisa del daño) | G81 | vigente |
| D-063 | 2026-11-20 | ui | HUD mínimo y diegético: vida junto a cada personaje/anillo, casi nada fijo en pantalla | H89 | vigente |
| D-064 | 2026-11-20 | ui | Jefe: presentación con nombre y título épicos y barra de vida durante el combate | H90 | vigente |
| D-065 | 2026-11-20 | ui | La tensión se muestra solo en la cadena, pero de forma llamativa (efecto o cambio leve de color además de las runas) | H91 | vigente |
| D-066 | 2026-11-20 | ui | Tutorial integrado en el primer pasillo: enemigos fáciles enseñan corte, ancla y dash con indicaciones breves | H94 | vigente |
| D-067 | 2026-11-20 | cadena | Lanzar al compañero contra el jefe con el dash hace daño leve al impactar y lo deja en posición para cortar | D35 | reemplazada por D-144 |
| D-068 | 2026-11-20 | cadena | El daño escala de forma continua mientras la cadena se va tensando (sin umbral duro). Ajuste del 23 nov: a igual contacto y velocidad, parte del 25 % con tensión cero | D35 y ajuste del prototipo | vigente |
| D-069 | 2026-11-20 | jugabilidad | Dash con cooldown corto (~0,6 s de partida, ajustable en config); invulnerable solo durante el dash | D47 | vigente |
| D-070 | 2026-11-20 | cadena | El cadáver arrastrado sigue siendo un extremo que corta: se puede girar como mangual, más lento y tosco | D44 | vigente |
| D-071 | 2026-11-20 | ui | Nombre del equipo en los créditos iniciales: Geek Labs | A3 | vigente |
| D-072 | 2026-11-20 | lore | Prólogo de 60–90 s, saltable (mantener un botón); siempre saltable en partidas siguientes | B16 | vigente |
| D-073 | 2026-11-20 | ui | Menú principal: escena 3D viva con el mundo de fondo y los dos personajes encadenados; «Jugar» los pone en marcha sin corte | H92 | vigente |
| D-074 | 2026-11-20 | jefes | La presentación del jefe se ve completa la primera vez y es saltable en los reintentos | E, F68 | vigente |
| D-075 | 2026-11-20 | progresión | Cada pasillo entre jefes dura 1–2 min | A2, F67 | vigente |
| D-076 | 2026-11-20 | progresión | Los enemigos de pasillo quitan poca vida y rara vez matan; morir en un pasillo lo reinicia | D, F68 | vigente |
| D-077 | 2026-11-20 | dificultad | El modo difícil entra en la demo: selector normal/difícil desde el inicio | I98 | vigente |
| D-078 | 2026-11-20 | progresión | El ítem que suelta cada jefe sale al azar de una pool temática de ese jefe (una tirada por jugador) | F70 | vigente |
| D-079 | 2026-11-20 | cadena | Largo de la cadena fijo de base; algunos drops lo alargan | D34 | vigente |
| D-080 | 2026-11-20 | jugabilidad | Feedback de golpe fuerte (hit-stop, shake, chispas según tensión) con números de daño, desactivables en ajustes | D49 | vigente |
| D-081 | 2026-11-20 | cadena | Sin combo ni multiplicador: el daño depende solo de tensión y velocidad | D48 | vigente |
| D-082 | 2026-11-20 | arte | Colores de Odo y Sael: delegado. Claude propone un par con captura de prueba y Diego aprueba | C24, C26 | reemplazada por D-142 |
| D-083 | 2026-11-20 | arte | Paleta dinámica: cambia según jefe, fase, intensidad y momento de la historia. Delegado: Claude propone el sistema de paletas con capturas y Diego aprueba | C23 | reemplazada por D-188 |
| D-084 | 2026-11-20 | arte | Corrupción visual: esquirlas de la Brasa clavadas y vetas brillantes que se extienden por cuerpos y suelo | C21 | vigente |
| D-085 | 2026-11-20 | jefes | Tamaño creciente: Mirra ~4× los jugadores, Ondar ~6×, Tavor cambia de tamaño entre fases | C28 | vigente |
| D-086 | 2026-11-20 | arte | Iluminación: base de hora dorada en pasillos que avanza hacia la noche (Tavor de noche, iluminado por la Brasa); puede variar según el momento | C30 | vigente |
| D-087 | 2026-11-20 | arte | Código de colores de gameplay (peligro, aviso, zona segura, efectos sobre la cadena): delegado. Claude propone colores fijos compatibles con la paleta dinámica, con captura, y Diego aprueba | C26 | reemplazada por D-188 |
| D-088 | 2026-11-20 | jefes | Una arena por jefe que se transforma entre fases: trigal (Mirra), muelle que se hunde (Ondar), sala del juicio (Tavor) | C27 | vigente |
| D-089 | 2026-11-20 | arte | VFX ricos pero legibles: chispas, polvo, brasas flotando, bloom suave y niebla; nunca tapan los avisos | C29 | vigente |
| D-090 | 2026-11-20 | arte | Animación mixta: esqueleto (Blender) para jefes, procedural (squash & stretch, inclinación, pasos, capa) para protagonistas | C31 | vigente |
| D-091 | 2026-11-20 | jefes | Objetivos de ataque: el jugador más cercano o que más daño hace, áreas que cubren a los dos, y (rara vez) la cadena | E56 | vigente |
| D-092 | 2026-11-20 | jefes | Daño igual en cualquier parte del cuerpo en la mayoría de jefes; un jefe puede tener punto débil si calza con su diseño y enriquece la experiencia | E58 | vigente |
| D-093 | 2026-11-20 | jefes | Personalidad: reaccionan al dolor, se burlan/gesticulan (p. ej. cuando muere un jugador), muestran destellos del dios bueno que eran y dicen una frase corta al presentarse y al morir | E59 | vigente |
| D-094 | 2026-11-20 | cadena | Súper ataque coop solo como drop raro, no base | D52 | vigente |
| D-095 | 2026-11-20 | progresión | Las mejoras de cadena afectan a la cadena compartida (valen para los dos); las de personaje son de quien las recoge | F71 | vigente |
| D-096 | 2026-11-20 | progresión | Ítems con sinergias entre los dos jugadores: se potencian si cada uno tiene uno complementario | F73 | vigente |
| D-097 | 2026-11-20 | progresión | Sin moneda ni tienda | F75 | vigente |
| D-098 | 2026-11-20 | progresión | Al morir un jefe queda en la arena una marca física (lápida/monumento) con las estadísticas del combate, en vez de una pantalla de resultados | F76, H95 | vigente |
| D-099 | 2026-11-20 | progresión | Drop extra si vencen a un jefe sin recibir daño | F76 | vigente |
| D-100 | 2026-11-20 | progresión | La lápida muestra las stats de esa partida (tiempo, daño de cada uno, golpes recibidos, arrastres); no persiste entre partidas en la demo | F76 | vigente |
| D-101 | 2026-11-20 | lore | El rush cierra con la escena final de la historia (L1: la Brasa se reforma) y créditos con stats totales | B15, H95 | vigente |
| D-102 | 2026-11-20 | ui | Idiomas: español e inglés con selector; todos los textos en archivo de traducciones desde el inicio | B20 | vigente |
| D-103 | 2026-11-20 | audio | Voces: narrador en el prólogo, gruñidos/esfuerzos de protagonistas, rugidos y frases de jefes. Diego marcó además «otra cosa» sin detallar | B17, G83 | vigente |
| D-104 | 2026-11-20 | audio | Odo y Sael se lanzan pullas cortas de rivales durante el juego | G83, A7 | vigente |
| D-105 | 2026-11-20 | audio | Narrador del prólogo: probar TTS primero; si no cumple el estándar, lo graba el equipo | B17 | vigente |
| D-106 | 2026-11-20 | audio | Cada ataque de jefe tiene su sonido de aviso propio | G85 | vigente |
| D-107 | 2026-11-20 | audio | Silencios dramáticos: delegado a Claude (dónde convenga: umbral del jefe, golpe final, muerte…) | G84 | reemplazada por D-183 |
| D-108 | 2026-11-20 | audio | Pullas: a veces (pocas) al lanzar o arrastrar al otro, al revivir y en pasillos; apagables en ajustes | G83 | reemplazada por D-186 |
| D-109 | 2026-11-20 | dificultad | Modo normal exigente pero justo: 2–4 intentos por jefe para jugadores medios | I97 | vigente |
| D-110 | 2026-11-20 | dificultad | Sin ayudas especiales para parejas desparejas | I99 | vigente |
| D-111 | 2026-11-20 | progresión | Si mueren los dos: pantalla de derrota (con frase del jefe) y opción de reintentar | I101, F68 | vigente |
| D-112 | 2026-11-20 | ui | Ajustes: volúmenes (general, música, efectos, voces), remapeo de controles (teclado y mando), reducir shake/flashes, números de daño y pullas on/off. Sin modo daltónico en la demo | H93, H96, I100 | vigente |
| D-113 | 2026-11-20 | ui | Pausa: cualquiera de los dos pausa (Esc o Start) en cualquier momento; menú con ajustes y volver al menú | H93 | vigente |
| D-114 | 2026-11-20 | dificultad | Sin dificultad adaptativa: normal y difícil son fijos | I102 | vigente |
| D-115 | 2026-11-20 | jefes | Sin jefes secretos u opcionales en la demo (post-demo con la meta-progresión) | E64 | futuro |
| D-116 | 2026-11-20 | alcance | MVP de la demo: cadena + 1 jefe pulido, prólogo + menú, los 3 jefes jugables y al menos un pasillo con lore | J106 | vigente |
| D-117 | 2026-11-20 | alcance | Recorte por falta de tiempo, primero: inglés, y voces/pullas | J107 | vigente |
| D-118 | 2026-11-20 | visión | Anti-objetivos: genérico de packs de assets, caótico/ilegible, lento/pesado (menús largos, controles rígidos), infantil | A6 | vigente |
| D-119 | 2026-11-20 | visión | Lo que la gente debe contar: «ganamos con el cadáver como mangual», «el inicio era precioso, te mete de una», y que es extremadamente llamativo visualmente con jugabilidad y animaciones extremadamente fluidas | A9 | vigente |
| D-120 | 2026-11-20 | jugabilidad | Modo solo: el dash unificado lanza a los dos en la misma dirección (media de las dos entradas; interpretado) | D50 | vigente |
| D-121 | 2026-11-20 | dificultad | Modo solo con ajustes leves de balance (p. ej. algo menos de vida del jefe o telegrafías algo más largas), en config | D50 | vigente |
| D-122 | 2026-11-20 | jugabilidad | Anclado: no se mueve (solo gira el cuerpo) y recibe empujones reducidos. No eligió dash anclado ni que un tirón lo suelte: para dashear hay que soltar el ancla (interpretado) | D39 | vigente |
| D-123 | 2026-11-20 | jugabilidad | Sael es J1 (WASD / mando 1) y Odo es J2 (flechas / mando 2) | D57 | vigente |
| D-124 | 2026-11-20 | lore | Nombres definitivos: Odo, Sael, Tavor, Mirra, Ondar y el valle de Hestera | D57 | vigente |
| D-125 | 2026-11-20 | visión | El juego se llama AtaDos. Esta versión vive en ~/Documents/AtaDos; las carpetas viejas se renombran para liberar el nombre | A8 | vigente |
| D-126 | 2026-11-20 | lore | Coleccionables de lore: murales e inscripciones en los pasillos que se activan al pasar; nada que juntar en menús | B19 | vigente |
| D-127 | 2026-11-20 | lore | Referencias simbólicas: valen mitologías reales, historia, pecados/virtudes y conceptos filosóficos. Delegado: Claude propone 3 enfoques | A2, B19 | delegada |
| D-128 | 2026-11-20 | lore | Capa simbólica: S1 virtud invertida (cada dios encarna una virtud que la corrupción invierte en pecado: Mirra gula, Ondar ira, Tavor soberbia) + guiños S2 de mitologías e historia reales en ítems y murales | A2, B19 | vigente |
| D-129 | 2026-11-20 | proceso | Las métricas del experimento las mide Diego por su cuenta; el juego de «un prompt» existe pero no se toca ahora | K111, K112 | vigente |
| D-130 | 2026-11-20 | proceso | Orquestación: la sesión principal usa Opus con esfuerzo alto para planificar y orquestar; separa las tareas por categoría o prioridad y las delega | K113 | vigente |
| D-131 | 2026-11-20 | proceso | Subagentes: Opus esfuerzo medio para diseño de todo tipo, implementaciones difíciles, lo abstracto o artístico; Sonnet 5.5 esfuerzo alto para código pesado y largo pero no difícil; Haiku para buscar/investigar en internet y descargar librerías o dependencias | K113 | vigente |
| D-132 | 2026-11-20 | proceso | Revisión con el plugin de Codex (/codex:adversarial-review): código importante con gpt-6.1-sol esfuerzo medio; el resto del código sensible con gpt-6.1-terra esfuerzo medio. Objetivo: máxima efectividad de código y eficiencia de tokens | K113 | vigente |
| D-133 | 2026-11-20 | proceso | Autonomía: los agentes implementan solos y preguntan a Diego solo si falta o choca una decisión | K113 | vigente |
| D-134 | 2026-11-20 | audio | Música propia para menú (motivo principal), fanfarria corta de victoria por jefe y tema de derrota | G86 | vigente |
| D-135 | 2026-11-20 | progresión | Los drops del mundo se recogen pasando por encima con el cuerpo | F78 | vigente |
| D-136 | 2026-11-20 | alcance | Por ahora no se publica ni se hace trailer | J108, J109 | vigente |
| D-137 | 2026-11-20 | técnica | Rendimiento objetivo: 60 fps en el Mac de Diego; sin móvil ni táctil | J110 | vigente |
| D-138 | 2026-11-20 | jugabilidad | Interacciones con el escenario: delegado a Claude con criterio de no complejizar en este primer intento (base: pilares, D-048) | D51 | reemplazada por D-184 |
| D-139 | 2026-11-20 | jefes | Jefes que intentan separar o romper la cadena: delegado a Claude según el lore (L1 ya propone que Tavor intente romperla en su fase final) | E57 | reemplazada por D-185 |
| D-140 | 2026-11-20 | progresión | Enemigos de pasillo: 2–3 tipos por zona, mortales tocados por polvo de esquirla, temáticos del dios de la zona | E61 | vigente |
| D-141 | 2026-11-20 | jefes | Duración objetivo: Mirra 2–3 min, Ondar 3–4 min, Tavor 5–6 min | E65 | vigente |
| D-142 | 2026-11-20 | arte | Colores de Sael y Odo: par A — Sael limón #f0e45a, Odo celeste #4fb0ff (resuelve D-082) | T1/D-082 | vigente |
| D-143 | 2026-11-20 | arte | Código de gameplay v1 no aprobado: marcas más planas, sin bordes y menos neón. D-087 sigue delegada (v2 con captura) | T1/D-087 | reemplazada por D-188 |
| D-144 | 2026-11-20 | cadena | Se elimina del juego entero lanzar al compañero con el dash: el dash es solo movilidad + invulnerabilidad (reemplaza D-015 y D-067) | T1-08 aclaración | vigente |
| D-145 | 2026-11-20 | jugabilidad | Modo solo: D-120 se mantiene (dash unificado en la misma dirección). Se descarta la recomendación T1-08 | T1-08 | vigente |
| D-146 | 2026-11-20 | visión | Pitch (docs/design/00-vision.md) aprobado: hito 0 cerrado | T1 | vigente |
| D-147 | 2026-11-20 | cadena | Tensión = rectitud de los eslabones por tramo (funciona enrollada en pilares) (recomendación aprobada en bloque) | T1-01 | vigente |
| D-148 | 2026-11-20 | cadena | La cadena atraviesa al jefe cortando; daño continuo por paso = tensión × velocidad relativa cadena–cuerpo (si el jefe carga contra la cadena tensa, se corta) (recomendación aprobada en bloque) | T1-02 | vigente |
| D-149 | 2026-11-20 | jugabilidad | Odo y Sael tienen stats idénticos; arrastra quien empuja más; el dash siempre gana (recomendación aprobada en bloque) | T1-03 | vigente |
| D-150 | 2026-11-20 | cadena | El ancla es absoluta frente a la cadena; los empujones reducidos de D-122 son solo de ataques (recomendación aprobada en bloque) | T1-04 | vigente |
| D-151 | 2026-11-20 | ui | Teclas por defecto: Sael dash Espacio, ancla Shift izq.; Odo dash Shift der., ancla Enter; mando: dash A/Cruz, ancla gatillo der. mantenido. Dash sin dirección va hacia donde mira (recomendación aprobada en bloque) | T1-06, T1-05 | vigente |
| D-152 | 2026-11-20 | jugabilidad | Invulnerabilidad breve tras recibir un golpe; el cuerpo del jefe solo empuja, no daña (recomendación aprobada en bloque) | T1-07 | vigente |
| D-153 | 2026-11-20 | jefes | Fases por vida: Mirra 2, Ondar 3, Tavor 3; transición corta e invulnerable mientras cambia la arena (recomendación aprobada en bloque) | T1-09 | vigente |
| D-154 | 2026-11-20 | jefes | Mirra tiene tamaño fijo; la gula se ve en que devora la arena (recomendación aprobada en bloque) | T1-10 | vigente |
| D-155 | 2026-11-20 | jefes | Reacción al dolor: tambaleo de ~1 s por daño acumulado en poco tiempo (recomendación aprobada en bloque) | T1-11 | vigente |
| D-156 | 2026-11-20 | jefes | El destello del dios bueno es una pausa real de 1–2 s sin ataques (ventana de castigo) (recomendación aprobada en bloque) | T1-12 | vigente |
| D-157 | 2026-11-20 | jefes | Cadena electrificada: no corta durante ~2 s, sin quitar vida (recomendación aprobada en bloque) | T1-13 | vigente |
| D-158 | 2026-11-20 | jefes | Caer al agua en Ondar: daño y vuelve junto al compañero (recomendación aprobada en bloque) | T1-14 | vigente |
| D-159 | 2026-11-20 | jefes | Tavor de grande a pequeño (~8× → ~4× → ~2×) (recomendación aprobada en bloque) | T1-15 | vigente |
| D-160 | 2026-11-20 | jefes | Único punto débil: la esquirla de Tavor en su fase final (recomendación aprobada en bloque) | T1-16 | vigente |
| D-161 | 2026-11-20 | jefes | Fallar la Sentencia final de Tavor: daño + runas apagadas 4 s (recomendación aprobada en bloque) | T1-17 | vigente |
| D-162 | 2026-11-20 | jefes | Tavor no suelta drop: su esquirla abre el final (recomendación aprobada en bloque) | T1-18 | vigente |
| D-163 | 2026-11-20 | jefes | Los jefes no invocan esbirros (recomendación aprobada en bloque) | T1-19 | vigente |
| D-164 | 2026-11-20 | jefes | Regla: todo ataque de jefe da un rol a cada jugador (recomendación aprobada en bloque) | T1-20 | vigente |
| D-165 | 2026-11-20 | progresión | Daño atribuido (stats) al jugador más cercano al punto de contacto (recomendación aprobada en bloque) | T1-21 | vigente |
| D-166 | 2026-11-20 | jugabilidad | Número de daño que crece mientras dura el contacto; hit-stop al cruzar tensión alta (recomendación aprobada en bloque) | T1-22 | vigente |
| D-167 | 2026-11-20 | progresión | Se revive con vida llena; el reintento conserva los ítems con que entraron (recomendación aprobada en bloque) | T1-23 | vigente |
| D-168 | 2026-11-20 | progresión | Si muere uno en un pasillo se arrastra su cadáver como en un jefe; el pasillo se reinicia solo si caen los dos (recomendación aprobada en bloque) | T1-24 | vigente |
| D-169 | 2026-11-20 | progresión | La esquirla del dios es narrativa (se incrusta en la cadena); el ítem del jefe sale aparte de su pool (recomendación aprobada en bloque) | T1-25 | vigente |
| D-170 | 2026-11-20 | progresión | Cada ítem lleva el color de su jugador y solo él lo recoge; 2–3 drops por pasillo; 3–4 ítems por pool (recomendación aprobada en bloque) | T1-26 | vigente |
| D-171 | 2026-11-20 | progresión | Curación en jefe: brasas al cambiar de fase en Ondar y Tavor; ninguna en Mirra (recomendación aprobada en bloque) | T1-27 | vigente |
| D-172 | 2026-11-20 | dificultad | Difícil = telegrafías justas + reiniciar el rush (en pasillo solo si caen los dos); no desbloquea nada en la demo (recomendación aprobada en bloque) | T1-28 | vigente |
| D-173 | 2026-11-20 | visión | Los 15–20 min [D-010] se miden sin muertes; el reintento es muy rápido (recomendación aprobada en bloque) | T1-29 | vigente |
| D-174 | 2026-11-20 | progresión | Lápida: «sin daño» = ninguno de los dos; arrastre = llevar al otro al largo máximo o arrastrar el cadáver (recomendación aprobada en bloque) | T1-30 | vigente |
| D-175 | 2026-11-20 | progresión | Cada pasillo pertenece al dios del jefe siguiente (recomendación aprobada en bloque) | T1-32 | vigente |
| D-176 | 2026-11-20 | ui | Cámara en jefe: encuadra a los dos jugadores y al jefe (recomendación aprobada en bloque) | T1-33 | vigente |
| D-177 | 2026-11-20 | ui | Coop automático si J2 pulsa algo en el menú; dificultad en una pantalla única; idioma del navegador, cambiable en ajustes (recomendación aprobada en bloque) | T1-34 | vigente |
| D-178 | 2026-11-20 | lore | Final de la demo: escena fija, los dos sostienen juntos la Brasa (recomendación aprobada en bloque) | T1-35 | vigente |
| D-179 | 2026-11-20 | alcance | El narrador del prólogo no entra en el recorte de voces de D-117 (recomendación aprobada en bloque) | T1-36 | vigente |
| D-180 | 2026-11-20 | lore | Se adoptan Ilya, Brun, Suné y Kesh; título del jefe con el nombre corrupto grande y el antiguo tachado debajo (recomendación aprobada en bloque) | T1-37 | vigente |
| D-181 | 2026-11-20 | audio | La «otra cosa» de D-103 eran las pullas (asumido, aprobado en bloque) (recomendación aprobada en bloque) | T1-38 | vigente |
| D-182 | 2026-11-20 | audio | «Música propia» de D-134 = pistas dedicadas con licencia libre (recomendación aprobada en bloque) | T1-39 | vigente |
| D-183 | 2026-11-20 | audio | Silencios dramáticos: set de 5+1 de docs/design/propuesta-D107-silencios.md; el zumbido de la cadena se mantiene (resuelve D-107) (recomendación aprobada en bloque) | D-107 | vigente |
| D-184 | 2026-11-20 | jugabilidad | Escenario: solo pilares estáticos que cambian por fase (resuelve D-138) (recomendación aprobada en bloque) | D-138 | vigente |
| D-185 | 2026-11-20 | jefes | Solo Tavor intenta romper la cadena, en su fase final; nunca se rompe (resuelve D-139) (recomendación aprobada en bloque) | D-139 | vigente |
| D-186 | 2026-11-20 | audio | Pullas: a veces (pocas) al arrastrar al otro, al revivir y en pasillos; apagables en ajustes. Se quita «al lanzar» por D-144 (interpretado: consecuencia directa) | D-108, D-144 | vigente |
| D-187 | 2026-11-20 | cadena | Greybox de la cadena (hito 1, ADR-001: PBD propio en 2D): mantener | playtest H1 | vigente |
| D-188 | 2026-11-20 | arte | Propuesta de colores v2 aprobada (docs/arte/propuesta-colores.md, CONFIG.paleta): paleta dinámica por zona base→clímax, código de gameplay plano (peligro #d9475f, aviso #e8a6bb que se llena, segura #6ccf96, electrificada #8f86d9, congelada #a9d6e6) y corrupción en ámbar de la Brasa (vetas #ffb648, esquirlas #ffd88a). Resuelve D-083 y D-087 | D-083, D-087, D-143 | vigente |
| D-189 | 2026-11-20 | jefes | Mirra en greybox (hito 2): mantener, incluidos los ajustes del implementador a la ficha (Hambre anchoL 0,6; ventanas activas ≤ duración del dash) | playtest H2 | vigente |
| D-190 | 2026-11-20 | cadena | Al largo máximo, quien dashea gana el tirón y arrastra al otro, sin impulso extra (aclara D-149 con D-144) (recomendación aprobada en bloque) | T2-01 | vigente |
| D-191 | 2026-11-20 | ui | Modo solo: dash unificado Espacio; ancla Shift izq. (Sael) y Enter (Odo); con un mando: stick izq. Sael, stick der. Odo, gatillos = anclas, A = dash (recomendación aprobada en bloque) | T2-02 | vigente |
| D-192 | 2026-11-20 | jefes | Con las runas apagadas tras fallar la Sentencia final, la cadena no corta durante esos 4 s (recomendación aprobada en bloque) | T2-03 | vigente |
| D-193 | 2026-11-20 | jefes | Ningún jefe congela la cadena en la demo; solo Ondar la electrifica (recomendación aprobada en bloque) | T2-04 | vigente |
| D-194 | 2026-11-20 | jefes | «El que más daño hace» (objetivo de jefe) usa la regla de D-165 con ventana de los últimos ~5 s (recomendación aprobada en bloque) | T2-05 | vigente |
| D-195 | 2026-11-20 | progresión | Los efectos de esquirla de L1 pasan a ítems de las pools (Grano de Mirra, Corriente de Ondar) (recomendación aprobada en bloque) | T2-06 | vigente |
| D-196 | 2026-11-20 | progresión | El drop extra sin daño (D-099) no aplica a Tavor; la lápida lo registra (recomendación aprobada en bloque) | T2-07 | vigente |
| D-197 | 2026-11-20 | jefes | Si caen los dos al agua a la vez (Ondar), vuelven al último punto seco común (recomendación aprobada en bloque) | T2-08 | vigente |
| D-198 | 2026-11-20 | jefes | El cuerpo de Ondar nunca empuja fuera del muelle (recomendación aprobada en bloque) | T2-09 | vigente |
| D-199 | 2026-11-20 | jefes | Título de Tavor: «Tavor, el Soberbio» grande, «el Juez» tachado debajo (recomendación aprobada en bloque) | T2-10 | vigente |
| D-200 | 2026-11-23 | ui | Al jugar, el canvas ocupa toda la ventana; la barra superior (Geek Labs, Sonido, Controles) y la inferior de controles solo se ven en menú, pausa, resultados y carga | playtest hackatón | vigente |
| D-201 | 2026-11-23 | jefes | Más «movida»: arena de Mirra de nuevo a radio 3 L con pilares a 2 L, cámara de jefe de 16 a 46 m; Sael y Odo siguen dibujados a escala 1,3 | playtest hackatón, tanda 1 | vigente |
| D-202 | 2026-11-23 | jugabilidad | Vida y daño ×10 en todo (jugadores 1000, Mirra 12 000, ataques y cadena ×10): números de daño más grandes con la misma duración de pelea | playtest hackatón, tanda 1 | vigente |
| D-203 | 2026-11-23 | alcance | La demo tendrá 2 jefes; el primero (Mirra) más fácil que el último. Nacho define los jefes y sus mecánicas: por ahora el recorrido termina en Mirra, sin segundo jefe | playtest hackatón, tanda 1 | vigente |
| D-204 | 2026-11-23 | progresión | Estructura: lobby al pie del Templo Celestial → pasillo de subida entre ruinas (como un olimpo en ruinas) → pradera de Mirra en la cima. Al vencer a Mirra se sale de la pradera a otro setting, para variar lo visual (se define con el segundo jefe) | playtest hackatón, tanda 2 | vigente |
| D-205 | 2026-11-23 | progresión | Spawn: Sael y Odo caen al valle, al pie del Templo Celestial (Tavor los lanzó), con polvo y un temblor corto de ~1,5 s | playtest hackatón, tanda 4 | vigente |
| D-206 | 2026-11-23 | ui | Tutorial con tarjetas que salen por zonas al avanzar: mover (al aterrizar) → tensar y cortar → ancla → dash → enredo en pilares; ~4 s cada una y no exigen hacer la acción (precisa D-066) | playtest hackatón, tanda 2 | vigente |
| D-207 | 2026-11-23 | ui | Formato de tarjeta: mini animación en bucle de la mecánica, título corto, teclas o botones del dispositivo en uso y una línea de texto | playtest hackatón, tanda 2 | vigente |
| D-208 | 2026-11-23 | progresión | El muñeco de paja pasa al lobby como práctica opcional: no bloquea la salida | playtest hackatón, tanda 2 | vigente |
| D-209 | 2026-11-23 | progresión | Pasillo de 1–2 min con enemigos fáciles (segadores y brincadores), columnas para enredar y murales de lore | playtest hackatón, tanda 3 | vigente |
| D-210 | 2026-11-23 | arte | La subida se ve con rampas y escalones solo en el dibujo; la física sigue plana | playtest hackatón, tanda 3 | vigente |
| D-211 | 2026-11-23 | jefes | Entrada a Mirra: cruzar el arco de la cima → fundido corto → silencio (D-183) → presentación con una cinemática corta que hace zoom al jefe (D-006). Sin pantalla de carga | playtest hackatón, tanda 3 | vigente |
| D-212 | 2026-11-23 | alcance | Se quitan el carrito del Puesto 23 de la arena de Mirra y el cartel con el diálogo. El carrito volverá como tienda de completos en el pasillo hacia el segundo jefe, pagada con monedas que suelta el primer jefe (lo hace Dani). El 23 se decide después. Las condiciones de la hackatón quedan pendientes de esa integración | playtest hackatón, tandas 1 y 3 | vigente |
| D-213 | 2026-11-23 | progresión | Morir contra Mirra: reintento directo en la pradera con la presentación corta; la cinemática de entrada sale solo la primera vez (D-173) | playtest hackatón, tanda 4 | vigente |
| D-214 | 2026-11-23 | ui | Detrás del menú se ve el lobby; «Jugar» dispara la caída y el juego empieza ahí mismo, sin pantalla de carga | playtest hackatón, tanda 4 | vigente |
| D-215 | 2026-11-23 | proceso | Los cambios de números de Mirra (D-201, D-202) se aplican en feature/atados-slice y se avisa a Nacho | playtest hackatón, tanda 4 | vigente |
| D-216 | 2026-11-23 | progresión | El pasillo se queda como está por ahora (~30–60 s; se puede cruzar corriendo). Se reajusta después del playtest; precisa D-209 | revisión Codex del pasillo | vigente |
| D-217 | 2026-11-23 | lore | La Brasa Eterna se apaga cuando Sael y Odo vuelcan su urna en el Templo Celestial. Los dioses se corrompen y entran en guerra. Tavor, antes benevolente y generoso, los destierra unidos por la Cadena del Castigo Eterno. Sael roba para alimentar a su familia y su pueblo; Odo, para pagar sus deudas y sacar a su hermano de prisión. Se actualizan los tres murales y las frases de presentación, derrota y muerte de Mirra. Su título antiguo lleva un tachado rojo más visible. | cambios de Diego al prólogo y a los textos del juego | vigente |
