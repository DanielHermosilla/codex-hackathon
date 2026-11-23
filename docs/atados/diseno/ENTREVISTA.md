# Entrevista de dirección — AtaDos

Objetivo: que no se escape ningún detalle antes de escribir código. Cada respuesta se registra con la skill `registrar-decision` (→ `docs/DECISIONES.md`) y se marca aquí con `✅ D-NNN`.
Se puede responder "no sé / decide tú": se anota como **delegada** y el agente propone opciones con justificación para que Diego las apruebe.
Prioridad: **🔴 bloquea el prototipo** · 🟡 bloquea el vertical slice · ⚪ puede esperar.

Orden recomendado: A → D → E → F → C → H → G → B → I → J. (La cadena y los jefes primero; el lore puede vestir después.)

---

## A. Visión, tono y experiencia
1. 🔴 En una frase, ¿qué tiene que sentir la gente al jugar? (caos gracioso / tensión épica / coordinación precisa / amistad / otra) — ✅ D-001
2. 🔴 Tono general: serio, cómico, absurdo, melancólico, mezcla. ¿Hay humor? ¿De qué tipo? — ✅ D-002, D-003
3. 🔴 ¿Para quién es? (amigos casuales en un sofá / jugadores de acción exigentes / jurado de hackatón / niños) — ✅ D-007–D-009
4. 🔴 ¿Cuánto dura una partida completa ideal? (5 min / 15 / 30 / 60+) — ✅ D-010
5. 🟡 Tres juegos, películas o series que capturen la sensación buscada, y qué tomar de cada uno (sensación, no copia). — ✅ D-036
6. 🟡 ¿Qué NO quieres que sea el juego? (anti-referencias) — ✅ D-118
7. 🟡 ¿La relación entre los dos personajes importa? (pareja, hermanos, rivales obligados, desconocidos, sin relación) — ✅ D-050, D-052
8. ⚪ Nombre definitivo: ¿"ATA2" se queda o es provisional? — ✅ D-125
9. ⚪ ¿Qué momento quieres que la gente cuente después de jugar? ("¡y entonces lo enrollamos y…!") — ✅ D-119

## B. Setting y lore
10. 🟡 ¿Quieres lore? (ninguno / ambiental, sin texto / ligero con frases / historia con escenas) — ✅ D-003, D-005, D-045, D-126
11. 🟡 ¿Dónde ocurre? (fantasía, sci-fi, mitología, mundo cotidiano, onírico, prehistoria, otro) — ✅ D-038
12. 🟡 ¿Época o estética de referencia? (medieval, retrofuturo, cyberpunk, folk latino, japonés, abstracto…) — ✅ D-038
13. 🟡 ¿Por qué están encadenados? (castigo, pacto, accidente, maldición, elección, no se explica) — ✅ D-039
14. 🟡 ¿Quiénes son los jefes en el mundo? (guardianes, carceleros, dioses, bestias, máquinas, versiones de ellos mismos) — ✅ D-043, D-058
15. 🟡 ¿Qué ganan al vencer a todos? ¿Hay final? ¿Se rompe la cadena? — ✅ D-040, D-053, D-101
16. ⚪ ¿Cómo se cuenta la historia? (intro corta, texto entre jefes, diálogos de jefes, nada explícito) — ✅ D-045
17. ⚪ ¿Hay narrador, voces, o solo imagen? — ✅ D-103
18. ⚪ ¿Finales distintos según cómo jueguen? — ✅ D-027 (post-demo)
19. ⚪ ¿Hay coleccionables de lore? (cartas, fragmentos, murales) — ✅ D-126
20. ⚪ ¿Idioma del juego? (español, inglés, ambos, sin texto) — ✅ D-102

