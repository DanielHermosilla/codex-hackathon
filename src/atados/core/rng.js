// Azar controlable: el gameplay usa RNG, nunca Math.random (regla 7).
// `?seed=123` fija la semilla de una partida y permite reproducir bugs.
export const RNG = {
  _s: 0,
  _seeded: false,
  /** @param {number} n */
  seed(n) {
    this._s = n >>> 0 || 1;
    this._seeded = true;
  },
  // mulberry32
  next() {
    if (!this._seeded) return Math.random();
    let t = (this._s = (this._s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  /**
   * @param {number} a
   * @param {number} b
   */
  range(a, b) {
    return a + (b - a) * this.next();
  },
};

// Generador propio (mulberry32) para que un combate sea reproducible por sí mismo: cada reintento
// y cada fase arrancan de la misma semilla (skill diseno-jefe, `?seed=N`).
/** @param {number} seed */
export function crearRng(seed) {
  let s = seed >>> 0 || 1;
  const r = {
    get estado() {
      return s;
    },
    next() {
      let t = (s = (s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /**
     * @param {number} a
     * @param {number} b
     */
    range(a, b) {
      return a + (b - a) * r.next();
    },
  };
  return r;
}
