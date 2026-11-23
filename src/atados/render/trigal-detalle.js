import * as THREE from "three";

/** Ruido reproducible entre 0 y 1, también para índices negativos. @param {number} x @param {number} z */
export const hashTrigal = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Muestra una retícula periódica de ruido. `lado` es una potencia de dos. @param {number} lado @param {number} semilla */
function reticula(lado, semilla) {
  const valores = Float32Array.from({ length: lado * lado }, (_, i) =>
    hashTrigal(i, semilla),
  );
  const mascara = lado - 1;
  /** @param {number} u @param {number} v coordenadas dentro de un mosaico */
  return (u, v) => {
    const px = u * lado,
      py = v * lado;
    const x = Math.floor(px),
      y = Math.floor(py);
    const tx = px - x,
      ty = py - y;
    const a = tx * tx * (3 - 2 * tx),
      b = ty * ty * (3 - 2 * ty);
    const x0 = x & mascara,
      x1 = (x + 1) & mascara;
    const y0 = (y & mascara) * lado,
      y1 = ((y + 1) & mascara) * lado;
    return (
      THREE.MathUtils.lerp(valores[y0 + x0], valores[y0 + x1], a) * (1 - b) +
      THREE.MathUtils.lerp(valores[y1 + x0], valores[y1 + x1], a) * b
    );
  };
}

/** Genera un mosaico en luz lineal, reutilizable en color y altura. @param {'suelo' | 'piedra'} superficie */
export function texturaTrigal(superficie) {
  const lado = 256;
  const datos = new Uint8Array(lado * lado * 4);
  const grano = reticula(128, 104);
  const poro = reticula(64, 103);
  const veta = reticula(16, 102);
  const mancha = reticula(4, 101);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const u = x / lado,
        v = y / lado;
      const moteado = grano(u, v) * 0.1 + poro(u, v) * 0.1;
      let tono;
      if (superficie === "suelo") {
        // Milímetros de grano y pequeñas hilachas de rastrojo sobre manchas de tierra.
        const paja = Math.max(0, veta(u + v * 2, v) * poro(u, v * 3) - 0.45);
        tono = 0.65 + mancha(u, v) * 0.15 + moteado + paja * 0.35;
      } else {
        // Bandas minerales horizontales, quebradas por poros y nudos de distintas escalas.
        const curva = v * 8 + mancha(u, v) * 0.28 + veta(u, v) * 0.13;
        const estrato = Math.pow(0.5 + Math.cos(curva * Math.PI * 2) * 0.5, 6);
        tono = 0.7 + veta(u, v) * 0.12 + moteado - estrato * 0.16;
      }
      const i = (y * lado + x) * 4;
      const nivel = Math.round(Math.min(1, tono) * 255);
      datos[i] = nivel;
      datos[i + 1] = nivel;
      datos[i + 2] = nivel;
      datos[i + 3] = 255;
    }
  }
  const textura = new THREE.DataTexture(datos, lado, lado);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.magFilter = THREE.LinearFilter;
  textura.minFilter = THREE.LinearMipmapLinearFilter; // Evita el chisporroteo en la vista elevada.
  textura.generateMipmaps = true;
  textura.anisotropy = 4;
  textura.needsUpdate = true;
  return textura;
}

/** UV en metros y manchas de musgo seco orientadas hacia arriba. @param {THREE.BufferGeometry} g @param {number} gris brillo de la pieza */
export function vestirPiedra(g, gris) {
  const { position, normal, uv } = g.attributes;
  const colores = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const nx = Math.abs(normal.getX(i)),
      ny = normal.getY(i),
      nz = Math.abs(normal.getZ(i));
    const plana = Math.abs(ny) > 0.8;
    uv.setXY(i, (plana || nz > nx ? x : z) / 2.8, (plana ? z : y) / 1.9);
    const costra = 0.5 + Math.sin(x * 2.7 + z * 3.3 + y * 8) * 0.5;
    const musgo = Math.max(0, ny) * Math.max(0, costra - 0.2);
    const luz = gris * (0.87 + costra * 0.13);
    colores.set(
      [
        luz * (1 - 0.18 * musgo),
        luz * (1 - 0.1 * musgo),
        luz * (1 - 0.48 * musgo),
      ],
      i * 3,
    );
  }
  g.setAttribute("color", new THREE.BufferAttribute(colores, 3));
}

/**
 * Construye briznas con tiras de tres triángulos. Cada tira comparte sus vértices y se curva en su extremo.
 * Altura nominal de una mata = 1, escalada en metros al sembrarla.
 */