## C. Dirección visual
21. 🟡 Estilo: low-poly facetado, toon/cel-shading, papel/recorte, pixel 3D, realista estilizado, minimal geométrico, otro. — ✅ D-036
22. 🟡 ¿3D completo, 2.5D o 2D con profundidad? — ✅ D-044
23. 🟡 Paleta: saturada, apagada, monocromo con acento, neón sobre oscuro, pastel. — 🟡 D-083 (delegada)
24. 🟡 Personajes: ¿humanos, criaturas, objetos, robots, espíritus? ¿Cómo se distinguen J1 y J2? (color, forma, silueta) — ✅ D-044, D-051, D-052
25. 🟡 ¿Cómo se ve la cadena? (metal, energía, cuerda, raíces, luz, cambia según tensión) — ✅ D-049
26. 🟡 Código de colores de gameplay: ¿qué color significa peligro, zona segura, eléctrico, objetivo? (se decide aquí, no hay uno heredado) — 🟡 D-087 (delegada)
27. 🟡 Arenas: ¿una arena distinta por jefe o la misma que cambia? — ✅ D-088
28. 🟡 Tamaño de jefes respecto a los jugadores (similar, 3×, gigante que ocupa la pantalla). — ✅ D-085
29. ⚪ Efectos: ¿mucha partícula y flash o sobrio? ¿Post-proceso (bloom, viñeta, grano)? — ✅ D-089
30. ⚪ Iluminación: día, noche, interiores, luz dramática por jefe. — ✅ D-086
31. ⚪ ¿Animaciones de personajes con esqueleto o procedurales (squash & stretch)? — ✅ D-090
32. ⚪ ¿Hay referencias visuales concretas? Pegarlas en `docs/arte/referencias/`. — ✅ D-036

## D. Jugabilidad y la cadena (núcleo)
33. 🔴 ¿La cadena es física real (simulada, se enreda, golpea) o abstracta (línea entre dos puntos)? — ✅ D-011
34. 🔴 Largo de la cadena: fijo, variable por acción, cambia con mejoras. — ✅ D-079
35. 🔴 ¿Cómo hace daño la cadena? Marcar todas las que apliquen: — ✅ D-012, D-013, D-015
    a) golpe por velocidad del segmento (latigazo) · b) un jugador gira al otro como mangual · c) cadena tensa como "cuchilla" que corta al pasar · d) enrollar/atar al jefe · e) cargar tensión y soltar · f) jalar al compañero como proyectil · g) objetos del escenario atados a la cadena · h) otra
36. 🔴 ¿Hay un mecanismo principal y los demás son secundarios? ¿Cuál es el principal? — ✅ D-012 (cuchilla tensa)
37. 🔴 ¿El daño depende de la coordinación de ambos (ej. solo hace daño si los dos hacen algo) o puede jugar uno solo de "arma"? — ✅ D-017
38. 🔴 ¿Hay roles fijos (ancla / atacante) o se intercambian libremente? — ✅ D-018
39. 🔴 Acciones por jugador: ¿cuántos botones? (mover + 1, mover + 2, mover + 3). ¿Cuáles? (dash, anclarse, saltar, jalar, soltar, agarrar) — ✅ D-019
40. 🔴 ¿Se puede saltar? ¿Hay verticalidad? — ✅ D-019 (sin salto, interpretado)
41. 🔴 ¿La cadena colisiona con el escenario y los ataques del jefe? ¿Bloquea proyectiles? — ✅ D-046, D-047, D-048
42. 🔴 ¿Qué pasa si los jugadores se separan al máximo? (se frenan, se arrastran, daño, se rompe temporalmente) — ✅ D-022
43. 🔴 Vida: ¿compartida o individual? ¿Cuántos golpes aguanta cada uno? — ✅ D-020
44. 🔴 ¿Qué pasa cuando uno cae? (arrastra el cuerpo, el otro lo revive, pierden ambos, cuenta atrás) — ✅ D-020, D-021
45. 🟡 ¿Hay fuego amigo? ¿La cadena puede dañar al compañero? — ✅ D-023
46. 🟡 Ritmo del combate: lento y táctico, medio, frenético. — ✅ D-056
47. 🟡 ¿Hay estamina, cooldowns o recursos? — ✅ D-014, D-069
48. 🟡 ¿Hay combo/multiplicador por golpes encadenados o por coordinación? — ✅ D-081
49. 🟡 Feedback de golpe: cuánto hit-stop, shake, números de daño sí/no. — ✅ D-080
50. 🟡 ¿Se puede jugar con un solo jugador? (IA compañera, controlar ambos, no) — ✅ D-016
51. ⚪ ¿Interacciones con el escenario? (postes para enrollar, objetos para lanzar, trampas que activar) — 🟡 D-048, D-138 (delegada)
52. ⚪ ¿Hay una mecánica "definitiva" (súper ataque coop)? — ✅ D-094

