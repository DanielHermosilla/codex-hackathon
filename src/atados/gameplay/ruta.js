// Ruta del recorrido: una polilínea con ancho que el jugador sigue (D-004: lineal, pero parece abierta).
// Pura: sin three.js ni DOM. La usan gameplay (límite del mundo, marcas del tutorial, enemigos) y render
// (dónde poner columnas, escalones y murales). Unidades: metros.
// s = metros recorridos a lo largo del eje desde el primer punto; d = desvío lateral (+ = a la derecha
// según se avanza).

/**
 * Ruta preparada para consultas rápidas.
 * @typedef {object} Ruta
 * @property {number} n  cantidad de puntos del eje
 * @property {Float64Array} px  x de cada punto (m)
 * @property {Float64Array} pz  z de cada punto (m)
 * @property {Float64Array} acum  s acumulado en cada punto (m)
 * @property {number} total  largo total del eje (m)
 * @property {number} ancho  ancho transitable (m)
 */

/**
 * Resultado de proyectar un punto sobre la ruta.
 * @typedef {{ s: number, d: number, x: number, z: number, dist: number, seg: number }} Proyeccion
 */

/** @typedef {{ x: number, z: number, ang: number }} PuntoRuta  ang = dirección de avance en XZ (rad) */

/**
 * Crea la ruta a partir de sus puntos [x, z] y su ancho.
 * @param {ReadonlyArray<ReadonlyArray<number>>} puntos
 * @param {number} ancho  m transitables
 * @returns {Ruta}
 */
export function crearRuta(puntos, ancho) {
  const n = puntos.length;
  if (n < 2) throw new Error("La ruta necesita al menos 2 puntos.");
  const px = new Float64Array(n); // arreglos tipados: sin objetos por punto
  const pz = new Float64Array(n);
  const acum = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    px[i] = puntos[i][0];
    pz[i] = puntos[i][1];
  }
  for (let i = 1; i < n; i++) {
    const largo = Math.hypot(px[i] - px[i - 1], pz[i] - pz[i - 1]);
    if (largo <= 0) throw new Error("La ruta tiene dos puntos repetidos.");
    acum[i] = acum[i - 1] + largo; // s al llegar a este punto
  }
  return { n, px, pz, acum, total: acum[n - 1], ancho };
}

/** @returns {Proyeccion} objeto reutilizable para `proyectarRuta` (evita crear uno por cuadro) */
export const nuevaProyeccion = () => ({
  s: 0,
  d: 0,
  x: 0,
  z: 0,
  dist: 0,
  seg: 0,
});

/**
 * Punto del eje más cercano a (x, z). Escribe en `out` y lo devuelve.
 * @param {Ruta} ruta
 * @param {number} x
 * @param {number} z
 * @param {Proyeccion} out
 * @returns {Proyeccion}
 */
export function proyectarRuta(ruta, x, z, out) {
  const { n, px, pz, acum } = ruta;
  let mejor = Infinity;
  for (let i = 0; i < n - 1; i++) {
    const ax = px[i];
    const az = pz[i];
    const largo = acum[i + 1] - acum[i];
    const ux = (px[i + 1] - ax) / largo; // dirección unitaria del tramo
    const uz = (pz[i + 1] - az) / largo;
    const dx = x - ax;
    const dz = z - az;
    const a = Math.min(largo, Math.max(0, dx * ux + dz * uz)); // avance sobre el tramo, recortado a sus extremos
    const cx = ax + ux * a;
    const cz = az + uz * a;
    const dist = Math.hypot(x - cx, z - cz);
    if (dist < mejor - 1e-12) {
      mejor = dist;
      out.s = acum[i] + a;
      out.x = cx;
      out.z = cz;
      out.dist = dist;
      out.seg = i;
      out.d = (x - cx) * -uz + (z - cz) * ux; // signo según la normal derecha (−uz, ux)
    }
  }
  return out;
}

/**
 * Punto a `s` metros del inicio con desvío lateral `d`. Escribe en `out` y lo devuelve.
 * @param {Ruta} ruta
 * @param {number} s
 * @param {number} [d]
 * @param {PuntoRuta} [out]
 * @returns {PuntoRuta}
 */
export function puntoRuta(ruta, s, d = 0, out = { x: 0, z: 0, ang: 0 }) {
  const { n, px, pz, acum } = ruta;
  const ss = Math.min(ruta.total, Math.max(0, s)); // fuera de la ruta se queda en sus extremos
  let i = 0;
  while (i < n - 2 && acum[i + 1] < ss) i++; // tramo que contiene a ss
  const largo = acum[i + 1] - acum[i];
  const ux = (px[i + 1] - px[i]) / largo;
  const uz = (pz[i + 1] - pz[i]) / largo;
  const a = ss - acum[i];
  out.x = px[i] + ux * a - uz * d; // −uz, ux = normal derecha
  out.z = pz[i] + uz * a + ux * d;
  out.ang = Math.atan2(uz, ux);
  return out;
}

/**
 * Límite transitable para `createWorld({ limite })`: la unión de un círculo (el lobby) y el pasillo de la
 * ruta (a ≤ ancho/2 del eje). Si el punto queda fuera de los dos, lo mete en el que esté más cerca.
 * @param {Ruta} ruta
 * @param {{ x: number, z: number, radio: number } | null} [circulo]  claro transitable extra (lobby)
 * @returns {import('./tipos.js').Limite}
 */
export function crearLimiteRuta(ruta, circulo = null) {
  const tmp = nuevaProyeccion(); // se reutiliza en cada llamada: sin basura en el paso fijo
  return (pos, margen) => {
    proyectarRuta(ruta, pos.x, pos.z, tmp);
    const limPasillo = ruta.ancho / 2 - margen; // distancia máxima al eje
    if (tmp.dist <= limPasillo + 1e-9) return false; // dentro del pasillo
    if (circulo) {
      const dx = pos.x - circulo.x;
      const dz = pos.z - circulo.z;
      const dc = Math.hypot(dx, dz);
      const limCirculo = circulo.radio - margen;
      if (dc <= limCirculo + 1e-9) return false; // dentro del claro
      // Fuera de los dos: se corrige hacia el borde que pide moverse menos.
      if (dc - limCirculo < tmp.dist - limPasillo) {
        const k = limCirculo / dc;
        pos.x = circulo.x + dx * k;
        pos.z = circulo.z + dz * k;
        return true;
      }
    }
    const k = limPasillo / tmp.dist; // acerca el punto al eje hasta el borde del pasillo
    pos.x = tmp.x + (pos.x - tmp.x) * k;
    pos.z = tmp.z + (pos.z - tmp.z) * k;
    return true;
  };
}