function follaje() {
  /** @type {number[]} */ const posiciones = [];
  /** @type {number[]} */ const indices = [];
  /** @type {number[]} */ const colores = [];
  /**
   * @param {number} a giro alrededor de la raíz, en radianes
   * @param {number} y altura de la raíz
   * @param {number} largo altura de la punta respecto de la raíz
   * @param {number} alcance separación horizontal de la punta respecto de la raíz
   * @param {number} ancho semiancho en el centro de la brizna
   * @param {number} tono brillo de la punta
   * @param {number} [x0] @param {number} [z0] desplazamiento de la raíz
   */
  const hoja = (a, y, largo, alcance, ancho, tono, x0 = 0, z0 = 0) => {
    const ix = posiciones.length / 3;
    const dx = Math.cos(a),
      dz = Math.sin(a);
    for (const [t, w, l] of [
      [0, -0.42, 0.51],
      [0, 0.42, 0.51],
      [0.53, 1, 0.82],
      [0.53, -1, 0.82],
      [1, 0, 1],
    ]) {
      const curva = alcance * t * t;
      posiciones.push(
        x0 + dx * curva - dz * w * ancho,
        y + t * largo,
        z0 + dz * curva + dx * w * ancho,
      );
      colores.push(tono * l, tono * l * 0.96, tono * l * 0.86);
    }
    indices.push(
      ix,
      ix + 1,
      ix + 2,
      ix,
      ix + 2,
      ix + 3,
      ix + 3,
      ix + 2,
      ix + 4,
    );
  };
  /**
   * Cada grano es un rombo con una arista levantada, legible en contraluz.
   * @param {number} x @param {number} y @param {number} z centro del grano
   * @param {number} a orientación @param {number} largo alto @param {number} ancho ancho
   */
  const grano = (x, y, z, a, largo, ancho) => {
    const ix = posiciones.length / 3;
    const dx = Math.cos(a),
      dz = Math.sin(a);
    posiciones.push(
      x,
      y - largo * 0.55,
      z,
      x + dx * ancho,
      y,
      z + dz * ancho,
      x + dx * ancho * 0.8,
      y + largo * 0.55,
      z + dz * ancho * 0.8,
      x - dx * ancho,
      y,
      z - dz * ancho,
      x - dz * ancho * 0.7,
      y + largo * 0.08,
      z + dx * ancho * 0.7,
    );
    colores.push(
      0.84,
      0.68,
      0.48,
      1,
      0.94,
      0.72,
      1,
      0.99,
      0.8,
      0.91,
      0.77,
      0.53,
      1,
      0.9,
      0.65,
    );
    indices.push(
      ix,
      ix + 1,
      ix + 4,
      ix + 1,
      ix + 2,
      ix + 4,
      ix + 2,
      ix + 3,
      ix + 4,
      ix + 3,
      ix,
      ix + 4,
    );
  };
  const geometria = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };
  return { hoja, grano, geometria };
}

export function geometriaRastrojo() {
  const { hoja, geometria } = follaje();
  hoja(0.15, 0, 1, 0.14, 0.056, 1);
  hoja(2.25, 0, 0.81, 0.34, 0.062, 0.88);
  hoja(4.4, 0, 0.69, 0.35, 0.066, 0.96);
  hoja(5.3, 0, 0.49, 0.28, 0.05, 0.78);
  return geometria();
}

export function geometriaEspiga() {
  const { hoja, grano, geometria } = follaje();
  hoja(0, 0, 1.06, 0.06, 0.019, 0.95);
  hoja(Math.PI / 2, 0, 1.06, 0.06, 0.019, 0.95);
  hoja(0.63, 0.16, 0.43, 0.25, 0.067, 0.84);
  // Dos granos cruzados conservan el volumen de la espiga desde la cámara elevada.
  for (let k = 0; k < 2; k++) {
    const a = (k * Math.PI) / 2;
    const y = 0.84 + k * 0.1;
    grano(0.032 + Math.cos(a) * 0.026, y, Math.sin(a) * 0.027, a, 0.26, 0.052);
  }
  return geometria();
}

export function geometriaFloresSecas() {
  const { hoja, grano, geometria } = follaje();
  hoja(0, 0, 0.91, 0.13, 0.016, 0.68);
  hoja(2.3, 0, 0.7, 0.17, 0.018, 0.72);
  hoja(4.2, 0, 0.76, 0.15, 0.017, 0.78);
  grano(0.13, 0.9, 0, 0.2, 0.095, 0.1);
  grano(-0.112, 0.69, 0.127, 2.3, 0.1, 0.086);
  grano(-0.074, 0.75, -0.131, 4.2, 0.08, 0.087);
  return geometria();
}