## E. Jefes y fases
53. 🔴 ¿Cuántos jefes en la versión de demo? ¿Y en la versión soñada? — ✅ D-024
54. 🔴 ¿Cada jefe enseña o pone a prueba una forma distinta de usar la cadena? — ✅ D-054
55. 🔴 ¿Cuántas fases por jefe? ¿Qué cambia entre fases? (patrones, arena, forma del jefe) — ✅ D-025
56. 🟡 ¿Los jefes atacan a un jugador en concreto, a la cadena, o a ambos? — ✅ D-091
57. 🟡 ¿Algún jefe intenta separar, enredar o cortar la cadena? — 🟡 D-047, D-139 (delegada)
58. 🟡 ¿Hay puntos débiles específicos o se golpea a cualquier parte? — ✅ D-092
59. 🟡 ¿Los jefes tienen personalidad visible? (gestos, burlas, reacción al dolor) — ✅ D-093
60. 🟡 ¿Telegrafías: cuánto aviso antes de un ataque? (generoso / justo / mínimo) — ✅ D-055
61. 🟡 ¿Hay esbirros/enemigos menores o solo jefes? — ✅ D-004, D-140
62. 🟡 Ideas concretas de jefes que ya tengas (nombre, forma, ataque estrella). — ✅ D-058, D-124
63. ⚪ ¿Jefe final especial? ¿Combina mecánicas de todos? — ✅ D-041
64. ⚪ ¿Jefes secretos u opcionales? — ✅ D-115
65. ⚪ ¿Duración objetivo por jefe? (1–2 min / 3–5 / más) — ✅ D-141

## F. Progresión, transición entre jefes y drops
66. 🔴 Estructura: lineal fija, orden a elegir, aleatorio (roguelite), mapa con ramas. — ✅ D-026
67. 🔴 ¿Cómo se pasa de un jefe al siguiente? (corte directo, pasillo/caminata, pantalla de descanso, la arena se transforma, elevador, portal) — ✅ D-004, D-006
68. 🔴 Al morir: ¿reinicia el jefe, todo el rush, o hay checkpoints? — ✅ D-028, D-029
69. 🟡 ¿Hay drops? Si sí: ¿de qué tipo? (mejoras de cadena, vida, cosméticos, modificadores, moneda) — ✅ D-030
70. 🟡 ¿Los drops son elección (escoger 1 de 3), aleatorios o fijos por jefe? — ✅ D-031
71. 🟡 ¿Las mejoras son compartidas o cada jugador elige la suya? — ✅ D-031 (uno para cada uno)
72. 🟡 ¿Hay que ponerse de acuerdo para elegir? (ambos votan, se turnan) — ✅ D-031 (no hay elección conjunta: un ítem para cada uno)
73. 🟡 ¿Hay sinergias/builds o mejoras simples de número? — ✅ D-096
74. 🟡 ¿Progresión permanente entre partidas (meta-progresión) o cada partida desde cero? — ✅ D-027 (post-demo)
75. ⚪ ¿Tienda o moneda? — ✅ D-097
76. ⚪ ¿Hay recompensa por rendimiento (sin daño, tiempo) — ✅ D-098, D-099
77. ⚪ ¿Desbloqueables? (skins, cadenas, modos) — ✅ D-027 (post-demo)
78. ⚪ ¿Hay que recoger el drop físicamente con la cadena? — ✅ D-031, D-135

