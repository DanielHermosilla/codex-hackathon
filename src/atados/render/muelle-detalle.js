import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Un banco de juncos con hojas curvas. Su altura nominal es 1 m. */
export function geometriaJuncos() {
  /** @type {number[]} */ const posiciones = [];
  /** @type {number[]} */ const colores = [];
  const color = new THREE.Color();
  const puntas = new THREE.Color(0xada96a);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, // rad: separa cada hoja de la anterior alrededor de la raíz
      dx = Math.cos(a),
      dz = Math.sin(a);
    const altura = 0.52 + 0.05 * (i % 8);
    const curva = 0.11 + 0.045 * (i % 4);
    for (const [t, ancho] of [
      [0, -0.018],
      [0, 0.018],
      [0.55, 0.036],
      [0, -0.018],
      [0.55, 0.036],
      [0.55, -0.036],
      [0.55, -0.036],
      [0.55, 0.036],
      [1, 0],
    ]) {
      const raiz = 0.065 + curva * t * t;
      posiciones.push(
        dx * raiz - dz * ancho,
        t * altura,
        dz * raiz + dx * ancho,
      );
      color.setHex(0x4b6237).lerp(puntas, t * 0.9);
      colores.push(color.r, color.g, color.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
  g.computeVertexNormals();
  return g;
}

/** Arcos finos de espuma junto a los bancos, por encima de la cresta del agua.
 * @param {{ x: number, z: number, giro: number }[]} bancos */
export function geometriaEspuma(bancos) {
  /** @type {number[]} */ const puntos = [];
  for (const { x, z, giro } of bancos) {
    for (let arco = 0; arco < 3; arco++) {
      const radio = 0.82 + 0.26 * arco;
      for (let i = 0; i < 6; i++) {
        const a = giro + arco * 1.87 + i * 0.16;
        const b = a + 0.16;
        // Dos triángulos por tramo. La elipse deja relieves sin cruzar el tablón.
        for (const [r, t] of [
          [radio, a],
          [radio, b],
          [radio + 0.055, b],
          [radio, a],
          [radio + 0.055, b],
          [radio + 0.055, a],
        ]) {
          puntos.push(x + r * Math.cos(t), -1.56, z + r * Math.sin(t) * 1.16);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(puntos, 3));
  return g;
}

/** Funde las cuerdas que cuelgan desde los amarres hasta cada boya.
 * @param {{ poste: THREE.Vector3, boya: THREE.Vector3 }[]} amarres */
export function geometriaAmarras(amarres) {
  const cuerdas = amarres.map(({ poste, boya }) => {
    const comba = poste.clone().lerp(boya, 0.6);
    comba.y = boya.y - 0.08;
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([poste, comba, boya]),
      10,
      0.028,
      5,
      false,
    );
  });
  const lote = mergeGeometries(cuerdas);
  cuerdas.forEach((g) => g.dispose());
  return lote;
}

/** Placa inclinada para que el letrero se lea desde la cámara alta. @param {import('./tipos.js').Keep} keep */
export function crearLetreroMuelle(keep) {
  const grupo = new THREE.Group();
  const madera = keep(
    new THREE.MeshStandardMaterial({ color: 0x50392b, roughness: 0.94 }),
  );
  const forma = keep(new THREE.BoxGeometry(1, 1, 1));
  for (const lado of [-1, 1]) {
    const soporte = new THREE.Mesh(forma, madera);
    soporte.position.set(lado * 0.83, 0.48, 0);
    soporte.scale.set(0.12, 0.96, 0.12);
    grupo.add(soporte);
  }
  const placa = new THREE.Mesh(forma, madera);
  placa.position.y = 0.96;
  placa.rotation.x = -0.91;
  placa.scale.set(2.12, 0.82, 0.12);
  grupo.add(placa);

  // El soporte sigue siendo geometría en las pruebas de Node, que no tienen lienzo del navegador.
  if (typeof document === "undefined") return grupo;
  const tabla = document.createElement("canvas");
  tabla.width = 512;
  tabla.height = 196;
  const ctx = tabla.getContext("2d");
  if (!ctx) return grupo;
  ctx.fillStyle = "#513828";
  ctx.fillRect(0, 0, tabla.width, tabla.height);
  ctx.strokeStyle = "#8f6345";
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = 7 + i * 14;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(180, y + Math.sin(i) * 17, 310, y - 9, 512, y + 4);
    ctx.stroke();
  }
  ctx.strokeStyle = "#d3a46b";
  ctx.lineWidth = 6;
  ctx.strokeRect(13, 13, 486, 170);
  ctx.fillStyle = "#f4dea9";
  ctx.font = "bold 72px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MUELLE", 256, 104);
  // Remaches de bronce a ambos lados de la inscripción.
  for (const x of [38, 474]) {
    ctx.beginPath();
    ctx.arc(x, 98, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const imagen = keep(new THREE.CanvasTexture(tabla));
  imagen.colorSpace = THREE.SRGBColorSpace;
  imagen.anisotropy = 4;
  const frente = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(2.08, 0.8)),
    keep(new THREE.MeshStandardMaterial({ map: imagen, roughness: 0.89 })),
  );
  // Separación de 61 mm en la normal local de la caja para dibujar sobre la madera.
  frente.position.set(0, 0.96 + Math.sin(0.91) * 0.061, Math.cos(0.91) * 0.061);
  frente.rotation.x = placa.rotation.x;
  grupo.add(frente);
  return grupo;
}
