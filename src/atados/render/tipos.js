// Tipos compartidos del render (solo JSDoc, sin código en tiempo de ejecución).

/**
 * Configuración de balance y arte (src/atados/core/config.js).
 * @typedef {typeof import('../core/config.js').CONFIG} Cfg
 */

/**
 * Estado del mundo (jugadores, cadena, jefe de práctica…): el render solo lo lee.
 * @typedef {any} Mundo
 */

/**
 * Estado del combate (jefe, zonas, proyectiles, fase…): el render solo lo lee.
 * @typedef {any} Combate
 */

/**
 * Registra un recurso para liberarlo con `dispose()` al cerrar el render y lo devuelve.
 * @typedef {<T>(o: T) => T} Keep
 */

/**
 * Modelos GLB cargados por nombre (ver modelos.js).
 * @typedef {Record<string, any>} Modelos
 */

/**
 * Crea un material plano de marca en el suelo (color, opacidad).
 * @typedef {(color: number, opacity: number) => import('three').MeshBasicMaterial} DecalMat
 */

/**
 * Paleta resuelta de una zona (ver paleta.js).
 * @typedef {Record<string, any>} Paleta
 */

/**
 * Efectos de render que el jefe pide en su animación (polvo, astillas, paja, sacudida de cámara).
 * @typedef {object} FxJefe
 * @property {(x: number, z: number, n: number, f: number) => void} polvo
 * @property {(x: number, y: number, z: number, n: number, f: number) => void} trozos
 * @property {(x: number, y: number, z: number, n: number) => void} paja
 * @property {(v: number) => void} sacudir
 */

export {};