## G. Sonido y música
79. 🟡 Género musical: orquestal, electrónica, chiptune, rock, folk, ambient, percusión tribal, mezcla. — ✅ D-059
80. 🟡 ¿Música distinta por jefe? ¿Cambia por fase o intensidad (música adaptativa)? — ✅ D-060
81. 🟡 ¿Sonido de la cadena: metálico realista, mágico, exagerado/cartoon? — ✅ D-062
82. 🟡 ¿Sonido generado por código (zzfx, estilo retro) o samples/música con licencia? — ✅ D-061
83. ⚪ ¿Voces o gruñidos de personajes y jefes? — ✅ D-103
84. ⚪ ¿Silencio dramático en momentos clave (antes del jefe, golpe final)? — 🟡 D-107 (delegada)
85. ⚪ ¿Sonido como pista de gameplay (cada ataque tiene su sonido de aviso)? — ✅ D-106
86. ⚪ ¿Música de menú y de victoria/derrota? — ✅ D-134

## H. UI, HUD, cámara y controles
87. 🔴 Plataforma de control: ambos en un teclado, teclado + mando, dos mandos, todas. — ✅ D-032
88. 🔴 Cámara: fija que encuadra a ambos, sigue el centro de los dos con zoom dinámico, cenital, isométrica, lateral. — ✅ D-033
89. 🟡 HUD: mínimo/diegético (vida en el personaje) o clásico (barras arriba). — ✅ D-063
90. 🟡 ¿Barra de vida del jefe visible? ¿Nombre del jefe con presentación? — ✅ D-064
91. 🟡 ¿Se muestra la tensión/fuerza de la cadena? ¿Cómo? — ✅ D-065
92. 🟡 Menús: estilo y flujo (título → selección → partida). ¿Selección de personaje? — ✅ D-073
93. ⚪ ¿Pausa? ¿Opciones (volumen, controles, accesibilidad)? — ✅ D-112, D-113
94. ⚪ ¿Tutorial: explícito, integrado en el primer jefe, o sin tutorial? — ✅ D-066
95. ⚪ ¿Pantalla de resultados al final? ¿Qué muestra? — ✅ D-098, D-101
96. ⚪ ¿Remapeo de controles? — ✅ D-112

## I. Dificultad, muerte y accesibilidad
97. 🟡 Dificultad objetivo: fácil de terminar, exigente justo, muy difícil. — ✅ D-109
98. 🟡 ¿Selector de dificultad o una sola? — ✅ D-029, D-077
99. 🟡 ¿Hay ayudas para parejas desparejas (uno experto, otro novato)? — ✅ D-110
100. ⚪ ¿Modo daltónico / paleta alternativa? ¿Reducir shake y flashes? — ✅ D-112 (sin daltónico)
101. ⚪ ¿Qué tan rápido se reintenta tras morir? (instantáneo / con pantalla) — ✅ D-111
102. ⚪ ¿Se escala la dificultad si van muy bien o muy mal? — ✅ D-114

## J. Alcance, plataforma y demo
103. 🔴 ¿Cuánto tiempo hay hasta la demo/entrega? ¿Fecha y hora? — ✅ D-034
104. 🔴 ¿Dónde se juega en la demo? (navegador en un portátil, proyector, URL pública) ¿Con qué controles físicos? — ✅ D-035
105. 🟡 ¿Quién juega en la demo? (Diego + jurado, dos del jurado, público) — ✅ D-035 (Mac de Diego; práctica)
106. 🟡 ¿Lo mínimo que tiene que existir para considerarlo un éxito? (MVP) — ✅ D-116
107. 🟡 ¿Lo primero que se recorta si no da el tiempo? — ✅ D-117
108. ⚪ ¿Hace falta trailer/GIF? (ffmpeg) — ✅ D-136
109. ⚪ ¿Publicar en itch.io, Vercel, GitHub Pages? — ✅ D-136
110. ⚪ ¿Móvil/táctil? ¿Rendimiento mínimo (portátil sin GPU)? — ✅ D-137

