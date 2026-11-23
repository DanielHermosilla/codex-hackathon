// Adapta una marca horizontal a la escalera (D-210). X/Z quedan fijos en la geometría y cada jugador
// guarda su propio búfer de alturas. En la arena plana los vértices originales no cambian.
/**
 * @param {import('three').BufferGeometry} geo  marca ya orientada en X/Z
 * @param {(x: number, z: number) => number} alturaSuelo  metros sobre el plano de la física
 */
export function crearApoyoMarca(geo, alturaSuelo) {
  const pos = geo.getAttribute("position");
  const alturas = new Float32Array(pos.count); // reutilizado al mover la marca de un jugador
  const indices = geo.getIndex();
  let ultimoX = NaN,
    ultimoZ = NaN;
  /** @param {number} x @param {number} z @param {number} base  altura de la raíz en metros */
  return (x, z, base) => {
    if (x === ultimoX && z === ultimoZ) return; // jugador quieto: se conserva la forma anterior
    ultimoX = x;
    ultimoZ = z;
    for (let i = 0; i < pos.count; i++) {
      // La raíz ya subió hasta su suelo. Solo le sumamos el desnivel bajo este punto de la marca.
      alturas[i] = alturaSuelo(x + pos.getX(i), z + pos.getZ(i)) - base;
      pos.setY(i, alturas[i]);
    }
    if (indices) {
      // Una cara que cruza una contrahuella quedaría medio enterrada si se interpola desde abajo.
      // Elevar sus tres esquinas hasta el mayor apoyo crea un puente corto en ese borde.
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i),
          b = indices.getX(i + 1),
          c = indices.getX(i + 2);
        const apoyo = Math.max(alturas[a], alturas[b], alturas[c]);
        pos.setY(a, Math.max(pos.getY(a), apoyo));
        pos.setY(b, Math.max(pos.getY(b), apoyo));
        pos.setY(c, Math.max(pos.getY(c), apoyo));
      }
    }
    pos.needsUpdate = true;
  };
}
