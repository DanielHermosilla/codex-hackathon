// Tipos compartidos del gameplay. Solo JSDoc para `tsc --project jsconfig.json`: no se importa en
// tiempo de ejecución (los demás módulos lo referencian con `import('./tipos.js').X`).
export {};

/** @typedef {typeof import('../core/config.js').CONFIG} Cfg */
/** @typedef {{ x: number, z: number }} Punto */
/** @typedef {ReturnType<typeof import('../core/rng.js').crearRng>} Rng */

/** Pilar sólido de la arena (`id` solo existe en los combates). */
/** @typedef {{ id?: string | number, x: number, z: number, r: number }} Pilar */

/** Cuerpo circular que la cadena puede atravesar (jefe o muñeco). */
/** @typedef {{ x: number, z: number, r: number, vx?: number, vz?: number }} Cuerpo */

// ─── Cadena ───
/** @typedef {{ a: number, b: number, pillar: number, straightness: number, tension: number }} Tramo */
/**
 * @typedef {object} Cadena
 * @property {number} n  eslabones (partículas = n + 1)
 * @property {number} length  largo nominal
 * @property {number} seg  largo de un eslabón
 * @property {Float64Array} x
 * @property {Float64Array} z
 * @property {Float64Array} px
 * @property {Float64Array} pz
 * @property {Int16Array} contact  índice de pilar en contacto o -1
 * @property {Int16Array} segKind  -1 tramo libre, k = enrollado en el pilar k
 * @property {Float64Array} segRaw  tensión instantánea por eslabón
 * @property {Float64Array} segT  tensión suavizada por eslabón
 * @property {Tramo[]} tramos
 * @property {number} tramoCount
 * @property {number} pathLength
 * @property {number} tension
 * @property {number} tensionMax
 */

// ─── Jugadores y mundo ───
/**
 * @typedef {object} Jugador
 * @property {string} id
 * @property {number} x
 * @property {number} z
 * @property {number} px
 * @property {number} pz
 * @property {number} sx  posición antes del empuje
 * @property {number} sz
 * @property {number} vx
 * @property {number} vz
 * @property {number} ivx  velocidad propia del paso
 * @property {number} ivz
 * @property {number} face
 * @property {number} hp
 * @property {boolean} alive
 * @property {boolean} anchored
 * @property {number} dashT
 * @property {number} dashCd
 * @property {number} dashX
 * @property {number} dashZ
 * @property {boolean} dashHeld
 * @property {number} hurtT
 */

/** Entrada de un jugador en un paso. */
/** @typedef {{ mx?: number, mz?: number, dash?: boolean, anchor?: boolean, dashDir?: Punto | null }} Entrada */

/** Muñeco / cuerpo del jefe para la cadena (`hit` = número de daño agrupado, D-166). */
/**
 * @typedef {object} Muneco
 * @property {number} x
 * @property {number} z
 * @property {number} r
 * @property {number} vx
 * @property {number} vz
 * @property {number} total
 * @property {number} dps
 * @property {number} lastStep
 * @property {number[]} byPlayer
 * @property {{ active: boolean, value: number, idle: number, shown: number, maxT: number }} hit
 * @property {boolean} invulnerable
 */

/**
 * @typedef {object} Mundo
 * @property {Cfg} cfg
 * @property {boolean} solo
 * @property {number} time
 * @property {Jugador[]} players
 * @property {Cadena} chain
 * @property {Pilar[]} pillars
 * @property {number} arenaRadius
 * @property {Muneco} dummy
 * @property {Punto[]} ext  velocidad externa por jugador (tirón, empuje)
 * @property {boolean[]} drag
 * @property {number} hitstop
 * @property {number} solverReverts
 * @property {{ x: number, z: number, maxT: number, touching: boolean }} _contact
 * @property {Entrada[]} _solo
 * @property {Punto} _dir
 */

// ─── Pools, zonas y proyectiles ───
/** Campos que añade `crearPool` a cada objeto. */
/** @typedef {{ indice: number, activo: boolean, dueno: object | null }} ItemPool */
/**
 * @template T
 * @typedef {{ items: Array<T & ItemPool>, usados: number, fallos: number }} Pool
 */

/** @typedef {{ forma: string, etapa: string, x: number, z: number, r: number, ang: number, apertura: number, largo: number, ancho: number, frente: number, atras: number, progreso: number, sentido: number, ataque: string }} Zona */
/** @typedef {{ x0: number, z0: number, x1: number, z1: number, t: number, altura: number, ataque: string }} Proyectil */

// ─── Jefe, acciones y bloques ───
/** Definición de un jefe (datos de `CONFIG.jefes.<id>`, indexada por string). */
/** @typedef {Record<string, any>} DefJefe */

/**
 * Acción en curso del jefe (ataque o no-ataque). Los ataques añaden campos propios del bloque.
 * @typedef {{
 *   tipo: string, id: string, etapa: string, t: number, T: number, objetivo: number, bloques: Bloque[],
 *   def?: any, recuperacion?: number, tropezo?: boolean, [k: string]: any,
 * }} Accion
 */