## K. Experimento y proceso
111. ⚪ ¿Qué medimos para comparar contra el juego de un prompt? (tiempo a jugable, nº de decisiones, bugs, valoración subjetiva 1–10, opinión de terceros) — ✅ D-129
112. ⚪ ¿Hay acceso a la versión "un prompt" para jugarlas lado a lado? — ✅ D-129
113. ⚪ ¿Cuánta autonomía tienen los agentes una vez cerrado el diseño? (preguntar todo / solo decisiones de diseño / total salvo alcance) — ✅ D-130, D-131, D-132, D-133

---

## Preguntas abiertas que surjan
(El agente `director-diseno` añade aquí lo que salga de las respuestas.)
- A3→ ¿Nombre del equipo confirmado? ("Geek Labs" fue un ejemplo). — ✅
- A3→ Intro de lore: ¿video pregrabado, escena en tiempo real con el motor, o ilustraciones con texto? ¿Duración? ¿Se puede saltar? — ✅
- A3→ Menú principal "inmerso": ¿escena 3D viva detrás del menú? ¿Los personajes ya están ahí? — ✅
- A2→ Pasillos: ¿duración entre jefes? ¿Se puede morir contra los enemigos fáciles? ¿Hay secretos o desvíos? — ✅
- A2→ Presentación del jefe: ¿cinemática corta con nombre en pantalla, cámara que lo recorre, rugido? ¿Saltable en reintentos? — ✅
- A2→ Lore simbólico: ¿qué fuente de referencias? (mitologías concretas, historia de Latinoamérica, pecados/virtudes, conceptos abstractos) — ✅
- D35→ ¿El compañero lanzado contra el jefe hace daño al chocar, o solo lo posiciona para cortar con la cadena? — ✅
- D35→ ¿Hay un umbral mínimo de tensión para hacer daño? ¿Se ve en la cadena (color, brillo, sonido)? — ✅
- D35→ ¿El dash tiene cooldown, estamina o cargas? ¿Cuánto dura la invulnerabilidad? — ✅
- D50→ Modo solo: en el dash unificado, ¿cada personaje dashea en su propia dirección de movimiento? — ✅
- D50→ ¿El modo solo es igual de difícil o tiene ajustes (más ventana de esquiva, menos vida del jefe)? — ✅
- D44→ Si mueren los dos, ¿se reintenta el jefe desde el inicio, desde la fase, o se pierde el rush? — ✅
- D44→ ¿El cadáver arrastrado puede cortar con la cadena (sigue siendo un extremo) o la cadena deja de dañar? — ✅
- D39→ Anclado: ¿el que se ancla puede seguir girando/rotando sobre sí mismo? ¿Puede dashear anclado? — ✅
- D29→ ¿El modo difícil entra en la demo o es post-demo? ¿Qué más cambia además de reiniciar el rush (daño, vida, telegrafías)? — ✅
- D31→ ¿El ítem del jefe es fijo por jefe o aleatorio de una pool? ¿Cada jugador puede quedarse con el del otro? — ✅
- D31→ ¿Las mejoras de cadena afectan a la cadena compartida (las ven los dos) aunque las recoja uno? — ✅
- D38→ ¿Qué mitología? (griega, nórdica, egipcia, mesoamericana/andina, inventada inspirada en varias) — ✅
- D41→ Con 3 jefes y el final siendo el dios: ¿quiénes son los jefes 1 y 2? (siervos del dios, dioses menores corrompidos, criaturas castigadas) — ✅
- D37→ Prólogo: ¿quién lo narra? ¿Qué muestra (la caída del dios, el castigo, el encadenamiento)? — ✅
- D36→ Con Hades II + Tunic de referencia: ¿personajes 3D low-poly estilizados en cámara 3/4, o personajes ilustrados 2D sobre escenario 3D? — ✅
- D57→ ¿Nombres definitivos de Odo, Sael, Tavor, Mirra, Ondar y del valle (Hestera)? ¿Quién es J1 y quién J2? — ✅
- D57→ ¿Qué color propio tiene cada protagonista (anillo, D-051)? — ✅ D-142
- D98→ Lápida del jefe: ¿qué stats muestra? ¿Persiste entre partidas (cementerio de intentos) o solo en la partida actual? — ✅
- Pantalla de resultados al terminar el rush completo: ¿existe, o el final de la historia la reemplaza? — ✅
- G83→ En voces marcaste «otra cosa» además de narrador, gruñidos y jefes: ¿qué era? — ✅
- B17→ Narrador: ¿voz grabada por alguien del equipo, TTS, o un idioma inventado con subtítulos? — ✅
- G83→ Pullas: ¿con qué frecuencia y cuándo? (al lanzar al otro, al arrastrar su cadáver, al revivir). ¿Se pueden apagar? — ✅
- D57→ ¿Nombres definitivos? Odo, Sael, Tavor, Mirra, Ondar, Hestera siguen provisionales. — ✅

