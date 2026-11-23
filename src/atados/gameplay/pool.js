// Pool pre-asignado (regla 6): los objetos se crean una vez y se reciclan. Puro, sin three.js.
// Cada objeto lleva `activo` y `dueno` (la instancia de bloque que lo pidió) para poder limpiar
// todo lo de un bloque al cancelarlo (regla 3).

/**
 * @template T
 * @param {number} n
 * @param {() => T} fabricar
 * @returns {import('./tipos.js').Pool<T>}
 */
export function crearPool(n, fabricar) {
  /** @type {Array<T & import('./tipos.js').ItemPool>} */
  const items = [];
  for (let i = 0; i < n; i++)
    items.push({ ...fabricar(), indice: i, activo: false, dueno: null });
  return { items, usados: 0, fallos: 0 };
}

// Devuelve un objeto libre o null si el pool está lleno (quien lo pide debe tolerar el null).
/**
 * @template T
 * @param {import('./tipos.js').Pool<T>} pool
 * @param {object} dueno
 * @returns {(T & import('./tipos.js').ItemPool) | null}
 */
export function adquirir(pool, dueno) {
  for (const it of pool.items) {
    if (it.activo) continue;
    it.activo = true;
    it.dueno = dueno;
    pool.usados++;
    return it;
  }
  pool.fallos++;
  return null;
}

/**
 * @template T
 * @param {import('./tipos.js').Pool<T>} pool
 * @param {(T & import('./tipos.js').ItemPool) | null | undefined} it
 */
export function liberar(pool, it) {
  if (!it || !it.activo) return;
  it.activo = false;
  it.dueno = null;
  pool.usados--;
}

// Libera todo lo que pertenece a `dueno`. Devuelve cuántos liberó.
/**
 * @template T
 * @param {import('./tipos.js').Pool<T>} pool
 * @param {object} dueno
 * @returns {number}
 */
export function liberarDe(pool, dueno) {
  let n = 0;
  for (const it of pool.items)
    if (it.activo && it.dueno === dueno) {
      liberar(pool, it);
      n++;
    }
  return n;
}

/**
 * @template T
 * @param {import('./tipos.js').Pool<T>} pool
 */
export function liberarTodo(pool) {
  for (const it of pool.items) liberar(pool, it);
}
