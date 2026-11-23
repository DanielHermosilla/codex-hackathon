// Recorrido de inicio (D-204 a D-211): lobby al pie del Templo Ancla → pasillo de subida entre ruinas →
// arco de la cima → pradera de Mirra. Se une a CONFIG como `CONFIG.recorrido` (ver config.js).
// Unidades: metros (m) y segundos (s). La física es plana (x, z); la subida es solo visual (`altura`).
// Posiciones sobre la ruta: s = metros recorridos desde el inicio de la ruta; d = desvío lateral
// (+ = a la derecha según se avanza). La ruta avanza hacia −z: hacia arriba en la pantalla.
// Dueños: gameplay (lobby, pasillo, tutorial, enemigos, flujo) y render (altura, camara, arte).
// Todo lo marcado PROVISIONAL no tiene cifra en el diseño: se ajusta jugando.
export const RECORRIDO = {
  // ─── Lobby: claro al pie del Templo Ancla donde caen Sael y Odo (D-205) ───
  lobby: {
    centro: [0, 0], // m: centro del claro (x, z)
    radio: 12, // m transitables desde el centro. PROVISIONAL
    spawn: { sael: [-1.8, 3], odo: [1.8, 3] }, // m: donde aterrizan (x, z)
    caida: { duracion: 1.5, altura: 14 }, // s que dura la caída y m desde donde caen (D-205). PROVISIONAL
    // Muñeco de práctica opcional (D-208): no bloquea la salida. Vida ya en la escala ×10 (D-202).
    muneco: { x: 6.5, z: 0.5, radio: 0.9, vida: 600, rearme: 4 }, // m, m, m, puntos, s hasta levantarse
  },

  // ─── Pasillo de subida (D-209): 1–2 min con enemigos fáciles, columnas y murales ───
  pasillo: {
    dios: "mirra", // D-175: el pasillo pertenece al dios del jefe siguiente
    jefe: "mirra",
    paleta: "pasillo", // zona de CONFIG.paleta.zonas
    ancho: 11, // m transitables (la cadena mide 7: cabe girarla). PROVISIONAL
    // Eje de la ruta (x, z). Empieza dentro del lobby y sube con curvas suaves; ~192 m ≈ 30 s corriendo.
    ruta: [
      [0, -8],
      [0, -34],
      [12, -58],
      [12, -86],
      [-5, -110],
      [-5, -138],
      [5, -160],
      [5, -190],
    ],
    // Columnas en ruinas para enredar la cadena (D-048, D-184). r en m.
    pilares: [
      { s: 44, d: 3.2, r: 0.7 },
      { s: 80, d: -1.5, r: 0.8 },
      { s: 124, d: 2.6, r: 0.75 },
      { s: 136, d: -2.8, r: 0.75 },
      { s: 150, d: 1.0, r: 0.8 },
      { s: 174, d: -2.5, r: 0.7 },
    ],
    // Tarjetas del tutorial (D-206, D-207): salen en este orden, una a la vez, al cruzar su marca.
    // `alAterrizar`: al terminar la caída. `s`: cuando el jugador más adelantado pasa esa marca.
    // `cercaMuneco`: también salta si alguien queda a menos de esos m del muñeco (lo que pase primero).
    // No exigen hacer la acción: se ocultan solas tras `tarjeta.duracion`.
    tutorial: [
      { clave: "mover", alAterrizar: true },
      { clave: "cortar", s: 6, cercaMuneco: 4.5 }, // 4,5 m: hay que acercarse (el spawn de Odo queda a ~5,3 m). PROVISIONAL
      { clave: "ancla", s: 28 },
      { clave: "dash", s: 70 },
      { clave: "enredo", s: 118 },
    ],
    tarjeta: { duracion: 4, separacion: 0.6 }, // s visible; s mínimos entre una y la siguiente. PROVISIONAL
    // Enemigos fáciles del dios de la zona (D-140, D-076): ver `enemigos` para sus números.
    enemigos: [
      { tipo: "segador", s: 38, d: -2.5 },
      { tipo: "segador", s: 42, d: 1.0 },
      { tipo: "segador", s: 50, d: -0.5 },
      { tipo: "brincador", s: 86, d: -2.0 },
      { tipo: "brincador", s: 94, d: 2.5 },
      { tipo: "segador", s: 128, d: 2.0 },
      { tipo: "segador", s: 132, d: -3.0 },
      { tipo: "brincador", s: 142, d: 0.0 },
    ],
    // Murales de lore que se activan al pasar (D-126). Textos en i18n (`mural.<id>`), BORRADOR para Diego.
    murales: [
      { id: "ladrones", s: 58, lado: 1 },
      { id: "urna", s: 104, lado: -1 },
      { id: "mirra", s: 166, lado: 1 },
    ],
    umbral: { s: 186 }, // m: el arco de la cima; cruzarlo lleva a la pradera de Mirra (D-211)
    arenaTecnica: 1000, // m: radio del círculo de createWorld; técnico, el borde real es lobby ∪ pasillo
    separacion: 3.2, // m entre Sael y Odo al colocarlos en una s (reinicio y utilidades de prueba)
  },

  // ─── Enemigos de pasillo (D-076: golpes ≤ 10 % de la vida, como mucho 2 atacando) ───
  // Números en la escala ×10 (D-202): vida y daño ya multiplicados. Los usa gameplay/enemigos.js.
  // Cada tipo tiene un solo ataque con la misma forma de datos (arco = tajo alrededor; linea = embestida).
  enemigos: {
    comun: {
      aggro: 13, // m: despiertan cuando un jugador vivo se acerca a menos de esto. PROVISIONAL
      maxAtacando: 2, // como mucho 2 enemigos en ataque a la vez (D-076). Más = pasillo más duro
      danoMaxFraccion: 0.1, // ningún golpe quita más del 10 % de la vida del jugador (D-076); lo comprueba un test
      separacion: 0.15, // m extra entre cuerpos de enemigos (técnico)
      toque: 0.1, // m que el frente de la embestida alcanza por delante del cuerpo, a lo largo de su franja (técnico)
      empujeFrenado: 7, // 1/s: lo rápido que se frena el empujón de un golpe (técnico, como en jefes)
      muerte: 0.6, // s que dura la caída del cuerpo (solo la lee el render con etapaK)
      pausaAzar: 0.25, // ± fracción de azar (con semilla) en la pausa entre ataques: evita que ataquen a la par. PROVISIONAL
    },
    // Segador hueco: lento, tajo corto en arco. Enseña el corte (D-140).
    segador: {
      vida: 40, // puntos: una pasada tensa corriendo lo corta con margen. PROVISIONAL
      radio: 0.5, // m del cuerpo
      velocidad: 2.4, // m/s al acercarse. PROVISIONAL
      giro: 6, // rad/s al girar hacia el jugador
      distanciaIdeal: 0.5, // m de hueco con el jugador en el que deja de acercarse
      pausa: 1.6, // s entre ataques. PROVISIONAL
      ataque: {
        forma: "arco",
        telegrafia: { normal: 0.9, dificil: 0.6 }, // s de aviso en el suelo antes del golpe. PROVISIONAL
        activo: 0.15, // s en que el tajo hace daño
        recuperacion: 1.0, // s quieto tras el tajo (ventana para cortarlo)
        alcance: 1.4, // m de hueco con el jugador desde el que empieza el ataque
        radio: 2.0, // m del arco del tajo desde el centro del cuerpo
        angulo: 100, // grados de apertura del arco
        largo: 0, // (solo embestida)
        ancho: 0, // (solo embestida)
        velocidad: 0, // (solo embestida)
        dano: 60, // puntos por golpe (6 % de 1000, D-076, D-202). PROVISIONAL
        empuje: 4, // m/s de empujón al golpear
        cooldown: 2.5, // s mínimos entre dos tajos
      },
    },
    // Brincador: embiste en línea recta a saltos. Enseña el dash (salir de la línea o dashear).
    brincador: {
      vida: 90, // puntos: dos pasadas tensas. PROVISIONAL
      radio: 0.55, // m
      velocidad: 2.0, // m/s. PROVISIONAL
      giro: 5, // rad/s
      distanciaIdeal: 3.0, // m de hueco que intenta mantener antes de embestir
      pausa: 1.8, // s entre ataques. PROVISIONAL
      ataque: {
        forma: "linea",
        telegrafia: { normal: 1.0, dificil: 0.65 }, // s de aviso. PROVISIONAL
        activo: 0.15, // s extra tras recorrer el largo (la embestida dura largo / velocidad + esto)
        recuperacion: 1.2, // s quieto tras la embestida
        alcance: 6.3, // m de hueco desde el que embiste
        radio: 0, // (solo tajo)
        angulo: 0, // (solo tajo)
        largo: 7, // m que recorre la embestida
        ancho: 1.1, // m de la marca en el suelo
        velocidad: 13, // m/s durante la embestida
        dano: 80, // puntos por golpe (8 % de 1000). PROVISIONAL
        empuje: 5, // m/s
        cooldown: 3, // s
      },
    },
  },

  // Pasillo seguro que se abre al vencer a Mirra. Límites en metros del mundo.
  salida: {
    zInicio: -18,
    zFin: -33,
    ancho: 11,
    bordePuesto: 1.8, // m en X: el furgón ocupa el lado derecho
    spawn: { sael: [-1.6, -20], odo: [1.2, -20] },
  },

  // ─── Flujo: lobby → pasillo → arco → jefe (D-211, D-213) ───
  flujo: {
    silencioArco: 2.0, // s de silencio tras cruzar el arco, antes de la presentación (D-183)
    fundidoArco: 0.6, // s del fundido al cruzar el arco (oculta el montaje de la pradera)
    reinicioPasillo: 1.5, // s entre caer los dos y reiniciar el pasillo (D-168, D-173). PROVISIONAL
  },

  // ─── Solo render: subida visual con rampas y escalones (D-210). La física sigue plana ───
  // Cada tramo eleva el suelo `sube` m entre s0 y s1; con `escalones` se hace en peldaños en vez de rampa.
  // Fuera de la ruta (lobby) el suelo está a 0. PROVISIONAL: lo ajusta el arte con captura.
  altura: [
    // Las rampas evitan las curvas de la ruta (s ≈ 26, 53, 81, 110, 138, 162): en una curva la proyección
    // salta y la rampa se vería escalonada. Los peldaños quedan en tramos rectos.
    { s0: 2, s1: 9, sube: 2, escalones: 6 }, // escalinata en ruinas que nace en el lobby
    { s0: 30, s1: 50, sube: 3.5 },
    { s0: 63, s1: 69, sube: 1.6, escalones: 5 },
    { s0: 95, s1: 102, sube: 2, escalones: 6 },
    { s0: 142, s1: 158, sube: 4 },
    { s0: 177, s1: 184, sube: 2, escalones: 6 }, // última escalinata, justo antes del arco
  ],
  // Encuadre de cámara en el recorrido (pisa a `CONFIG.camera.jefe`). PROVISIONAL
  camara: { minDist: 14, maxDist: 30, distPerMeter: 0.9, margen: 3 },
};