---

## Tanda de producción 1 (2026-11-20) — GDD y fichas de jefes
Juntadas de `docs/design/*` (P-NN) y `docs/jefes/*` (J-N). Recomendación en **negrita**. 🔴 bloquea el greybox de la cadena o a Mirra.

**Cadena y jugadores (hito 1)**
- T1-01 🔴 ¿Cómo se mide la tensión? (P-01) → **rectitud de los eslabones por tramo** (funciona con pilares) · distancia/largo · fuerza física. — ✅ D-147
- T1-02 🔴 ¿Cómo corta? (P-02, P-03, J-1) → **la cadena atraviesa al jefe; daño continuo por paso = tensión × velocidad relativa cadena–cuerpo (si el jefe carga contra la cadena tensa, se corta)** · daño por pasada · la cadena choca y se enrolla. — ✅ D-148
- T1-03 🔴 ¿Odo y Sael tienen stats distintos? (P-04) → **idénticos; arrastra quien empuja más; el dash siempre gana** · Odo pesado/Sael ágil · solo el dash arrastra. — ✅ D-149
- T1-04 🔴 ¿La cadena arrastra a un anclado? (P-05) → **no, el ancla es absoluta frente a la cadena** · sí, reducido · absoluta salvo lanzamiento. — ✅ D-150
- T1-05 🔴 Lanzamiento (P-06) → **impulso cuando la cadena se tensa durante tu dash alejándote; el lanzado no controla en vuelo; dash sin dirección va hacia donde mira** · solo física · solo si ya estaba tensa. — ✅ anulada por D-144 (sin lanzamiento); dirección del dash sin input en D-151
- T1-06 🔴 Teclas (P-07) → **Sael: dash Espacio, ancla Shift izq. · Odo: dash Shift der., ancla Enter · mando: dash A/Cruz, ancla gatillo der. mantenido** · F/G y ./- · Q/E. — ✅ D-151
- T1-07 🔴 Golpe recibido y contacto (P-09, J-2) → **invulnerabilidad breve tras golpe; el cuerpo del jefe solo empuja, no daña** · el cuerpo daña · sin invulnerabilidad. — ✅ D-152
- T1-08 🔴 Modo solo (P-10, revisa D-120) → **el dash unificado usa la dirección propia de cada personaje (quien no tiene dirección no dashea) y hay una tecla de ancla por personaje; así existe el lanzamiento** · sin lanzamiento en solo · dos dashes. — ✅ D-145 (se mantiene D-120); lanzamiento eliminado en D-144