/**
 * Instancia de un bloque dentro de un ataque. Cada tipo de bloque guarda su estado propio en campos
 * extra (`dir`, `sub`, `largo`…), por eso lleva índice abierto.
 * @typedef {{
 *   tipo: string, def: any, accion: Accion, golpeados: boolean[], zonas: Array<Zona & ItemPool>,
 *   hecho: boolean, limpio: boolean, telegrafia: number, inicioAviso: number, [k: string]: any,
 * }} Bloque
 */

/**
 * @typedef {object} DefBloque
 * @property {(d: any, a: any, ctx: Ctx) => number} telegrafia  duración del aviso propio
 * @property {(b: Bloque, ctx: Ctx) => void} preparar
 * @property {(b: Bloque, ctx: Ctx, t: number) => void} telegrafia_
 * @property {(b: Bloque, ctx: Ctx) => void} activar
 * @property {(b: Bloque, ctx: Ctx, dt: number) => boolean} activo  devuelve true al terminar
 * @property {(b: Bloque, ctx: Ctx) => void} limpiar
 * @property {(b: Bloque, dano: number, tension: number) => void} [alRecibirDano]
 * @property {(b: Bloque, ctx: Ctx) => void} [quitarAporte]
 */

/**
 * @typedef {object} Jefe
 * @property {DefJefe} def
 * @property {number} hp
 * @property {number} hpMax
 * @property {number} fase
 * @property {number} x
 * @property {number} z
 * @property {number} vx
 * @property {number} vz
 * @property {number} face
 * @property {number} r
 * @property {boolean} vivo
 * @property {Accion | null} accion
 * @property {Array<{ tipo: string }>} cola
 * @property {number} pausa
 * @property {Record<string, number>} cooldowns
 * @property {boolean} invulnerable
 * @property {number} objetivo
 * @property {Float64Array} ventana
 * @property {number} vi
 * @property {number} vsum
 * @property {number[]} reciente
 * @property {string} ultimoAtaque
 * @property {boolean} sinAtaques
 * @property {number} ataques
 */

/** @typedef {{ tipo: string, t: number, [k: string]: any }} Evento */

/**
 * Contexto que reciben jefe.js y los bloques (lo arma combate.js).
 * @typedef {object} Ctx
 * @property {Cfg} cfg
 * @property {Mundo} w
 * @property {Jefe} jefe
 * @property {number} L  largo de la cadena (unidad de las distancias «L»)
 * @property {string} dificultad
 * @property {Rng} rng
 * @property {Pool<Zona>} zonas
 * @property {Pool<Proyectil>} proyectiles
 * @property {Punto[]} tiron
 * @property {(t: number | Record<string, number>) => number} tele
 * @property {(acc: { objetivo: number } | null, out: Punto) => Punto} posObjetivo
 * @property {(b: {accion: {id: string}}, i: number, dano: number, empuje: number, fx: number, fz: number, tick?: boolean) => boolean} golpear
 * @property {(tipo: string, datos?: Record<string, any>) => Evento} emitir
 * @property {string[]} _cand
 */

// ─── Combate ───
/** @typedef {{ jefe?: string, solo?: boolean, dificil?: boolean, seed?: number, primeraVez?: boolean, reintentos?: number }} OpcionesCombate */
/** @typedef {{ tiempo: number, dano: number[], golpes: number[], danoRecibido: number[], arrastres: number[], sinDano: boolean }} StatsCombate */
/** @typedef {{ jugador: number, x: number, z: number, placeholder: boolean, extra?: boolean }} Drop */

/**
 * @typedef {object} Combate
 * @property {Cfg} cfg
 * @property {Required<OpcionesCombate>} opts
 * @property {string} id
 * @property {Mundo} w
 * @property {Jefe} jefe
 * @property {string} estado  presentacion | pelea | derrota | victoria
 * @property {string | null} resultado
 * @property {number} t
 * @property {ReturnType<typeof import('./arena-mirra.js').crearArenaMirra>} arenaMirra
 * @property {ReturnType<typeof import('./ritos.js').crearRitos>} ritos
 * @property {number} turnoArena
 * @property {number} proximoRito
 * @property {(i:number, dano:number)=>boolean} golpeRito
 * @property {string} avisoRito
 * @property {number} finAviso
 * @property {number} tPelea
 * @property {{ t: number, T: number, saltable: boolean }} presentacion
 * @property {number} derrotaT
 * @property {boolean} pedirReintento
 * @property {Evento[]} eventos
 * @property {{ clave: string, t: number } | null} frase
 * @property {StatsCombate} stats
 * @property {{ x: number, z: number, stats: StatsCombate } | null} lapida
 * @property {Drop[]} drops
 * @property {Pool<Zona>} zonas
 * @property {Pool<Proyectil>} proyectiles
 * @property {Punto[]} _kb
 * @property {boolean[]} _vivos
 * @property {number[]} _prevBy
 * @property {number[]} _por
 * @property {boolean[]} _arr
 * @property {number[]} _arrGap
 * @property {boolean[]} _dashPrev
 * @property {Punto} _pos
 * @property {Ctx} ctx
 */
