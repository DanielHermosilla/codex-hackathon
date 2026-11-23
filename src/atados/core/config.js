// Todos los números de balance y ajuste viven aquí (regla 1 de AGENTS.md).
// El recorrido de inicio (lobby, pasillo, tutorial) vive en su propio archivo para que gameplay y arte lo
// editen sin pisarse con el resto; se une abajo como `CONFIG.recorrido`.
import { RECORRIDO } from "./config-recorrido.js";

export const CONFIG = {
  sim: { fixedDt: 1 / 60, maxFrameDt: 1 / 20, maxStepsPerFrame: 4 },
  view: { fov: 50, near: 0.1, far: 200, cameraPos: [0, 9, 9] },
  colors: { placeholder: 0x8a8f98 },

  // ─── Hito 1: greybox de la cadena (ADR-001). «provisional» = valor sin decidir, se ajusta en playtest ───

  tienda: {
    precios: { italiano: 1, mote: 1, sopaipilla: 1 }, // monedas por producto, compartidas por la pareja
    carroPractica: { x: 10.5, z: -7.5 }, // m: hueco del muro del claro, a la derecha de la escalinata
    carro: { x: 4, z: -26 }, // m: ventanilla en el lateral del pasillo posterior a Mirra
    vidaItaliano: 250, // puntos por jugador en la escala ×10 (antes 25)
    alcance: 3.8, // Metros desde el centro hasta donde se puede pedir por la ventanilla.
  },

  // Stats idénticos para Sael y Odo (D-149).
  player: {
    radius: 0.45, // técnico
    moveSpeed: 6.5, // m/s, provisional (D-056 medio-rápido)
    accel: 16, // 1/s: tasa con que la velocidad va hacia la deseada; provisional (D-056, D-118)
    turnSpeed: 14, // rad/s, provisional
    mass: 1, // técnico: iguales (D-149)
    maxHp: 1000, // provisional (D-020); ×10 por D-202 (antes 100)
    hurtIframes: 0.8, // s de invulnerabilidad tras recibir golpe, provisional (D-152)
  },
  dash: {
    cooldown: 0.6, // s, D-069 (contado desde el inicio del dash)
    duration: 0.18, // s = ventana de invulnerabilidad (D-014, D-069), provisional
    distance: 3.2, // m, provisional
    massMult: 6, // PROVISIONAL (lectura literal D-149 + D-144): al largo máximo quien dashea gana el tirón; sin impulso extra ni lanzamiento
  },
  anchor: {
    turnSpeed: 10, // rad/s anclado (D-122), provisional
    pushFactor: 0.3, // fracción de empuje de ATAQUES que recibe anclado (D-122/D-150); sin uso hasta que haya ataques
  },
  chain: {
    length: 7, // m, largo base (D-079), provisional
    linkCount: 24, // técnico (D-011)
    iterations: 16, // técnico: iteraciones de arrastre de eslabones (fase 1, ADR-001)
    pathIterations: 16, // técnico: iteraciones de largo máximo (fase 2)
    closeIterations: 16,
    maxStretch: 0.005, // técnico: estiramiento tolerado antes de cancelar el paso (0.5 %)   // técnico: iteraciones del cierre largo/colisión de los extremos
    linkInvMass: 20, // técnico: peso inverso de un eslabón frente a un jugador (masa 1)
    pathMaxStep: 0.5, // técnico: desplazamiento máximo por iteración en la fase 2, en eslabones
    friction: 5, // 1/s: fricción de suelo de los eslabones, técnico
    radius: 0.07, // técnico: grosor para colisión con pilares
    contactEps: 0.06, // técnico: holgura para considerar un eslabón apoyado en un pilar
    height: 0.75, // render: altura de enganche en el cuerpo
    sag: 0.55, // render: comba máxima cuando está floja
    tension: {
      straightMin: 0.8, // rectitud a partir de la cual empieza a haber tensión (D-147), provisional
      curvePow: 1.6, // forma de la curva rectitud→tensión, continua y sin umbral de daño (D-068), provisional
      smoothing: 25, // 1/s, suavizado de la lectura (técnico; 0 = sin suavizado)
    },
  },
  damage: {
    chain: {
      scale: 70, // daño por (tensión × m/s × m de cadena dentro) por segundo (D-012, D-081, D-148), provisional; ×10 por D-202 (antes 7)
      maxRelSpeed: 30, // m/s, tope técnico para que una corrección brusca del solver no dispare el daño
    },
  },
  // D-020, D-021, D-070: el cadáver es un extremo pesado y sin control.
  corpse: {
    mass: 1.5, // provisional
    friction: 6, // 1/s, frena solo (sin control), provisional
    dragFactor: 0.6, // multiplica aceleración y giro del vivo mientras arrastra un cadáver ("tosco"), provisional
  },
  greybox: {
    arenaRadius: 15,
    dummy: { x: 0, z: 0, radius: 1.8, height: 3.2 }, // ~4× el jugador; solo empuja (D-152)
    pillars: [
      // D-048, D-184: pilares cilíndricos estáticos
      { x: -6.5, z: 3.5, r: 0.75 },
      { x: 6.5, z: 3.5, r: 0.75 },
      { x: 0, z: -7, r: 0.9 },
    ],
    spawn: { sael: [-2, 4], odo: [2, 4] },
    debugHurt: 250, // daño de la tecla de prueba; ×10 por D-202 (antes 25)
    colors: {
      sael: 0xf0e45a,
      odo: 0x4fb0ff,
      ground: 0x5a5d63,
      prop: 0x8a8f98,
      dummy: 0x9a9184,
      chainSlack: 0x55585e,
      chainTaut: 0xf2f2f2,
      corpse: 0x3a3c40,
    },
  },
  feedback: {
    hitstop: { enabled: true, tension: 0.85, duration: 0.05 }, // D-166: al cruzar tensión alta, provisional
    damageNumber: { gap: 0.2, linger: 0.8 }, // D-166: s sin contacto que cierran el golpe; s que queda visible
    dpsWindow: 1, // s
  },
  camera: {
    elevationDeg: 55, // 3/4 (D-033)
    minDist: 10,
    maxDist: 26,
    distPerMeter: 0.9, // zoom según distancia entre jugadores (D-033), provisional
    follow: 6, // 1/s
    // D-176: en jefe encuadra a los dos jugadores y al jefe. provisional
    // D-201: más «movida»: arena de 3 L (21 m de radio) → la cámara se aleja hasta 46 m (antes 14–30)
    jefe: { minDist: 16, maxDist: 46, distPerMeter: 0.9, margen: 3 }, // distPerMeter: m de cámara por m de encuadre
  },
  // D-100, D-174: arrastre = llevar al otro al largo máximo o arrastrar el cadáver.
  stats: {
    arrastre: {
      tenso: 0.985, // fracción del largo a partir de la cual la cadena está «al máximo» (técnico)
      velMin: 0.8, // m/s de desplazamiento forzado hacia el otro para contar como arrastre, provisional
      gap: 0.4, // s sin arrastre que cierran un episodio (técnico)
    },
  },

  // ─── Hito 2: jefes. Un jefe = datos que combinan bloques (regla 2). Distancias en L = chain.length (D-079). ───
  // Valores «de partida» de las fichas (docs/atados/diseno/jefes/*.md) salvo los marcados PROVISIONAL (sin cifra en la ficha).
  jefes: {
    comun: {
      telegrafiaSolo: 1.15, // D-121, ficha: modo solo +15 % (de partida)
      vidaSolo: 0.85, // PROVISIONAL D-121 «algo menos de vida» (sin cifra)
      presentacion: { primera: 4.0, reintento: 1.6 }, // s. PROVISIONAL. Completa la 1.ª vez, saltable en reintentos (D-074)
      transicion: 1.6, // s invulnerable mientras cambia la arena (D-153 «corta»). PROVISIONAL
      destello: 1.5, // s de pausa real sin ataques (D-156: 1–2 s)
      burla: 1.5, // s (ficha Mirra, de partida)
      tambaleo: { duracion: 1.0, ventana: 3, umbral: 0.15 }, // D-155 + ficha: 15 % de la vida en 3 s
      masDanoVentana: 8, // s de memoria del daño atribuido para «el que más daño hace». PROVISIONAL (P-31: usa D-165)
      empujeFrenado: 7, // 1/s, frenado del empuje al recibir un golpe (técnico)
      derrota: { esperaReintento: 0.8 }, // s antes de aceptar «reintentar» (D-173 reintento muy rápido). PROVISIONAL
      fraseDuracion: 3.2, // s en pantalla de las frases del jefe (técnico)
      pools: { zonas: 32, proyectiles: 16 }, // regla 6: pre-asignados (técnico)
    },
    // Práctica: un muñeco de paja quieto, sin ataques, para aprender a tensar la cadena y enredarla en un pilar.
    // Arena chica con dos pilares a los lados del muñeco.
    muneco: {
      monedas: 0, // la práctica no entrega recompensa
      textos: "muneco",
      arte: "muneco", // render/muneco-arte.js
      vida: 600, // ×10 por D-202 (antes 60) ≈ 4 pasadas tensas (una pasada al muñeco quita ~160; es más delgado que Mirra)
      radio: 0.9, // m: el cuerpo que la cadena tiene que cruzar
      altura: 2.6, // m: para colocar números de daño y la cámara de presentación
      velocidad: 0, // no se mueve
      giro: 0,
      distanciaIdealL: 0.5,
      pausa: 99, // s entre ataques: nunca ataca
      arena: {
        radioL: 1.7,
        jefe: [0, -0.15],
        sael: [-0.35, 0.7],
        odo: [0.35, 0.7],
        pilares: [
          { id: 0, angDeg: 200, distL: 1.05, r: 0.7 },
          { id: 1, angDeg: 340, distL: 1.05, r: 0.7 },
        ],
      },
      fases: [{ desde: 1.0, pausaMult: 1.0, ataques: [] }],
      ataques: {},
    },
    mirra: {
      monedas: 1, // recompensa por vencer a este jefe
      textos: "mirra",
      arte: "mirra", // render/mirra-arte.js       // claves de i18n: jefe.mirra.*
      vida: 12000, // ficha (de partida) ≈ 24 pasadas a tensión máxima; ×10 por D-202 (antes 1200)
      radio: 1.8, // m: ~4× el jugador, fijo (D-085, D-154)
      altura: 3.2,
      velocidad: 3.0, // m/s al acercarse. PROVISIONAL
      giro: 2.5, // rad/s. PROVISIONAL (sin giro instantáneo)
      distanciaIdealL: 0.5, // se acerca hasta esta distancia del borde de su cuerpo al objetivo. PROVISIONAL
      // Los avisos de arena se intercalan con el repertorio habitual de Mirra.
      ritual: {
        dano: {
          explosion: 520,
          luz: 320,
          vacio: 180,
          pisoton: 300,
          braseros: 260,
        }, // puntos en la escala ×10 de D-202
        inicio: 4,
        intervalo: 8,
        secuencia: [
          { id: "orbe", aviso: 5 },
          { id: "luz", aviso: 3 },
          { id: "pisoton", aviso: 3 },
          { id: "braseros", aviso: 4 },
        ],
      },
      pausa: 1.8, // s entre ataques en fase 1 («pausas largas»). PROVISIONAL
      arena: {
        radioL: 3, // D-201: claro de 3 L = 21 m de radio (antes 2,2 L); la cámara de jefe llega a 46 m para encuadrarlo
        jefe: [0, -0.4], // en L. PROVISIONAL
        sael: [-0.3, 1.1],
        odo: [0.3, 1.1], // en L. PROVISIONAL
        // Ocho coberturas de Mirra con los mismos ángulos que en el claro pequeño.
        // Las distancias crecen con el radio (3 / 2,2) para mantener los claros entre las coberturas.
        pilares: [
          { id: 0, angDeg: 28, distL: 1.83, r: 0.75 },
          { id: 1, angDeg: 137, distL: 2.28, r: 0.75 },
          { id: 2, angDeg: 208, distL: 1.62, r: 0.75 },
          { id: 3, angDeg: 321, distL: 2.36, r: 0.75 },
          { id: 4, angDeg: 54, distL: 1.06, r: 0.75 },
          { id: 5, angDeg: 161, distL: 2.09, r: 0.75 },
          { id: 6, angDeg: 245, distL: 1.99, r: 0.75 },
          { id: 7, angDeg: 346, distL: 1.24, r: 0.75 },
        ],
      },
      // D-153: 2 fases por vida. `desde` = fracción de vida a la que empieza.
      fases: [
        { desde: 1.0, pausaMult: 1.0, ataques: ["siega", "grano", "hambre"] },
        // ficha: pausas un 30 % más cortas; devora 2 pilares (cuáles: PROVISIONAL, dos opuestos)
        {
          desde: 0.5,
          pausaMult: 0.7,
          ataques: ["siega_doble", "enjambre", "banquete", "hambre"],
          devora: [1, 3],
          destello: true,
        },
      ],
      // Telegrafía {normal, dificil} en s (D-055, D-172). Roles (D-164) en docs/atados/diseno/jefes/mirra.md.
      // alcanceL: distancia máxima (L) al objetivo para elegir el ataque. cooldown/peso: planificador con RNG. PROVISIONAL
      ataques: {
        siega: {
          sonido: "hoz",
          objetivo: "cercano",
          telegrafia: { normal: 1.2, dificil: 0.7 },
          recuperacion: 1.2,
          alcanceL: 1.3,
          cooldown: 2.5,
          peso: 3,
          bloques: [
            {
              tipo: "barrido",
              forma: "arco",
              angulo: 120,
              radioL: 1.5,
              vueltas: 1,
              activo: 0.2,
              dano: 200,
              empuje: 6,
            },
          ], // activo = s que tarda la hoja en cruzar el arco (PROVISIONAL)
        },
        siega_doble: {
          sonido: "hoz_doble",
          objetivo: "cercano",
          telegrafia: { normal: 1.2, dificil: 0.7 },
          recuperacion: 1.5,
          alcanceL: 1.3,
          cooldown: 3,
          peso: 3,
          bloques: [
            {
              tipo: "barrido",
              forma: "arco",
              angulo: 120,
              radioL: 1.5,
              vueltas: 2,
              entre: { normal: 0.6, dificil: 0.4 },
              activo: 0.2,
              dano: 200,
              empuje: 6,
            },
          ],
        },
        grano: {
          sonido: "tripas",
          objetivo: "ambos",
          telegrafia: { normal: 1.4, dificil: 0.9 },
          recuperacion: 1.5,
          alcanceL: 99,
          cooldown: 4,
          peso: 2,
          bloques: [
            {
              tipo: "proyectil_arco",
              cantidad: 5,
              radioImpactoL: 0.4,
              posicion: "alrededorAmbos",
              dispersionL: 0.9,
              vuelo: 0.6,
              activo: 0.5,
              dano: 150,
              empuje: 3, // activo = púas 0,5 s (efectoAlCaer)
              salidaRadio: 1.3, // m libres que el patrón siempre deja para los dos con la cadena puesta (técnico)
              salidaMargen: 0.75, // fracción de lo que un jugador recorre en la telegrafía que puede quedar lejos la salida (técnico)
            },
          ],
        },
        hambre: {
          sonido: "mandibulas",
          objetivo: "masDano",
          telegrafia: { normal: 1.0, dificil: 0.6 },
          recuperacion: 1.0,
          alcanceL: 4,
          cooldown: 4,
          peso: 2,
          bloques: [
            {
              tipo: "carga",
              distanciaL: 4,
              anchoL: 0.6,
              velocidad: 16, // anchoL PROVISIONAL: la ficha dice 1 L, pero con la cadena de 1 L los dos no caben fuera a lados opuestos (rol D-164 imposible)
              dano: 250,
              empuje: 8,
              recalcularObjetivo: false,
              tropiezo: { duracion: 1.5, tensionMin: 0.5, danoMin: 80 }, // ficha: si la cadena tensa la corta, tropieza 1,5 s (umbral PROVISIONAL; ×10 por D-202, antes danoMin 8)
            },
          ],
        },
        enjambre: {
          sonido: "zumbido",
          objetivo: "cercano",
          telegrafia: { normal: 1.5, dificil: 1.0 },
          recuperacion: 0.8,
          alcanceL: 99,
          cooldown: 12,
          peso: 2,
          bloques: [
            {
              tipo: "zona_movil",
              radioL: 0.8,
              duracion: 6,
              velocidadRelativa: 0.7,
              danoPorTick: 50,
              tick: 0.5,
            },
          ],
        },
        banquete: {
          sonido: "inhalacion",
          objetivo: "cercano",
          telegrafia: { normal: 1.2, dificil: 0.8 },
          recuperacion: 2.5,
          alcanceL: 1.5,
          cooldown: 10,
          peso: 2,
          bloques: [
            { tipo: "tiron_radial", fuerza: 3.5, duracion: 2, alcanceL: 3 }, // fuerza en m/s (< carrera: se escapa corriendo). PROVISIONAL
            {
              tipo: "zona_circular",
              radioL: 1.2,
              posicion: "jefe",
              cantidad: 1,
              activo: 0.1,
              dano: 300,
              empuje: 8,
            }, // activo PROVISIONAL: mordida instantánea, ≤ dash.duration para que un dash a tiempo la esquive
          ],
        },
      },
    },
  },
  // ─── Audio (docs/atados/diseno/gdd/07-audio.md). Efectos por código con zzfx (D-061), cadena (D-062), avisos
  // propios por ataque (D-106), música adaptativa por capas (D-059, D-060), silencios (D-183), ajustes (D-112).
  // Valores de sonido: de partida, se afinan a oído en playtest. Sin voces ni pullas aún (recorte D-117).
  audio: {
    activo: true,
    volumen: { master: 0.8, musica: 0.55, efectos: 0.9, voces: 1.0 }, // D-112: ajustes 0–1
    pullas: true, // D-186/D-112: on/off (sin pullas grabadas todavía, D-117)
    desbloqueo: ["pointerdown", "keydown", "touchend"], // política de autoplay: arranca tras un gesto
    rampaS: 0.03, // técnico: constante de tiempo de los cambios de ganancia (sin clics)
    pan: { ancho: 14, max: 0.6 }, // m de x que llevan al pan máximo; pan máximo (estéreo suave)
    jugadores: { tono: [1.12, 0.9] }, // Sael más agudo, Odo más grave: se distinguen sin mirar

    // D-062: el hilo sonoro. Zumbido armónico continuo que sube de tono con la tensión + eslabones.
    cadena: {
      zumbido: {
        frecuencia: [98, 196], // Hz floja → tensa (sube una octava)
        curva: 1.3, // forma tensión→tono/ganancia (continua, sin umbral, D-068)
        ganancia: [0.04, 0.3],
        armonicos: [1, 1.5, 2, 3], // fundamental, quinta, octava, duodécima: acorde «divino»
        pesos: [1, 0.45, 0.32, 0.12],
        desafinadoCents: 6, // segundo oscilador por armónico: coro lento
        brillo: [450, 3400], // Hz del pasabajos floja → tensa
        tremolo: { hz: [0.4, 7], profundidad: [0.08, 0.3] }, // el pulso se acelera con la tensión: avisa del daño
        suavizadoS: 0.04,
      },
      eslabones: {
        porMetro: 1.2,
        maxPorSeg: 14,
        tensionMax: 0.55,
        volumen: 0.8,
        sonidos: ["eslabon1", "eslabon2", "eslabon3"],
      },
      tensa: { sube: 0.6, baja: 0.3, sonido: "cadenaTensa" }, // chasquido al tensarse (con histéresis)
      arrastre: { ganancia: 0.4, velRef: 4, filtroHz: 650, q: 0.9 }, // D-020/D-070: arrastrar el cadáver
    },
    corte: {
      volumen: [0.3, 1],
      tono: [0.85, 1.35],
      repetirS: 0.11,
      sonido: "corte",
      fuerte: "corteFuerte",
      final: "corteFinal",
    },

    // D-183 + propuesta-D107-silencios.md. Un silencio = duck con nombre sobre buses; `blanco` nunca se toca.
    silencios: {
      activo: true,
      blancos: ["cadena", "avisoAtaque", "golpeRecibido"], // categorías de sonido que nunca se callan
      fadeOutMs: 150,
      fadeInMs: 60,
      cadenaGanancia: 1, // zumbido durante el silencio (1 = igual: no engaña sobre la tensión)
      cancelable: true, // un aviso de ataque corta el silencio de música antes de tiempo
      // motivo del evento `silencio` (gameplay) → id del momento
      motivos: {
        umbral: "umbral",
        nombre: "nombreJefe",
        fase: "cambioFase",
        golpe_final: "golpeFinal",
        muerte_uno: "muerteUno",
        muerte_ambos: "muerteAmbos",
        prologo_brasa: "prologoBrasa",
        prologo_cadena: "prologoCadena",
        final_brasa: "finalBrasa",
      },
      // rompeCon: id de sfx, 'jefe:<clave>' (sonido del jefe actual), 'musica:fase' o 'tema:<id>'.
      momentos: {
        umbral: {
          // Abierto (null): del fin del fundido del arco hasta la entrada a la presentación; lo cierra el
          // flujo con `silencio:fin` (D-211). Sin rompeCon: `peleaInicio` suena solo con `pelea_inicio`.
          duracionMs: null,
          buses: ["musica", "ambiente"],
          nivel: 0,
          rompeCon: null,
          habilitado: true,
        },
        nombreJefe: {
          duracionMs: 800,
          buses: ["musica"],
          nivel: 0,
          rompeCon: "presentacionGolpe",
          soloPrimeraVez: true,
          habilitado: true,
        },
        cambioFase: {
          duracionMs: 1000,
          buses: ["musica", "ambiente"],
          nivel: 0,
          rompeCon: "musica:fase",
          habilitado: true,
        },
        golpeFinal: {
          duracionMs: 1250,
          buses: ["todo"],
          nivel: 0,
          rompeCon: "jefe:muerte",
          habilitado: true,
        },
        muerteUno: {
          duracionMs: 500,
          buses: ["capaAlta"],
          nivel: 0.6,
          rompeCon: null,
          habilitado: false,
        }, // opcional: playtest
        muerteAmbos: {
          duracionMs: 1750,
          buses: ["todo"],
          nivel: 0,
          rompeCon: "tema:derrota",
          habilitado: true,
        },
        prologoBrasa: {
          duracionMs: 1750,
          buses: ["musica", "voces"],
          nivel: 0,
          rompeCon: null,
          habilitado: true,
        },
        prologoCadena: {
          duracionMs: 800,
          buses: ["musica"],
          nivel: 0,
          rompeCon: "cadenaTensa",
          habilitado: false,
        },
        finalBrasa: {
          duracionMs: 2500,
          buses: ["musica"],
          nivel: 0,
          rompeCon: null,
          habilitado: false,
        },
      },
    },

    // D-060: tema por zona; el jefe suma capas y cambia por fase/intensidad. Pistas con licencia (D-061,
    // D-182) en public/atados/audio/musica/<carpeta>/: `<capa>.ogg` = stem de esa capa; otro nombre = pista completa
    // (reemplaza las capas; su ganancia por estado en `completa`). Lo que falte suena con un placeholder
    // generado por código (`sinte`), apagable con `placeholders`. Ver src/atados/audio/pistas.js.
    musica: {
      activa: true,
      placeholders: true,
      crossfadeS: 2.5, // entre zonas
      capaS: 1.2, // al sumar o quitar una capa
      finS: 0.6, // capas fuera al terminar el combate
      adelantoS: 0.25, // técnico: ventana de programación de notas
      zonaPorJefe: { mirra: "trigal", muneco: "pasillo" }, // la práctica suena con el folk del pasillo
      intensidad: {
        porVidaJefe: 0.45,
        porAtaque: 0.25,
        porCaido: 0.35,
        porVidaBaja: 0.25,
        vidaBaja: 0.35,
        subeS: 0.6,
        bajaS: 3,
      },
      zonas: {
        pasillo: {
          carpeta: "pasillo-mirra",
          completa: { ganancia: 0.8, estados: { pasillo: 1 } },
          bpm: 72,
          raiz: 146.83,
          escala: [0, 2, 3, 5, 7, 9, 10], // re dórico: folk antiguo
          capas: {
            base: { sinte: "drone", ganancia: 0.42, estados: ["pasillo"] },
            folk: {
              sinte: "arpa",
              ganancia: 0.3,
              estados: ["pasillo"],
              patron: [0, 4, 7, 4, 9, 7, 4, 2],
              cada: 1,
            },
          },
        },
        trigal: {
          carpeta: "mirra",
          completa: {
            ganancia: 0.8,
            estados: { presentacion: 0.55, pelea: 1 },
            porFase: [0.9, 1],
          },
          bpm: 84,
          raiz: 146.83,
          escala: [0, 2, 3, 5, 7, 8, 10], // re eólico
          capas: {
            base: {
              sinte: "drone",
              ganancia: 0.4,
              estados: ["presentacion", "pelea"],
            },
            pulso: {
              sinte: "tambor",
              ganancia: 0.5,
              estados: ["pelea"],
              patron: [1, 0, 0, 0.45, 0.8, 0, 0.55, 0],
            },
            cuerdas: {
              sinte: "pad",
              ganancia: 0.26,
              estados: ["pelea"],
              porFase: [0.6, 1],
              acordes: [
                [0, 3, 7],
                [-4, 0, 3],
                [-2, 2, 5],
                [-5, -2, 2],
              ],
            },
            fase2: {
              sinte: "tension",
              ganancia: 0.3,
              estados: ["pelea"],
              faseMin: 2,
            },
            alto: {
              sinte: "brillo",
              ganancia: 0.2,
              estados: ["pelea"],
              intensidadMin: 0.45,
              intensidadAncho: 0.25,
              alta: true,
            },
          },
        },
      },
      // D-134/D-182: pistas dedicadas (primer archivo de su carpeta). Placeholder si falta.
      temas: {
        victoria: {
          carpeta: "victoria",
          sinte: "fanfarria",
          ganancia: 0.6,
          retrasoS: 0.7,
        },
        derrota: {
          carpeta: "derrota",
          sinte: "lamento",
          ganancia: 0.55,
          retrasoS: 0,
        },
        menu: { carpeta: "menu", sinte: null, ganancia: 0.6, retrasoS: 0 },
      },
    },

    // Qué suena en cada ataque (D-106: aviso propio por `sonido` de la ficha) y en cada momento del jefe.
    avisos: {
      hoz: "avisoHoz",
      hoz_doble: "avisoHozDoble",
      tripas: "avisoTripas",
      mandibulas: "avisoMandibulas",
      zumbido: "avisoZumbido",
      inhalacion: "avisoInhalacion",
    },
    avisoGenerico: "avisoGenerico",
    // Enemigos del pasillo (D-209): aún no tienen sonidos propios; reutilizan los del combate. Evento → id de sfx.
    // PROVISIONAL hasta que el diseño de audio les dé voz. Quitar una clave = ese evento no suena.
    enemigos: {
      "enemigo:telegrafia": "avisoGenerico", // aviso de ataque (peligro: misma categoría que los del jefe)
      "enemigo:herido": "corte", // fin de un corte de la cadena
      "enemigo:muere": "corteFinal", // el corte que lo derriba
    },
    jefes: {
      // El muñeco no ataca: solo se queja al cortarlo y al caer.
      muneco: {
        golpes: {},
        golpeGenerico: "mirraSiega",
        dolor: "mirraDolor",
        transicion: "mirraTransicion",
        muerte: "mirraDolor",
      },
      mirra: {
        golpes: {
          siega: { sonido: "mirraSiega" },
          siega_doble: { sonido: "mirraSiega", repetirDe: "entre" }, // segundo barrido tras `entre` del bloque
          grano: { sonido: "mirraGrano", retrasoDe: "vuelo" }, // caen al terminar el vuelo
          hambre: { sonido: "mirraHambre" },
          enjambre: { sonido: "mirraEnjambre", bucle: true }, // suena mientras la nube existe
          banquete: { sonido: "mirraBanquete" },
        },
        golpeGenerico: "mirraSiega",
        dolor: "mirraDolor",
        transicion: "mirraTransicion",
        muerte: "mirraMuerte",
      },
    },

    // Efectos zzfx. Claves = parámetros de zzfx (orden en src/atados/audio/reglas.js ORDEN_ZZFX; `zzfxArgs` da el
    // array que se pega en el diseñador de ZzFX). Un sonido es una lista de capas mezcladas (`retraso` en s;
    // `desdeFin`: s antes del final del aviso). `ajuste: 'sostener' | 'ataque'` estira la capa a la telegrafía.
    // categoria ∈ silencios.blancos → bus blanco (nunca se calla).
    sfx: {
      eslabon1: {
        categoria: "cadena",
        capas: [
          {
            volumen: 0.22,
            frecuencia: 1900,
            soltar: 0.06,
            modulacion: 310,
            filtro: 900,
          },
        ],
      },
      eslabon2: {
        categoria: "cadena",
        capas: [
          {
            volumen: 0.2,
            frecuencia: 2300,
            soltar: 0.05,
            modulacion: 270,
            filtro: 900,
          },
        ],
      },
      eslabon3: {
        categoria: "cadena",
        capas: [
          {
            volumen: 0.2,
            frecuencia: 1600,
            soltar: 0.07,
            modulacion: 410,
            filtro: 900,
          },
        ],
      },
      cadenaTensa: {
        categoria: "cadena",
        capas: [
          {
            volumen: 0.45,
            frecuencia: 700,
            sostener: 0.02,
            soltar: 0.2,
            forma: 2,
            modulacion: 150,
            ruido: 0.3,
            desliz: 2,
            filtro: 400,
            caida: 0.03,
            volSostener: 0.6,
          },
          { volumen: 0.25, frecuencia: 1320, soltar: 0.35, modulacion: 95 },
        ],
      },
      corte: {
        categoria: "cadena",
        capas: [
          {
            volumen: 0.55,
            frecuencia: 1400,
            sostener: 0.03,
            soltar: 0.12,
            forma: 2,
            modulacion: 220,
            desliz: -4,
            ruido: 0.5,
            filtro: 600,
          },
          {
            volumen: 0.35,
            frecuencia: 220,
            soltar: 0.1,
            forma: 4,
            filtro: -3000,
          },
        ],
      },
      corteFuerte: {
        categoria: "cadena",
        capas: [
          {
            volumen: 0.9,
            frecuencia: 90,
            sostener: 0.04,
            soltar: 0.4,
            forma: 1,
            desliz: -0.4,
            ruido: 0.6,
            caida: 0.04,
            volSostener: 0.6,
          },
          { volumen: 0.45, frecuencia: 1300, soltar: 0.5, modulacion: 180 },
          {
            volumen: 0.3,
            frecuencia: 400,
            soltar: 0.08,
            forma: 4,
            filtro: 800,
          },
        ],
      },
      corteFinal: {
        categoria: "cadena",
        capas: [
          {
            volumen: 1,
            frecuencia: 70,
            sostener: 0.08,
            soltar: 0.9,
            forma: 1,
            desliz: -0.15,
            ruido: 0.8,
            caida: 0.06,
            volSostener: 0.7,
          },
          { volumen: 0.5, frecuencia: 1046.5, soltar: 1.2, modulacion: 140 },
          { volumen: 0.35, frecuencia: 1568, soltar: 1.4, retraso: 0.05 },
          {
            volumen: 0.35,
            frecuencia: 500,
            soltar: 0.12,
            forma: 4,
            filtro: 700,
          },
        ],
      },
      dash: {
        categoria: "jugador",
        capas: [
          {
            volumen: 0.38,
            frecuencia: 900,
            ataque: 0.02,
            sostener: 0.05,
            soltar: 0.12,
            forma: 4,
            desliz: -6,
            filtro: -2500,
          },
        ],
      },
      ancla: {
        categoria: "jugador",
        capas: [
          {
            volumen: 0.75,
            frecuencia: 120,
            sostener: 0.05,
            soltar: 0.35,
            forma: 1,
            modulacion: 47,
            caida: 0.05,
            volSostener: 0.5,
            desliz: -0.3,
            ruido: 0.2,
          },
          { volumen: 0.22, frecuencia: 880, soltar: 0.4, modulacion: 133 },
        ],
      },
      anclaSuelta: {
        categoria: "jugador",
        capas: [
          {
            volumen: 0.25,
            frecuencia: 600,
            soltar: 0.08,
            forma: 1,
            modulacion: 90,
            desliz: 1,
          },
        ],
      },
      golpeRecibido: {
        categoria: "golpeRecibido",
        capas: [
          {
            volumen: 0.85,
            frecuencia: 160,
            sostener: 0.03,
            soltar: 0.18,
            forma: 2,
            desliz: -1.2,
            ruido: 1.2,
            caida: 0.03,
            volSostener: 0.6,
            filtro: -1800,
          },
          { volumen: 0.3, frecuencia: 1200, soltar: 0.06, forma: 4 },
        ],
      },
      muerteJugador: {
        categoria: "jugador",
        capas: [
          {
            volumen: 0.6,
            frecuencia: 330,
            sostener: 0.3,
            soltar: 0.7,
            forma: 1,
            desliz: -0.25,
            volSostener: 0.7,
            caida: 0.1,
          },
          {
            volumen: 0.7,
            frecuencia: 70,
            sostener: 0.05,
            soltar: 0.5,
            forma: 0,
            desliz: -0.05,
            ruido: 0.3,
          },
        ],
      },
      revivir: {
        categoria: "jugador",
        capas: [
          { volumen: 0.35, frecuencia: 523.25, soltar: 0.5 },
          { volumen: 0.33, frecuencia: 659.25, soltar: 0.5, retraso: 0.08 },
          { volumen: 0.31, frecuencia: 783.99, soltar: 0.55, retraso: 0.16 },
          { volumen: 0.3, frecuencia: 1046.5, soltar: 0.8, retraso: 0.24 },
        ],
      },
      // Avisos de Mirra (docs/atados/diseno/jefes/mirra.md · Audio): hoz, dos afiladas, tripas + silbido, mandíbulas, zumbido, inhalación.
      avisoHoz: {
        categoria: "avisoAtaque",
        capas: [
          {
            volumen: 0.55,
            frecuencia: 900,
            ataque: 0.05,
            sostener: 0.8,
            soltar: 0.08,
            forma: 2,
            modulacion: 170,
            ruido: 2,
            desliz: 1.5,
            filtro: 1200,
            repetir: 0.3,
            ajuste: "sostener",
          },
        ],
      },
      avisoHozDoble: {
        categoria: "avisoAtaque",
        capas: [
          {
            volumen: 0.55,
            frecuencia: 1100,
            ataque: 0.04,
            sostener: 0.8,
            soltar: 0.08,
            forma: 2,
            modulacion: 210,
            ruido: 2,
            desliz: 2.5,
            filtro: 1500,
            repetir: 0.15,
            ajuste: "sostener",
          },
          {
            volumen: 0.3,
            frecuencia: 520,
            ataque: 0.04,
            sostener: 0.8,
            soltar: 0.08,
            forma: 2,
            modulacion: 120,
            ruido: 1.5,
            desliz: 1.5,
            filtro: 800,
            repetir: 0.3,
            ajuste: "sostener",
          },
        ],
      },
      avisoTripas: {
        categoria: "avisoAtaque",
        capas: [
          {
            volumen: 0.75,
            frecuencia: 70,
            ataque: 0.1,
            sostener: 1,
            soltar: 0.1,
            forma: 2,
            ruido: 3,
            modulacion: 9,
            filtro: -450,
            ajuste: "sostener",
          },
          {
            volumen: 0.3,
            frecuencia: 2000,
            ataque: 0.05,
            sostener: 0.2,
            soltar: 0.15,
            desliz: -3,
            desdeFin: 0.4,
          },
        ],
      },
      avisoMandibulas: {
        categoria: "avisoAtaque",
        capas: [
          {
            volumen: 0.75,
            frecuencia: 500,
            sostener: 0.8,
            soltar: 0.05,
            forma: 4,
            tremolo: 1,
            repetir: 0.11,
            desliz: -8,
            filtro: 300,
            ajuste: "sostener",
          },
          {
            volumen: 0.85,
            frecuencia: 260,
            soltar: 0.09,
            forma: 4,
            filtro: 200,
            desdeFin: 0.1,
          },
        ],
      },
      avisoZumbido: {
        categoria: "avisoAtaque",
        capas: [
          {
            volumen: 0.5,
            frecuencia: 180,
            ataque: 1.3,
            soltar: 0.05,
            forma: 2,
            modulacion: 31,
            ruido: 0.4,
            tremolo: 0.3,
            repetir: 0.025,
            filtro: -1500,
            deslizDelta: 0.002,
            ajuste: "ataque",
          },
        ],
      },
      avisoInhalacion: {
        categoria: "avisoAtaque",
        capas: [
          {
            volumen: 0.6,
            frecuencia: 200,
            ataque: 1.1,
            soltar: 0.1,
            forma: 4,
            desliz: 0.6,
            filtro: -900,
            ajuste: "ataque",
          },
          {
            volumen: 0.45,
            frecuencia: 55,
            ataque: 1.1,
            soltar: 0.1,
            forma: 1,
            ajuste: "ataque",
          },
        ],
      },
      avisoGenerico: {
        categoria: "avisoAtaque",
        capas: [
          {
            volumen: 0.5,
            frecuencia: 440,
            ataque: 0.1,
            sostener: 0.6,
            soltar: 0.1,
            forma: 1,
            tremolo: 0.6,
            repetir: 0.12,
            ajuste: "sostener",
          },
        ],
      },
      // Golpes y momentos de Mirra.
      mirraSiega: {
        categoria: "jefe",
        capas: [
          {
            volumen: 0.65,
            frecuencia: 600,
            sostener: 0.1,
            soltar: 0.15,
            forma: 4,
            desliz: -5,
            filtro: -3000,
          },
          { volumen: 0.25, frecuencia: 980, soltar: 0.3, modulacion: 160 },
        ],
      },
      mirraGrano: {
        categoria: "jefe",
        capas: [0, 0.05, 0.11, 0.14, 0.2].map((retraso) => ({
          volumen: 0.5,
          frecuencia: 95,
          soltar: 0.14,
          forma: 4,
          filtro: -900,
          retraso,
        })),
      },
      mirraHambre: {
        categoria: "jefe",
        capas: [
          {
            volumen: 0.6,
            frecuencia: 60,
            sostener: 0.22,
            soltar: 0.15,
            forma: 2,
            ruido: 2,
            filtro: -600,
          },
          {
            volumen: 0.9,
            frecuencia: 280,
            soltar: 0.1,
            forma: 4,
            filtro: 250,
            retraso: 0.2,
          },
        ],
      },
      mirraEnjambre: {
        categoria: "jefe",
        capas: [
          {
            volumen: 0.32,
            frecuencia: 210,
            sostener: 1,
            forma: 2,
            modulacion: 23,
            tremolo: 0.4,
            repetir: 0.03,
            filtro: -1400,
          },
        ],
      },
      mirraBanquete: {
        categoria: "jefe",
        capas: [
          {
            volumen: 1,
            frecuencia: 75,
            sostener: 0.05,
            soltar: 0.35,
            forma: 1,
            desliz: -0.3,
            ruido: 1,
            caida: 0.04,
            volSostener: 0.6,
          },
          {
            volumen: 0.8,
            frecuencia: 300,
            soltar: 0.12,
            forma: 4,
            filtro: 220,
            retraso: 0.02,
          },
        ],
      },
      mirraDolor: {
        categoria: "jefe",
        capas: [
          {
            volumen: 0.65,
            frecuencia: 140,
            ataque: 0.05,
            sostener: 0.3,
            soltar: 0.4,
            forma: 2,
            desliz: -0.3,
            modulacion: 6,
            ruido: 0.8,
            filtro: -1200,
          },
          {
            volumen: 0.25,
            frecuencia: 3000,
            sostener: 0.2,
            soltar: 0.3,
            forma: 4,
            filtro: 2000,
          },
        ],
      },
      mirraTransicion: {
        categoria: "jefe",
        capas: [
          {
            volumen: 0.7,
            frecuencia: 50,
            ataque: 0.2,
            sostener: 0.9,
            soltar: 0.5,
            forma: 2,
            ruido: 2.5,
            filtro: -400,
          },
          {
            volumen: 0.6,
            frecuencia: 240,
            soltar: 0.25,
            forma: 4,
            filtro: 300,
            retraso: 0.3,
          },
          {
            volumen: 0.6,
            frecuencia: 200,
            soltar: 0.3,
            forma: 4,
            filtro: 260,
            retraso: 0.8,
          },
        ],
      },
      mirraMuerte: {
        categoria: "jefe",
        capas: [
          {
            volumen: 0.85,
            frecuencia: 180,
            ataque: 0.05,
            sostener: 0.8,
            soltar: 1.4,
            forma: 2,
            desliz: -0.12,
            modulacion: 4,
            ruido: 1,
            filtro: -1500,
          },
          {
            volumen: 0.4,
            frecuencia: 400,
            sostener: 0.6,
            soltar: 0.8,
            forma: 4,
            filtro: 500,
            retraso: 0.4,
          },
        ],
      },
      destello: {
        categoria: "jefe",
        capas: [
          {
            volumen: 0.3,
            frecuencia: 1046.5,
            ataque: 0.2,
            sostener: 0.5,
            soltar: 0.8,
            tremolo: 0.3,
            repetir: 0.07,
          },
          {
            volumen: 0.25,
            frecuencia: 1318.5,
            ataque: 0.25,
            sostener: 0.45,
            soltar: 0.8,
          },
          {
            volumen: 0.22,
            frecuencia: 1568,
            ataque: 0.3,
            sostener: 0.4,
            soltar: 0.9,
          },
        ],
      },
      presentacionGolpe: {
        categoria: "ui",
        capas: [
          {
            volumen: 1,
            frecuencia: 58,
            sostener: 0.1,
            soltar: 1.2,
            desliz: -0.04,
            caida: 0.05,
            volSostener: 0.7,
          },
          {
            volumen: 0.35,
            frecuencia: 300,
            soltar: 0.2,
            forma: 4,
            filtro: -1200,
          },
        ],
      },
      peleaInicio: {
        categoria: "ui",
        capas: [
          { volumen: 0.8, frecuencia: 82, soltar: 0.5, desliz: -0.1 },
          {
            volumen: 0.25,
            frecuencia: 900,
            soltar: 0.1,
            forma: 4,
            filtro: 600,
          },
        ],
      },
      faseGolpe: {
        categoria: "ui",
        capas: [
          {
            volumen: 0.9,
            frecuencia: 65,
            sostener: 0.06,
            soltar: 0.7,
            desliz: -0.06,
            caida: 0.04,
            volSostener: 0.7,
          },
          { volumen: 0.3, frecuencia: 740, soltar: 0.6, modulacion: 110 },
        ],
      },
    },
  },
  // D-032, D-123, D-151. Remapeable: cambiar códigos de KeyboardEvent.code / índices de la Gamepad API.
  controls: {
    keyboard: {
      sael: {
        up: "KeyW",
        down: "KeyS",
        left: "KeyA",
        right: "KeyD",
        dash: ["Space"],
        anchor: ["ShiftLeft"],
      },
      odo: {
        up: "ArrowUp",
        down: "ArrowDown",
        left: "ArrowLeft",
        right: "ArrowRight",
        dash: ["ShiftRight"],
        anchor: ["Enter", "NumpadEnter"],
      },
      soloDash: ["Space"], // PROVISIONAL: modo solo, un botón hace dashear a los dos (D-016, D-120); anclas = las de coop. Un solo mando en solo: pendiente
      debug: {
        hurtSael: "Digit1",
        hurtOdo: "Digit2",
        killSael: "Digit9",
        killOdo: "Digit0",
        revive: "KeyR",
        reset: "KeyT",
      },
    },
    gamepad: {
      axisX: 0,
      axisY: 1,
      deadzone: 0.2,
      dash: 0,
      anchor: 7,
      anchorThreshold: 0.5,
      // Modo solo con un mando: stick izq. + LT = Sael, stick der. + RT = Odo, A = los dos esquivan.
      solo: { odoX: 2, odoY: 3, anclaSael: 6, anclaOdo: 7 },
    },
  },

  // ─── Hito 3: HUD diegético (D-063). Solo presentación: ningún valor cambia el gameplay. Colores: siempre tokens de `paleta`. ───
  hud: {
    anillo: {
      // arcos en el suelo alrededor de cada jugador (src/atados/render/hud-anillos.js)
      segmentos: 96, // técnico: resolución angular del arco de vida y del de dash
      vida: [0.88, 1.04], // radios interior/exterior (m); por fuera del anillo del cuerpo (0.55–0.72)
      dash: [0.76, 0.86],
      ancla: [1.08, 1.13],
      y: 0.05, // m sobre el suelo
      orden: 1, // renderOrder: por debajo de las telegrafías (2 y 3), que quedan siempre encima
      vidaBaja: 0.3, // fracción de vida bajo la cual el arco late. PROVISIONAL
      pulsoHz: 2.5, // latidos por s con vida baja. PROVISIONAL
      pulsoMin: 0.6, // opacidad relativa en el valle del latido
      pistaOpacidad: 0.45, // fondo oscuro (costra) bajo el arco de vida: se lee sobre cualquier suelo
      dashPistaOpacidad: 0.35,
      dashOpacidad: 0.95,
      muertoOpacidad: 0.35,
    },
    numeroDano: {
      // D-166, D-112: activable/desactivable (ajustes)
      activo: true,
      valorMin: 5, // por debajo no se muestra; ×10 por D-202 (antes 0,5)
      tamanoMin: 22, // px
      // D-202: el daño es ×10, así que √valor crece ×√10 ≈ 3,16. Para que un mismo golpe relativo se vea apenas más
      // grande que antes (no ×3), la escala baja de 5 a 2: para el mismo golpe relativo (valor antes v, ahora 10 v)
      // px = 22 + √(10 v) × 2 ≈ 22 + √v × 6,3, es decir ~+5 % en golpes chicos (v = 1: 27 → 28 px) y ~+16 % en
      // medianos (v = 40: 54 → 62 px). El tope sube de 84 a 96 px (+14 %) para que los golpes grandes no se aplasten
      // contra el tope antes que antes. Subir `escala` agranda todos; subir `tamanoMax` solo los golpes más fuertes.
      tamanoMax: 96, // px, tope
      escala: 2, // px = min + √valor × escala, con tope
      altoExtra: 1.1, // m sobre lo alto del jefe (por encima del sombrero de Mirra)
    },
    jefe: {
      estela: 0.9, // 1/s: lo que tarda la estela clara en alcanzar la vida real tras un golpe
      fundidoBarra: 0.4, // s
    },
    presentacion: {
      // D-064, D-180: el nombre entra primero, luego el antiguo tachado, luego la frase
      fundido: 0.35, // s de entrada y salida del velo
      retrasoAntiguo: 0.8, // s desde el inicio
      retrasoFrase: 1.7,
      fundidoTexto: 0.6,
    },
    derrota: { fundido: 0.2 }, // s: D-173 reintento muy rápido, nada de fundidos largos
    lapida: { altura: 2.8, retraso: 0.5, fundido: 0.7 }, // m sobre la marca; s desde que aparece
    // Números de daño de los enemigos del pasillo (ui/hud-numeros-enemigos.js): salen al cerrar cada corte
    // (`enemigo:herido`). Tamaño = el del número del jefe (`numeroDano`) × `escala`. PROVISIONAL: sin cifra en el diseño.
    numeroEnemigo: {
      pool: 6, // números a la vez (técnico); con más cortes simultáneos se reutiliza el más viejo
      duracion: 0.9, // s que se ve cada número (más = se acumulan más en pantalla)
      fundido: 0.35, // s finales en que se apaga
      subida: 0.8, // m que sube mientras dura
      altura: 1.9, // m sobre el suelo donde sale (por encima de la cabeza de segadores y brincadores)
      escala: 0.8, // fracción del tamaño del número del jefe: los enemigos son menores y sus números también
    },
    // Franjas de cine de la entrada a Mirra (ui/cinematica.js, D-211). PROVISIONAL: sin cifra en el diseño.
    cinematica: {
      entrada: 0.7, // s que tardan en entrar del todo (más largo = entrada más solemne)
      salida: 0.5, // s que tardan en salir
      alto: 11, // % del alto de la pantalla que tapa cada franja (más alto = más «cine», menos juego visible)
    },
    tutorial: { fundidoEntrada: 0.25, fundidoSalida: 0.25 },
    mural: { duracion: 7, fundidoEntrada: 0.7, fundidoSalida: 0.9 }, // s; PROVISIONAL (el pasillo puede mandar mural:ocultar antes)
    mando: {
      // rótulo de cada botón estándar de la Gamepad API, por familia (la genérica es la de Xbox)
      xbox: [
        "A",
        "B",
        "X",
        "Y",
        "LB",
        "RB",
        "LT",
        "RT",
        "Select",
        "Start",
        "L3",
        "R3",
      ],
      ps: [
        "✕",
        "○",
        "□",
        "△",
        "L1",
        "R1",
        "L2",
        "R2",
        "Share",
        "Options",
        "L3",
        "R3",
      ],
    },
  },

  // Recorrido de inicio: lobby al pie del Templo Ancla → pasillo de subida → arco → Mirra (config-recorrido.js).
  recorrido: RECORRIDO,

  // Página: tiempos del flujo menú → caída → recorrido → Mirra (main.js). Solo presentación.
  ui: {
    finJefe: 5.5, // s para leer la lápida de Mirra antes de la pantalla de victoria
    // Al cruzar el arco la pantalla funde a negro (`recorrido.flujo.fundidoArco`) y, ya cargada la pradera, se
    // abre sobre ella durante el silencio (D-183, D-211). s de esa apertura. PROVISIONAL.
    aperturaJefe: 0.8,
  },

  // ─── Hito 3: arte del vertical slice. Solo render: nada de esto cambia el gameplay. ───
  // Valores de partida para ajustar con captura y jugando (skill game-feel).
  render: {
    pixelRatioMax: 2,
    exposicion: 1.15, // NeutralToneMapping (igual que la propuesta de color aprobada, D-188)
    bloom: { fuerza: 0.45, radio: 0.5, umbral: 1.0 }, // D-089 suave: solo runas, Brasa y corrupción pasan el umbral
    sombras: { mapa: 2048, margen: 4, radio: 3 },
    // PROPUESTA hito 3 (Diego aprueba): colores de material que la paleta aprobada no cubre.
    materiales: {
      cuero: 0x4a3328,
      metal: 0xa49c8c,
      maderaHerramienta: 0x7a5636,
      // Capas con el color de cada jugador (D-142) apagado: se distinguen sin mirar el anillo.
      capaSael: 0xc9b443,
      capaOdo: 0x3d82c4,
      telaEspantapajaros: 0x8a7866,
      cuerda: 0x5e4a34,
    },
    jugador: {
      escala: 1.3, // tamaño visual del modelo (la colisión sigue en player.radius)
      anillo: {
        radio: 0.66,
        grosor: 0.075,
        fondoOpacidad: 0.28,
        rellenoOpacidad: 0.1,
        segmentos: 48,
      }, // D-051, v2 plano; el arco = vida (D-063)
      zancada: { sael: 0.95, odo: 0.8 }, // m por paso completo
      inclinacion: 0.045, // rad por m/s (adelante al correr)
      ladeo: 0.06, // rad por rad/s de giro
      dashEstirar: 0.28, // squash & stretch del dash
      capa: { rigidez: 60, amortiguacion: 9, porVelocidad: 0.16, maxAng: 1.25 },
      golpe: { inclinacion: 0.5, recupera: 7, tinteReducido: 0.18 }, // tinteReducido: señal estable sin flashes (D-112)
      caida: 0.35, // s que tarda en quedar tendido al morir
      cadaverTinte: 0.55, // multiplica el color del cadáver (apagado, sin cambiar el tono)
    },
    cadena: {
      subEslabones: 2, // eslabones dibujados por segmento simulado
      vibracion: { desde: 0.85, amplitud: 0.035, frecuencia: 55 }, // D-065: «llamativo» a tensión alta
      pulso: { desde: 0.6, velocidad: 9, ancho: 0.18 }, // brillo que recorre las runas tensas
    },
    trigal: {
      dentro: { matas: 3500, altura: [0.16, 0.42] }, // bajo la rodilla: no tapa anillos ni avisos (ficha Mirra)
      fuera: { matas: 3400, altura: [0.75, 1.25], radio: 46 },
      viento: { fuerza: 0.09, velocidad: 1.6 },
      franjas: { ancho: 6, segado: 2.6, altura: 0.08 }, // fase 2: siega en franjas (m)
      vetas: {
        ramas: 9,
        pasos: 7,
        revelarFase1: 0.3,
        revelarFase2: 1,
        opacidad: 0.55,
      },
      brillo: { veta: 1.25, vetaSuelo: 0.75, esquirla: 1.8 }, // multiplican CONFIG.paleta.corrupcion × corrupcion de la zona
      // D-204: la pradera está en la cima del monte, como un olimpo en ruinas. Todo es decorado fuera del claro.
      cima: {
        borde: 9, // m entre el borde del claro y el borde del risco (meseta = radio del claro + borde)
        caida: 7, // m que baja el risco justo pasado el borde de la meseta
        profundidad: 46, // m bajo la pradera hasta el fondo del valle
        // m: anillo de columnas rotas (distancia por fuera del claro, alto al fondo, tocones del lado de la cámara)
        ruinas: {
          distancia: 3.2,
          columnas: 18,
          alto: [2.2, 5.2],
          altoCerca: 1.1,
          radio: 0.55,
        },
        arco: { distancia: 4.5, ancho: 5.2, alto: 5.6 }, // m: arco de llegada detrás de Sael y Odo (+z)
        nubes: { n: 26, radio: [40, 120], altura: [-20, -12] }, // mar de nubes bajo la cima (m)
        // Malla del suelo de la cima: lado (m) y celdas por lado (más celdas = risco más fino, más triángulos).
        suelo: { tam: 150, segmentos: 75 },
        // m: por debajo de esta altura el suelo es roca (color de risco y sin trigo sembrado encima).
        roca: -0.6,
        // Fondo del valle: disco de radio (m) con gajos y anillos. Los anillos parten el disco en caras
        // pequeñas para que se vean las parcelas (más anillos = parcelas más finas, más triángulos).
        valle: { radio: 190, segmentos: 48, anillos: 12 },
      },
    },
    // Escena del recorrido: lobby al pie del Templo Ancla y pasillo de subida entre ruinas (render/templo.js,
    // render/recorrido.js). Solo dibujo: la física sigue plana (D-210). Todo PROVISIONAL, ajustado con captura.
    templo: {
      bordeEscalones: 1.5, // m por fuera del borde del pasillo en que los peldaños se funden en rampa (altura.js)
      cinta: { paso: 0.5, margen: 0.8, columnas: 6, faldon: 5 }, // suelo del pasillo: m entre filas, m extra por lado, losas a lo ancho, m de cornisa hacia abajo
      terreno: { paso: 2.5, margen: 75, delante: 45, detras: 70 }, // m de malla; m alrededor de la ruta; m hacia la cámara y más allá de la cima
      ladera: { sube: 10, ancho: 24 }, // izquierda de la subida: el monte sube estos m en estos m
      valle: { fondo: 12, ancho: 20, ruido: 0.9 }, // derecha: cae hasta `fondo` m bajo el lobby; ruido en m
      muretes: { cada: 1.7, huecos: 0.3, alto: [0.35, 1.15], grueso: 0.6 }, // m; fracción de huecos; m; m
      lobby: { muros: 22, urna: [-10.8, -9.5] }, // tramos de muro en ruinas alrededor del claro; m (x, z) del altar
      columnas: { alto: [3.4, 5.2], lados: 10 }, // m (rotas a distinta altura); caras del fuste
      arco: { alto: 6.4, grueso: 1.3 }, // m
      mural: { ancho: 3.4, alto: 2.6, separa: 1.1, brillo: 0.9, cerca: 7 }, // m; m del borde; emisión al pasar; m de s
      lejos: { arboles: 260, casas: 26 }, // decorado del valle (instancias)
      // Caída (D-205): trauma de cámara al aterrizar, motas de polvo y lascas por jugador, empuje del polvo y
      // fracción de la altura de caída que sigue la cámara (0 = mira al suelo y entran desde arriba).
      caida: {
        duracionSacudida: 1.5, // s que tarda en apagarse el temblor del aterrizaje (D-205)
        sacudida: 0.55, // trauma de cámara 0..1 al aterrizar (más = temblor más fuerte)
        polvo: 22, // motas de polvo por jugador
        trozos: 5, // lascas de piedra por jugador
        fuerza: 2.2, // empuje del polvo (más = nube más ancha)
        camara: 0.55, // fracción de la altura de caída que sigue la cámara (0 = se queda abajo)
      },
      muneco: 0.6, // escala del muñeco del lobby respecto de `render.muneco.escala` (práctica opcional, D-208)
      // Cámara del pasillo: m de ruta por delante de la pareja que entran en el encuadre; m antes del arco en
      // que el arco también entra, y su radio de encuadre (m).
      camara: { adelante: 6, arco: 24, arcoRadio: 3 },
      menu: { s: 12, radio: 5 }, // encuadre del menú (D-214): punto de la escalinata (m de ruta) que entra detrás
    },
    jefe: {
      flash: 0.6, // emisión blanca al recibir un corte fuerte (≤ 3/s)
      golpe: 0.33, // s del golpe en los clips (telegrafía = 0..1 s del clip)
    },
    // Furgón (render/puesto.js): tienda de completos al borde de la arena. Colores sin rojo (D-188).
    puesto: {
      mirarA: [0, -23], // punto (x, z en m) al que mira el frente del carrito
      escala: 1.5,
      carro: 0x326950,
      borde: 0xf9eaca,
      rueda: 0x2e2a28,
      vidrio: 0x48656b,
      pan: 0xe8a45b,
      palta: 0x91af45,
      vienesa: 0x9b5b38,
    },
    // Muñeco de práctica (render/muneco-arte.js): escala del modelo de pilar, vaivén y caída.
    muneco: {
      escala: 1.75,
      marca: 0.55,
      flash: 0.5,
      vaiven: 0.03,
      inclinacion: 0.32,
      recuperacion: 3.5,
      caida: 0.8,
    },
    // Cámara del nombre del jefe (D-064). Presentación corta (reintentos): plano bajo delante del jefe que gira
    // `giro` rad y se funde con el encuadre de juego desde k = `entrada` (k = avance 0..1 de la presentación).
    presentacion: {
      distancia: 7.5, // m del jefe al plano bajo
      altura: 2.4, // m de la cámara al empezar (sube 1,5 m mientras dura)
      giro: 0.7, // rad que rodea al jefe
      entrada: 0.62, // k desde el que se abre al encuadre de juego
      // D-211: cinemática de entrada (solo la primera vez; la pide la integración con `vista.cinematica = true`).
      // Empuje lento desde un plano medio hasta la cara de Mirra con leve giro → sostén mientras sale el nombre →
      // se abre al encuadre de juego. Los tramos son fracciones k de la presentación (gameplay fija su duración).
      cinematica: {
        empuje: 0.45, // k en que termina el acercamiento (más alto = empuje más lento)
        sosten: 0.72, // k en que termina el sostén y empieza a abrirse al encuadre de juego
        distanciaMedio: 15, // m de la cámara a la cara al empezar (plano medio: se ve el cuerpo entero)
        distanciaCerca: 4.8, // m al terminar el empuje (plano cercano: cara y copa llenan el cuadro)
        alturaMedio: 1.8, // m sobre el suelo al empezar: contrapicado, el jefe se ve enorme
        alturaCerca: 2.5, // m al terminar el empuje (casi a la altura de la cara)
        giro: 0.5, // rad que rodea durante el empuje (0 = empuje recto)
        deriva: 0.35, // m que sigue acercándose durante el sostén (sin congelarse del todo)
        cara: { adelante: 0.9, altura: 0.8 }, // punto mirado: m delante del tronco y fracción de la altura del jefe
        // Movimiento reducido (D-112): plano fijo sin empuje ni giro, y apertura suave desde `entrada`.
        reducido: { distancia: 8.5, altura: 2.2 },
      },
    },
    // Enemigos de pasillo (render/enemigos-arte.js, D-140, D-209): mortales tocados por polvo de esquirla del
    // dios de la zona. Segador = hueco con hoz (tajo en arco); brincador = encorvado como langosta (embiste).
    // Valores de partida para ajustar con captura. Colores: tokens de la paleta de la zona y de CONFIG.render.materiales.
    enemigos: {
      max: 12, // pool pre-asignado (regla 6): enemigos dibujados a la vez como mucho
      escala: 1.25, // tamaño visual del modelo (~1,7 m de alto el segador; la colisión sigue en gameplay)
      destello: 0.16, // s que dura el destello blanco al recibir un corte (golpeT)
      flash: 0.9, // emisión blanca máxima del destello (0 = sin destello)
      tinteReducido: 0.25, // con flashes apagados (D-112): aclarado estable en vez de destello
      retroceso: 0.35, // rad que se echa atrás al recibir un corte
      vetas: { brillo: 1.2, telegrafia: 2.4 }, // emisión de las vetas ámbar en reposo y al final de la telegrafía
      quieto: { vaiven: 0.05, velocidad: 0.9 }, // rad y 1/s del balanceo en reposo
      acecha: { paso: 7.5, rebote: 0.07, inclinacion: 0.16 }, // rad/s del ciclo, m de rebote, rad hacia delante
      segador: {
        guardia: 0.55, // rad extra que lleva la hoz hacia atrás al final de la telegrafía (más allá del arco)
        agacharse: 0.18, // m que baja el cuerpo al cargar el tajo
        temblor: 0.035, // rad de temblor al final de la telegrafía (anticipación)
      },
      brincador: {
        agacharse: 0.32, // m que baja el cuerpo al cargar la embestida
        estirar: 0.3, // estiramiento (squash & stretch) en la embestida
        salto: 0.28, // m que se despega del suelo al embestir
        temblor: 0.05, // m de temblor al final de la telegrafía
      },
      muere: { hundir: 0.9, inclinar: 1.2, pajaN: 14, polvoN: 10 }, // m que se hunde, rad que se ladea, partículas
      // m sobre el suelo de la telegrafía; segmentos del arco. `anillos` (arco) y `tramos` [a lo largo, a lo ancho]
      // (embestida): subdivisiones de la marca para que cada vértice se apoye en la altura visual del suelo
      // (rampas y escalones). Más = sigue mejor el relieve, más vértices que recolocar por cuadro mientras se ve.
      marca: {
        alto: 0.03,
        relleno: 0.04,
        segmentos: 28,
        anillos: 6,
        tramos: [12, 2],
      },
    },
  },
  feel: {
    // D-080/D-112: se pueden reducir o apagar. Respeta prefers-reduced-motion y ?reducir.
    reducirMovimiento: false,
    shake: {
      activo: true,
      escala: 1,
      decaimiento: 1.8,
      amplitud: 0.45,
      rotacion: 0.02,
      frecuencia: 19,
      golpeRecibido: 0.5,
      corte: 0.22,
      hitstop: 0.35,
      fase: 0.75,
      muerteJefe: 0.9,
      carga: 0.25,
    },
    flashes: { activo: true, maxPorSegundo: 3, desdeTension: 0.7 }, // skill game-feel: ≤ 3 por segundo
  },
  vfx: {
    chispas: {
      pool: 192,
      porSegundo: 180,
      vida: 0.32,
      velocidad: 7,
      gravedad: 14,
    }, // cantidad ∝ tensión (D-080)
    polvo: { pool: 128, vida: 0.7 },
    brasas: { cantidad: 150, radio: 22, altura: 7, subida: 0.35 },
  },

  // ─── Paleta (D-082 aprobado en D-142; D-083 y D-087 siguen en PROPUESTA) ───
  // Tokens con nombre: el código nunca usa hex sueltos. Ver docs/atados/diseno/propuesta-colores.md.
  paleta: {
    estado: {
      jugadores: "APROBADO D-142",
      zonas: "APROBADO D-188",
      gameplay: "APROBADO D-188",
    },
    // D-083: cada zona tiene dos fotogramas (base → clímax). La mezcla k sale de fase/intensidad
    // en arenas y del progreso en pasillos (la hora avanza hacia la noche, D-086).
    mezcla: { porFase: 0.35, porIntensidad: 0.3 },
    zonas: {
      pasillo: {
        tipo: "pasillo",
        base: {
          cieloAlto: 0x7fb2e0,
          cieloHorizonte: 0xffd6a0,
          niebla: 0xf3dcc0,
          nieblaCerca: 36, // m: más lejos que en las arenas: el valle se ve abajo (D-204)
          nieblaLejos: 115,
          sol: 0xffd49a,
          solIntensidad: 3.9,
          solElevacion: 30,
          solAzimut: -35,
          hemiCielo: 0xd4e2f0,
          hemiSuelo: 0x8a7a62,
          hemiIntensidad: 2.0,
          suelo: 0xa29d86,
          sueloAlt: 0x928e78,
          piedra: 0xd8c9ae,
          vegetacion: 0xa8a882,
          jefe: 0x8a857c,
          particula: 0xfff0c8,
          corrupcion: 0.8,
        },
        climax: {
          cieloAlto: 0x4a5a8e,
          cieloHorizonte: 0xff9e70,
          niebla: 0xc9a59a,
          nieblaCerca: 28,
          nieblaLejos: 90,
          sol: 0xffa060,
          solIntensidad: 3.0,
          solElevacion: 12,
          solAzimut: -55,
          hemiCielo: 0x9aa4cc,
          hemiSuelo: 0x5a4a42,
          hemiIntensidad: 1.5,
          suelo: 0x8a8272,
          sueloAlt: 0x7a7466,
          piedra: 0xc0a892,
          vegetacion: 0x8e8a6c,
          jefe: 0x6e6862,
          particula: 0xffc890,
          corrupcion: 1.3,
        },
      },
      trigal: {
        tipo: "arena",
        base: {
          cieloAlto: 0x8fb4d8,
          cieloHorizonte: 0xffd9a4,
          niebla: 0xeadcc2,
          nieblaCerca: 34,
          nieblaLejos: 96,
          sol: 0xffd49a,
          solIntensidad: 3.5,
          solElevacion: 28,
          solAzimut: -30,
          hemiCielo: 0xdfe2e4,
          hemiSuelo: 0x7a6a4c,
          hemiIntensidad: 1.7,
          // Suelo más gris que el trigo: los personajes, la cadena y los avisos se separan del fondo.
          suelo: 0xa09a84,
          sueloAlt: 0x948d76,
          madera: 0x7d5a3a,
          vegetacion: 0xdcb862,
          jefe: 0x5e4a36,
          particula: 0xffe6a0,
          corrupcion: 0.9,
        },
        climax: {
          cieloAlto: 0x7a6a70,
          cieloHorizonte: 0xd88a58,
          niebla: 0xb88a68,
          nieblaCerca: 18,
          nieblaLejos: 62,
          sol: 0xff9a50,
          solIntensidad: 2.9,
          solElevacion: 10,
          solAzimut: -45,
          hemiCielo: 0xb8a088,
          hemiSuelo: 0x5a4028,
          hemiIntensidad: 1.4,
          suelo: 0x92806a,
          sueloAlt: 0x84725e,
          madera: 0x5e4430,
          vegetacion: 0xa89468,
          jefe: 0x4a3828,
          particula: 0xd8b088,
          corrupcion: 1.6,
        },
      },
      muelle: {
        tipo: "arena",
        base: {
          cieloAlto: 0x5a78b0,
          cieloHorizonte: 0xffb088,
          niebla: 0xc8b4b4,
          nieblaCerca: 26,
          nieblaLejos: 82,
          sol: 0xffb07a,
          solIntensidad: 3.3,
          solElevacion: 15,
          solAzimut: -50,
          hemiCielo: 0xa8bcd8,
          hemiSuelo: 0x3a4a52,
          hemiIntensidad: 1.8,
          suelo: 0x8e6c50,
          sueloAlt: 0x7a5c44,
          agua: 0x2a6878,
          piedra: 0x6e7680,
          vegetacion: 0x4a6a50,
          jefe: 0x18242e,
          particula: 0xdff0ff,
          corrupcion: 1.0,
        },
        climax: {
          cieloAlto: 0x1e2840,
          cieloHorizonte: 0x5a5470,
          niebla: 0x48506a,
          nieblaCerca: 16,
          nieblaLejos: 58,
          sol: 0xa8b8e0,
          solIntensidad: 2.6,
          solElevacion: 32,
          solAzimut: -20,
          hemiCielo: 0x7a88a8,
          hemiSuelo: 0x2a343c,
          hemiIntensidad: 1.8,
          suelo: 0x6a5242,
          sueloAlt: 0x5a4638,
          agua: 0x12303c,
          piedra: 0x4e5660,
          vegetacion: 0x2e4a3a,
          jefe: 0x0c141a,
          particula: 0xb8d0e8,
          corrupcion: 1.6,
        },
      },
      tavor: {
        tipo: "arena",
        base: {
          cieloAlto: 0x0c1230,
          cieloHorizonte: 0x2e2a5a,
          niebla: 0x1c1c3a,
          nieblaCerca: 24,
          nieblaLejos: 78,
          sol: 0x9fb0ff,
          solIntensidad: 0.9,
          solElevacion: 55,
          solAzimut: 20,
          hemiCielo: 0x3a4278,
          hemiSuelo: 0x1e1614,
          hemiIntensidad: 1.2,
          suelo: 0x5a5664,
          sueloAlt: 0x4c4856,
          piedra: 0x7a7486,
          vegetacion: 0x3a3a4a,
          jefe: 0x3a3440,
          particula: 0xffc070,
          corrupcion: 1.0,
          brasaLuz: 0xffc070,
          brasaIntensidad: 140,
        },
        climax: {
          cieloAlto: 0x140a20,
          cieloHorizonte: 0x4a2440,
          niebla: 0x2a1a30,
          nieblaCerca: 18,
          nieblaLejos: 62,
          sol: 0x8a90d0,
          solIntensidad: 0.6,
          solElevacion: 55,
          solAzimut: 20,
          hemiCielo: 0x3a2a58,
          hemiSuelo: 0x1a1010,
          hemiIntensidad: 1.0,
          suelo: 0x4e4854,
          sueloAlt: 0x423c48,
          piedra: 0x6a6070,
          vegetacion: 0x2e2a36,
          jefe: 0x2e2632,
          particula: 0xff9a50,
          corrupcion: 1.7,
          brasaLuz: 0xff9440,
          brasaIntensidad: 180,
        },
      },
    },
    // D-084: la Brasa pura y su versión corrupta (esquirlas y vetas). Tono de la Brasa (ámbar → oro
    // blanco incandescente), lejos del carmesí: el rojo significa solo peligro.
    corrupcion: {
      brasaPura: 0xfff1cc,
      veta: 0xffb648,
      esquirla: 0xffd88a,
      costra: 0x2a1a10,
    },
    // D-087 (v2, D-143): código de gameplay FIJO en todas las zonas. Marcas planas, sin bordes,
    // sin brillo (no llegan al umbral del bloom); se leen por relleno y opacidad.
    gameplay: {
      peligro: 0xd9475f,
      peligroOpacidad: 0.72,
      aviso: 0xe8a6bb,
      avisoOpacidad: 0.5,
      avisoRellenoOpacidad: 0.62,
      segura: 0x6ccf96,
      seguraOpacidad: 0.55,
      electrica: 0x8f86d9,
      congelada: 0xa9d6e6,
    },
    // D-049, D-065: metal divino y runas que suben de brasa apagada a oro blanco con la tensión.
    cadena: {
      bronce: 0x8c5a2b,
      oro: 0xc79a45,
      runaFloja: 0x7a4418,
      runaMedia: 0xffa83a,
      runaTensa: 0xfff0c4,
      brilloMin: 0.25,
      brilloMax: 3.2,
    },
    // D-082 aprobado (D-142): anillo + acento de cada jugador, fijo todo el juego.
    jugadores: {
      sael: 0xf0e45a,
      odo: 0x4fb0ff,
      anilloOpacidad: 0.9,
      ropaSael: 0x6a5a70,
      ropaOdo: 0x6e5946,
      piel: 0xc89878,
    },
  },
};