**Jefes**
- T1-09 🔴 Fases (P-08, J-3) → **por vida: Mirra 2, Ondar 3, Tavor 3; transición corta e invulnerable mientras cambia la arena** · 3 para todos · vida + tiempo. — ✅ D-153
- T1-10 🔴 ¿Mirra crece al comer? (J-4) → **tamaño fijo; la gula se ve en que devora la arena** · crece en fase 2. — ✅ D-154
- T1-11 🔴 ¿El dolor interrumpe al jefe? (P-13 vs J-5, los agentes discrepan) → tambaleo de ~1 s por daño acumulado (premia coordinar) · solo animación (predecible) · interrumpe cada corte a tensión máxima. — ✅ D-155
- T1-12 🔴 Destello del dios bueno (J-13) → **pausa real de 1–2 s sin ataques, ventana de castigo** · solo gesto. — ✅ D-156
- T1-13 Electrificar la cadena (P-21, J-7) → **no corta durante ~2 s (sin quitar vida)** · daña a quien la tense · solo visual. — ✅ D-157
- T1-14 Caer al agua en Ondar (J-8) → **daño y vuelve junto al compañero** · colgar de la cadena (caro) · bordes invisibles. — ✅ D-158
- T1-15 Tamaños de Tavor (J-9) → **de grande a pequeño (~8× → ~4× → ~2×)** · de pequeño a grande · grande-pequeño-grande. — ✅ D-159
- T1-16 Punto débil (J-10) → **solo la esquirla de Tavor en su fase final** · ninguno · también el ancla de Ondar. — ✅ D-160
- T1-17 Fallar la Sentencia final de Tavor (J-11) → **daño + runas apagadas 4 s** · solo daño. — ✅ D-161
- T1-18 ¿Qué suelta Tavor? (J-12) → **nada: su esquirla abre el final** · ítems de lore. — ✅ D-162
- T1-19 ¿Los jefes invocan esbirros? (J-16) → **no** · solo el final. — ✅ D-163
- T1-20 ¿Todo ataque da un rol a cada jugador? (P-22) → **sí, regla obligatoria en las fichas**. — ✅ D-164

**Progresión y drops**
- T1-21 Atribución de daño para stats (P-11) → **al jugador más cercano al punto de contacto** · por velocidad aportada · 50/50. — ✅ D-165
- T1-22 Números de daño continuo (P-12) → **un número que crece mientras dura el contacto; hit-stop al cruzar tensión alta** · uno por pasada. — ✅ D-166
- T1-23 Revivir y reintentar (P-14) → **vida llena; el reintento conserva los ítems con que entraron** · vida parcial · se pierden ítems. — ✅ D-167
- T1-24 Muere uno en pasillo (P-15) → **igual que en jefe: arrastra cadáver; se reinicia solo si caen los dos** · cualquier muerte reinicia. — ✅ D-168
- T1-25 Esquirla vs pool (J-6) → **la esquirla es narrativa (se incrusta en la cadena) y el ítem sale aparte de la pool** · la esquirla es un ítem más. — ✅ D-169
- T1-26 Drops (P-20) → **cada ítem lleva el color de su jugador y solo él lo recoge; 2–3 drops por pasillo; 3–4 ítems por pool**. — ✅ D-170
- T1-27 Curación en jefe (P-20, J-15) → **brasas al cambiar de fase en Ondar y Tavor; ninguna en Mirra** · ninguna · solo ítems. — ✅ D-171
- T1-28 Difícil (P-16, J-14) → **solo telegrafías justas + reiniciar el rush (en pasillo, solo si caen los dos); no desbloquea nada en la demo** · más daño · menos curación. — ✅ D-172
- T1-29 Duración 15–20 min (P-17) → **medida sin muertes, con reintento muy rápido** · acortar jefes. — ✅ D-173
- T1-30 Lápida (P-30) → **«sin daño» = ninguno de los dos; arrastre = llevar al otro al largo máximo o arrastrar el cadáver**. — ✅ D-174
- T1-31 Tutorial (P-25) → **enseña también el lanzamiento con una indicación breve**. — ✅ anulada por D-144 (no hay lanzamiento)
- T1-32 Pasillos (P-26) → **cada pasillo es del dios del jefe siguiente**. — ✅ D-175

