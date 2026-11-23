// Detalles del Templo Celestial: vegetación y cantera instanciadas fuera del piso de combate.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { nuevaProyeccion, proyectarRuta, puntoRuta } from "../gameplay/ruta.js";
import { mezclarHex } from "./paleta.js";

/** Ruido estable para variar cada planta y piedra. @param {number} i @param {number} canal */
function azar(i, canal) {
  const n = Math.sin(i * 127.1 + canal * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Mata formada por hojas dobladas que nacen bajas y ganan luz hacia la punta. */
function geometriaMata() {
  /** @type {number[]} */
  const vertices = [];
  /** @type {number[]} */
  const colores = [];
  for (let i = 0; i < 8; i++) {
    const angulo = i * 2.4; // rad; la espiral reparte las hojas alrededor de la base
    const alto = 0.42 + azar(i, 1) * 0.61; // m antes de escalar la mata
    const largo = 0.18 + azar(i, 2) * 0.44;
    const ancho = 0.045 + azar(i, 3) * 0.045;
    const dx = Math.cos(angulo);
    const dz = Math.sin(angulo);
    const raiz = [dx * 0.05, -0.08, dz * 0.05];
    const izq = [
      dx * largo * 0.37 - dz * ancho,
      alto * 0.62,
      dz * largo * 0.37 + dx * ancho,
    ];
    const der = [
      dx * largo * 0.37 + dz * ancho,
      alto * 0.62,
      dz * largo * 0.37 - dx * ancho,
    ];
    const punta = [dx * largo, alto, dz * largo];
    vertices.push(...raiz, ...izq, ...der, ...izq, ...punta, ...der);
    for (const tono of [0.28, 0.68, 0.59, 0.68, 1, 0.59]) {
      colores.push(tono, tono, tono * 0.86);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Combina las piezas de un prop en una geometría con color por vértice.
 * @param {{ geo: THREE.BufferGeometry, hex: number }[]} partes */
function unirPiezas(partes) {
  const color = new THREE.Color();
  const geometrias = partes.map(({ geo, hex }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    const datos = new Float32Array(g.attributes.position.count * 3);
    color.setHex(hex);
    for (let i = 0; i < datos.length; i += 3) color.toArray(datos, i);
    g.setAttribute("color", new THREE.BufferAttribute(datos, 3));
    return g;
  });
  const resultado = mergeGeometries(geometrias);
  for (const geo of geometrias) geo.dispose();
  return resultado;
}

/**
 * @param {{
 *   scene: THREE.Scene, keep: import("./tipos.js").Keep,
 *   ruta: import("../gameplay/ruta.js").Ruta, ancho: number,
 *   centro: {x: number, z: number}, radio: number, umbral: number,
 *   terreno: (x: number, z: number) => number,
 *   suelo: (x: number, z: number) => number,
 * }} datos
 */
export function crearDetalleTemplo({
  scene,
  keep,
  ruta,
  ancho,
  centro,
  radio,
  umbral,
  terreno,
  suelo,
}) {
  const grupo = new THREE.Group();
  grupo.name = "vegetacion-y-piedra-del-templo";
  scene.add(grupo);
  const punto = { x: 0, z: 0, ang: 0 };
  const proyeccion = nuevaProyeccion();
  const transformacion = new THREE.Object3D();
  const color = new THREE.Color();
  const tiempo = { value: 0 };
  const matHierba = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
  );
  // Las raíces siguen clavadas. La misma brisa pasa por todas las instancias en el shader.
  matHierba.onBeforeCompile = (shader) => {
    shader.uniforms.brisaTemplo = tiempo;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float brisaTemplo;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec2 origen = instanceMatrix[3].xz;
        float peso = max(position.y, 0.0) * max(position.y, 0.0);
        transformed.x += 0.13 * peso * sin(brisaTemplo + dot(origen, vec2(0.43, 0.28)));
        transformed.z += 0.05 * peso * sin(brisaTemplo * 1.6 + origen.y * 0.6);`,
      );
  };
  const matFlores = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
    }),
  );
  const matRoca = keep(
    new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }),
  );
  const hierba = new THREE.InstancedMesh(
    keep(geometriaMata()),
    matHierba,
    3600,
  );
  const flores = new THREE.InstancedMesh(
    keep(
      unirPiezas([
        {
          geo: new THREE.CylinderGeometry(0.014, 0.022, 0.57, 4).translate(
            0,
            0.22,
            0,
          ),
          hex: 0x78935a,
        },
        {
          geo: new THREE.IcosahedronGeometry(0.11)
            .scale(1, 0.51, 1)
            .translate(0, 0.51, 0),
          hex: 0xffe9b5,
        },
        {
          geo: new THREE.IcosahedronGeometry(0.045).translate(0, 0.555, 0),
          hex: 0xe7b268,
        },
        {
          geo: new THREE.IcosahedronGeometry(0.1)
            .scale(0.9, 0.25, 0.36)
            .translate(0.055, 0.31, 0),
          hex: 0x8aab59,
        },
      ]),
    ),
    matFlores,
    720,
  );
  const piedras = new THREE.InstancedMesh(
    keep(new THREE.DodecahedronGeometry(1)),
    matRoca,
    470,
  );
  /** @type {{ x: number, z: number, semilla: number }[]} */
  const centros = [];

  // La ladera alterna manchones altos y bajos. La huella del camino y la terraza quedan despejadas.
  for (let i = 0; i < 185; i++) {
    const lado = i % 2 ? -1 : 1;
    const s = 1 + (umbral + 4) * azar(i, 14);
    const falda = 0.85 + Math.pow(azar(i, 15), 1.5) * (lado < 0 ? 12 : 7);
    puntoRuta(ruta, s, lado * (ancho + falda), punto);
    centros.push({ x: punto.x, z: punto.z, semilla: i });
  }
  // Rodea la terraza con matas, piedras y flores. El claro central conserva su piso de entrenamiento.
  for (let i = 0; i < 50; i++) {
    const angulo = (i / 50) * Math.PI * 2;
    const r = radio + 1.5 + azar(i, 16) * 3.7;
    centros.push({
      x: centro.x + Math.cos(angulo) * r,
      z: centro.z + Math.sin(angulo) * r,
      semilla: 200 + i,
    });
  }

  let matas = 0,
    floresPuestas = 0,
    piedrasPuestas = 0;
  for (const { x, z, semilla } of centros) {
    for (let j = 0; j < 15; j++) {
      const i = semilla * 19 + j;
      const angulo = azar(i, 21) * Math.PI * 2;
      const r = Math.sqrt(azar(i, 22)) * (0.65 + azar(semilla, 23) * 1.8);
      const px = x + Math.cos(angulo) * r;
      const pz = z + Math.sin(angulo) * r;
      proyectarRuta(ruta, px, pz, proyeccion);
      if (
        proyeccion.dist < ancho + 0.4 ||
        Math.hypot(px - centro.x, pz - centro.z) < radio + 1.18
      )
        continue;
      const y = terreno(px, pz); // altura interpolada de la misma cara que se dibuja
      const escala = 0.33 + azar(i, 24) * 0.72;
      transformacion.position.set(px, y - 0.04, pz);
      transformacion.rotation.set(0, angulo, (azar(i, 25) - 0.5) * 0.17);
      transformacion.scale.set(escala * 1.22, escala, escala * 1.22);
      transformacion.updateMatrix();
      hierba.setMatrixAt(matas, transformacion.matrix);
      color
        .setHex(azar(semilla, 26) < 0.37 ? 0x77924f : 0xb1b369)
        .multiplyScalar(0.61 + azar(i, 27) * 0.46);
      hierba.setColorAt(matas++, color);
      if (j < 3 && azar(semilla, 28) > 0.3) {
        transformacion.position.y += 0.03;
        transformacion.scale.setScalar(0.66 + azar(i, 29) * 0.62);
        transformacion.updateMatrix();
        flores.setMatrixAt(floresPuestas, transformacion.matrix);
        color.setHex(azar(semilla, 30) < 0.52 ? 0xf5d89e : 0xc77894);
        flores.setColorAt(floresPuestas++, color);
      }
      if (j === 0 || j === 9) {
        const tam = 0.2 + azar(i, 31) * 0.77;
        transformacion.rotation.set(azar(i, 32), angulo, azar(i, 33));
        transformacion.scale.set(tam * 1.45, tam * 0.47, tam * 0.9);
        transformacion.updateMatrix();
        piedras.setMatrixAt(piedrasPuestas, transformacion.matrix);
        color
          .setHex(azar(i, 34) < 0.34 ? 0x85835e : 0x9d8a70)
          .multiplyScalar(0.73 + azar(i, 35) * 0.46);
        piedras.setColorAt(piedrasPuestas++, color);
      }
    }
  }
  hierba.count = matas;
  flores.count = floresPuestas;
  piedras.count = piedrasPuestas;
  for (const malla of [hierba, flores, piedras]) malla.receiveShadow = true;
  piedras.castShadow = true;
  grupo.add(hierba, flores, piedras);

  // Pilas de ofrendas con borde de bronce, repartidas en descansos y en la llegada.
  const mojones = [
    [9, -1],
    [9, 1],
    [42, -1],
    [48, 1],
    [72, -1],
    [93, 1],
    [124, -1],
    [143, 1],
    [172, -1],
    [umbral - 4, -1],
    [umbral - 4, 1],
  ];
  const matOfrenda = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      flatShading: true,
    }),
  );
  const ofrenda = new THREE.InstancedMesh(
    keep(
      unirPiezas([
        {
          geo: new THREE.CylinderGeometry(0.49, 0.63, 0.21, 6).translate(
            0,
            0.04,
            0,
          ),
          hex: 0x938068,
        },
        {
          geo: new THREE.CylinderGeometry(0.33, 0.38, 0.59, 6).translate(
            0,
            0.38,
            0,
          ),
          hex: 0xb9a58b,
        },
        {
          geo: new THREE.CylinderGeometry(0.5, 0.26, 0.26, 8).translate(
            0,
            0.79,
            0,
          ),
          hex: 0x8b5336,
        },
        {
          geo: new THREE.TorusGeometry(0.46, 0.046, 4, 8)
            .rotateX(-Math.PI / 2)
            .translate(0, 0.92, 0),
          hex: 0xcc9e58,
        },
        {
          geo: new THREE.CylinderGeometry(0.39, 0.35, 0.035, 8).translate(
            0,
            0.91,
            0,
          ),
          hex: 0x673f30,
        },
        {
          geo: new THREE.IcosahedronGeometry(0.16)
            .scale(1.15, 0.32, 0.85)
            .translate(0.1, 0.96, -0.07),
          hex: 0xcf8355,
        },
        {
          geo: new THREE.IcosahedronGeometry(0.12)
            .scale(1, 0.32, 1.3)
            .translate(-0.16, 0.96, 0.1),
          hex: 0xe7b476,
        },
      ]),
    ),
    matOfrenda,
    mojones.length,
  );
  for (const [i, [s, lado]] of mojones.entries()) {
    puntoRuta(ruta, s, lado * (ancho + 0.9), punto);
    transformacion.position.set(punto.x, terreno(punto.x, punto.z), punto.z);
    transformacion.rotation.set(0, -punto.ang, 0);
    transformacion.scale.setScalar(1 + azar(i, 40) * 0.3);
    transformacion.updateMatrix();
    ofrenda.setMatrixAt(i, transformacion.matrix);
  }
  ofrenda.castShadow = true;
  ofrenda.receiveShadow = true;
  grupo.add(ofrenda);

  // Los mosaicos de la plaza dibujan una rosa de piedra y una guarda de doce puntas.
  const materialMosaico = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  /** @type {{ geo: THREE.BufferGeometry, hex: number }[]} */
  const piezas = [
    { geo: new THREE.RingGeometry(0.92, 1.04, 48), hex: 0xa48153 },
    { geo: new THREE.RingGeometry(2.86, 2.96, 64), hex: 0x827e62 },
    { geo: new THREE.RingGeometry(3.13, 3.19, 64), hex: 0xb99869 },
    { geo: new THREE.RingGeometry(6.1, 6.18, 96), hex: 0xa28b63 },
    { geo: new THREE.RingGeometry(6.48, 6.57, 96), hex: 0x918469 },
  ];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const grande = i % 2 === 0;
    piezas.push(
      {
        geo: new THREE.CircleGeometry(1, 4)
          .scale(grande ? 0.66 : 0.46, 0.13, 1)
          .translate(grande ? 1.76 : 1.57, 0, 0)
          .rotateZ(a),
        hex: grande ? 0xa38050 : 0x88896b,
      },
      {
        geo: new THREE.CircleGeometry(1, 4)
          .scale(0.127, 0.086, 1)
          .translate(6.33, 0, 0)
          .rotateZ(a),
        hex: grande ? 0xa38658 : 0x8a7957,
      },
    );
  }
  const mosaico = new THREE.Mesh(keep(unirPiezas(piezas)), materialMosaico);
  mosaico.position.set(centro.x, suelo(centro.x, centro.z) + 0.006, centro.z);
  mosaico.rotation.x = -Math.PI / 2;
  mosaico.receiveShadow = true;
  grupo.add(mosaico);

  // Dos pendones descoloridos anuncian el dominio de Mirra en la cara de entrada.
  puntoRuta(ruta, umbral - 0.78, 0, punto);
  const pendones = new THREE.Group();
  pendones.position.set(punto.x, suelo(punto.x, punto.z) + 3.6, punto.z);
  pendones.rotation.y = -punto.ang - Math.PI / 2; // +z local hacia quien sube
  const silueta = new THREE.Shape();
  silueta.moveTo(-0.48, 0.85);
  silueta.lineTo(-0.48, -0.6);
  silueta.lineTo(-0.24, -0.89);
  silueta.lineTo(-0.03, -0.77);
  silueta.lineTo(0.17, -0.97);
  silueta.lineTo(0.48, -0.63);
  silueta.lineTo(0.48, 0.85);
  silueta.closePath();
  const tela = new THREE.ShapeGeometry(silueta);
  /** @type {{geo: THREE.BufferGeometry, hex: number}[]} */
  const espiga = [
    {
      geo: new THREE.BoxGeometry(0.035, 0.86, 0.018).translate(0, -0.04, 0.013),
      hex: 0xdcb476,
    },
    {
      geo: new THREE.CylinderGeometry(0.06, 0.06, 1.18, 8)
        .rotateZ(Math.PI / 2)
        .translate(0, 0.88, 0),
      hex: 0xb2834b,
    },
  ];
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      espiga.push({
        geo: new THREE.CircleGeometry(1, 4)
          .scale(0.15, 0.042, 1)
          .rotateZ(lado * 0.72)
          .translate(lado * 0.125, -0.21 + i * 0.19, 0.027),
        hex: 0xdcb476,
      });
    }
  }
  const geoPendon = keep(unirPiezas([{ geo: tela, hex: 0x94533e }, ...espiga]));
  const matPendon = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
  );
  for (const lado of [-1, 1]) {
    const pendon = new THREE.Mesh(geoPendon, matPendon);
    pendon.position.x = lado * (ancho - 0.3); // m: frente a los dos machones
    pendon.receiveShadow = true;
    pendones.add(pendon);
  }
  grupo.add(pendones);

  return {
    /** @param {import("./tipos.js").Paleta} p */
    aplicarPaleta(p) {
      matHierba.color.setHex(mezclarHex(0xffffff, p.vegetacion, 0.26));
      matFlores.color.setHex(mezclarHex(0xffffff, p.particula, 0.2));
      matRoca.color.setHex(mezclarHex(0xffffff, p.piedra, 0.35));
    },
    /** @param {number} dt @param {boolean} reducido */
    avanzar(dt, reducido) {
      if (!reducido) tiempo.value += dt * 1.55;
    },
    dispose() {
      for (const malla of [hierba, flores, piedras, ofrenda]) malla.dispose();
      scene.remove(grupo);
    },
  };
}