**UI, lore y audio**
- T1-33 Cámara en jefe (P-18) → **encuadra a los dos jugadores y al jefe** · mínimo fijo por arena · fija. — ✅ D-176
- T1-34 Selección de modo (P-19) → **coop automático si J2 pulsa algo en el menú; dificultad en una pantalla única; idioma del navegador, cambiable en ajustes**. — ✅ D-177
- T1-35 Final de la demo (P-23) → **escena fija: los dos sostienen juntos la Brasa** · elección interactiva. — ✅ D-178
- T1-36 Narrador y recorte D-117 (P-24) → **el narrador del prólogo no se recorta**. — ✅ D-179
- T1-37 Nombres (P-27) → **se adoptan Ilya, Brun, Suné y Kesh; título del jefe con el nombre corrupto grande y el antiguo tachado debajo**. — ✅ D-180
- T1-38 «Otra cosa» en voces, D-103 (P-28) → ¿eran las pullas? (si no dices nada, se asume que sí). — ✅ D-181
- T1-39 «Música propia», D-134 (P-29) → **pistas dedicadas con licencia libre**. — ✅ D-182

**Propuestas delegadas para aprobar**
- D-107 silencios → **set de 5+1** (`docs/design/propuesta-D107-silencios.md`). — ✅ D-183
- D-138 escenario → **solo pilares estáticos que cambian por fase** (`docs/design/propuesta-D138-D139.md`). — ✅ D-184
- D-139 cadena → **solo Tavor intenta romperla, en su fase final; nunca se rompe** (mismo archivo). — ✅ D-185
- D-082/083/087 colores → en curso, con capturas (`docs/arte/propuesta-colores.md`). — D-082 ✅ D-142; D-083 y D-087 ✅ D-188 (v2)

## Tanda de producción 2 (respondida 2026-11-20) — huecos tras D-142…D-185
- T2-01 🔴 D-149 «el dash siempre gana» con D-144 (sin lanzamiento) (P-32) → **al largo máximo, quien dashea arrastra al otro, sin impulso extra** (provisional en el greybox). — ✅ D-190
- T2-02 🔴 Modo solo: teclas de dash unificado y ancla, y solo con un mando (P-10) → **dash Espacio; ancla Shift izq. (Sael) y Enter (Odo); un mando: stick izq. Sael, stick der. Odo, gatillos = anclas, A = dash** (provisional en el greybox, sin mando). — ✅ D-191
- T2-03 ¿La cadena corta con las runas apagadas tras fallar la Sentencia? (P-34) → **no corta durante esos 4 s** · corta igual. — ✅ D-192
- T2-04 ¿Algún jefe congela la cadena en la demo? (P-33) → **no; solo electrificar (Ondar)**. — ✅ D-193
- T2-05 «Al que más daño hace» para objetivos de jefe (P-31) → **misma regla que las stats (D-165), ventana de los últimos ~5 s**. — ✅ D-194
- T2-06 Efectos de esquirla de L1 (P-35) → **pasan a ítems de las pools** (las fichas ya lo hacen: Grano de Mirra, Corriente de Ondar). — ✅ D-195
- T2-07 Drop extra sin daño en Tavor (P-37) → **no aplica; la lápida lo registra**. — ✅ D-196
- T2-08 Caen los dos al agua a la vez (Ondar) → **vuelven al último punto seco común**. — ✅ D-197
- T2-09 El cuerpo de Ondar empuja al agua → **su cuerpo nunca empuja fuera del muelle**. — ✅ D-198
- T2-10 Título de Tavor (D-180) → **«Tavor, el Soberbio» grande, «el Juez» tachado debajo**. — ✅ D-199
