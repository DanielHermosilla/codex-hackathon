// Embarcadero al salir del trigal. Los tablones llevan hasta el muelle de Ondar.
import * as THREE from "three";
import {
  crearLetreroMuelle,
  geometriaAmarras,
  geometriaEspuma,
  geometriaJuncos,
} from "./muelle-detalle.js";

/** @param {{scene: THREE.Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep}} args */
export function crearSalidaTrigal({ scene, cfg, keep }) {
  const tramo = cfg.recorrido.salida;
  const medio = tramo.ancho / 2; // metros desde el centro hasta la baranda
  const largo = tramo.zInicio - tramo.zFin;
  const centro = (tramo.zInicio + tramo.zFin) / 2;
  const pal = cfg.paleta.zonas.muelle.base; // agua fría y madera iluminada al atardecer
  const raiz = new THREE.Group();
  scene.add(raiz);
  const cubo = keep(new THREE.BoxGeometry(1, 1, 1));
  const poste = keep(new THREE.CylinderGeometry(0.48, 0.5, 1, 8));
  const roca = keep(new THREE.IcosahedronGeometry(1, 0));
  const material = keep(
    new THREE.MeshStandardMaterial({
      roughness: 0.9,
      flatShading: true,
    }),
  );
  const matriz = new THREE.Object3D();
  const tono = new THREE.Color();
  /** @typedef {{x:number,y:number,z:number,ancho:number,alto:number,fondo:number,color:number,giro?:number,luz?:number}} Pieza */
  /** @type {Pieza[]} */
  const tablas = [];
  /** @type {Pieza[]} */
  const postes = [];
  /** @type {Pieza[]} */
  const rocas = [];
  /** @type {Pieza[]} */
  const juncos = [];
  /** @type {Pieza[]} */
  const boyas = [];

  // Una llamada de dibujo por tipo de pieza. Transformaciones y colores quedan fijos desde el montaje.
  /** @param {THREE.BufferGeometry} forma @param {Pieza[]} piezas @param {boolean} sombras @param {THREE.MeshStandardMaterial} [pintura] */
  function montar(forma, piezas, sombras, pintura = material) {
    const lote = keep(new THREE.InstancedMesh(forma, pintura, piezas.length));
    piezas.forEach((p, i) => {
      matriz.position.set(p.x, p.y, p.z);
      matriz.scale.set(p.ancho, p.alto, p.fondo);
      matriz.rotation.y = p.giro ?? 0;
      matriz.updateMatrix();
      lote.setMatrixAt(i, matriz.matrix);
      lote.setColorAt(i, tono.setHex(p.color).multiplyScalar(p.luz ?? 1));
    });
    lote.receiveShadow = true;
    lote.castShadow = sombras;
    raiz.add(lote);
  }

  // El pavimento cubre el borde físico de la zona. Las juntas, de 1 cm, dejan ver las vigas inferiores.
  const fondoTabla = 0.55;
  const filas = Math.ceil(largo / fondoTabla);
  const paso = largo / filas;
  tablas.push({
    x: 0,
    y: -0.31,
    z: centro,
    ancho: tramo.ancho + 0.6,
    alto: 0.26,
    fondo: largo + 0.6,
    color: pal.sueloAlt,
  });
  for (let i = 0; i < filas; i++) {
    const z = tramo.zInicio - (i + 0.5) * paso;
    // La junta alterna a derecha e izquierda para que las vetas cortas se lean como tablones reales.
    const junta = i % 3 === 0 ? -1.8 : i % 3 === 1 ? 1.1 : -0.4;
    for (const [a, b] of [
      [-medio - 0.3, junta],
      [junta, medio + 0.3],
    ]) {
      tablas.push({
        x: (a + b) / 2,
        y: -0.09,
        z,
        ancho: b - a - 0.012,
        alto: 0.18,
        fondo: paso - 0.012,
        color: pal.suelo,
        luz: 0.87 + 0.18 * (0.5 + 0.5 * Math.sin(i * 2.9 + a)),
      });
      // Fibras largas y marcas de desgaste a un par de milímetros sobre el tablón.
      for (let veta = 0; veta < 3; veta++) {
        const t = 0.5 + 0.5 * Math.sin(i * 2.41 + a * 1.21 + veta * 3.7);
        tablas.push({
          x: a + (b - a) * (0.24 + t * 0.52),
          y: 0.001,
          z: z + (veta - 1) * paso * 0.23,
          ancho: (b - a) * (0.11 + t * 0.16),
          alto: 0.002,
          fondo: 0.018 + t * 0.021,
          color: veta === 1 ? 0xb19370 : pal.sueloAlt,
          luz: 0.91 + 0.14 * t,
        });
      }
    }
  }

  // Pilotes con bandas de cuerda, travesaños y amarras en el borde del muelle.
  for (const lado of [-1, 1]) {
    const x = lado * (medio + 0.32);
    for (let i = 0; i <= 4; i++) {
      const z = tramo.zInicio - (largo * i) / 4;
      postes.push({
        x,
        y: -0.8,
        z,
        ancho: 0.36,
        alto: 3.05,
        fondo: 0.36,
        color: pal.sueloAlt,
      });
      postes.push({
        x,
        y: 0.42,
        z,
        ancho: 0.41,
        alto: 0.18,
        fondo: 0.41,
        color: cfg.render.materiales.cuerda,
      });
    }
    tablas.push({
      x,
      y: 0.26,
      z: centro,
      ancho: 0.11,
      alto: 0.14,
      fondo: largo,
      color: pal.sueloAlt,
    });
  }

  // Al fondo, pilotes antiguos continúan sobre el agua. No son plataformas transitables.
  for (let i = 1; i <= 6; i++) {
    for (const lado of [-1, 1]) {
      const z = tramo.zFin - 2.8 * i;
      postes.push({
        x: lado * 2.1 - 0.25 * i,
        y: -1.22,
        z,
        ancho: 0.43,
        alto: 2.8 - 0.12 * i,
        fondo: 0.43,
        color: pal.sueloAlt,
      });
    }
  }
  tablas.push({
    x: 0,
    y: 0.42,
    z: tramo.zFin - 0.45,
    ancho: tramo.ancho + 0.6,
    alto: 0.22,
    fondo: 0.25,
    color: pal.sueloAlt,
  });

  // Cajones de suministros y sus listones en la esquina del fondo.
  for (const [x, z, alto] of [
    [medio - 1.0, tramo.zFin + 1.7, 0.95],
    [medio - 2.4, tramo.zFin + 1.9, 0.72],
    [medio - 0.8, tramo.zFin + 3.1, 0.74],
  ]) {
    tablas.push({
      x,
      y: alto / 2,
      z,
      ancho: 1.12,
      alto,
      fondo: 1.02,
      color: pal.sueloAlt,
    });
    for (const corrimiento of [-0.4, 0.4]) {
      tablas.push({
        x: x + corrimiento,
        y: alto / 2,
        z: z + 0.52,
        ancho: 0.095,
        alto: alto + 0.04,
        fondo: 0.055,
        color: pal.suelo,
      });
    }
  }

  // Orillas bajas de piedra y un cabo distante, a ambos lados del muelle.
  for (let i = 0; i < 30; i++) {
    const lado = i % 2 === 0 ? -1 : 1;
    const fila = Math.floor(i / 2);
    const x = lado * (medio + 11 + 4 * Math.sin(fila * 0.8));
    const z = tramo.zInicio + 12 - fila * 3.6;
    rocas.push({
      x,
      y: -2.3,
      z,
      ancho: 4 + 2 * Math.cos(i * 1.1),
      alto: 1.6 + 0.9 * Math.sin(i * 1.7),
      fondo: 4.5,
      color: pal.piedra,
      giro: i * 0.7,
      luz: 0.83 + 0.12 * Math.sin(i),
    });
  }
  for (let i = 0; i < 7; i++) {
    rocas.push({
      x: (i - 3) * 13,
      y: -3,
      z: tramo.zFin - 40 + 3 * Math.sin(i),
      ancho: 11 + 2 * Math.sin(i),
      alto: 3.2 + 2.2 * Math.cos(i * 1.5),
      fondo: 8,
      color: pal.vegetacion,
      giro: i * 1.4,
    });
  }

  /** @type {{ poste: THREE.Vector3, boya: THREE.Vector3 }[]} */
  const amarres = [];
  /** @type {{ x: number, z: number, giro: number }[]} */
  const bancos = [];
  for (const lado of [-1, 1]) {
    // Los bancos someros quedan pegados al muelle, siempre fuera del tablón transitable.
    for (let banco = 0; banco < 6; banco++) {
      const x = lado * (medio + 2.75 + 1.3 * Math.sin(banco * 2.7 + lado));
      const z = tramo.zInicio - (largo * (banco + 0.4)) / 6;
      bancos.push({ x, z, giro: banco * 2.17 + lado });
      for (let i = 0; i < 6; i++) {
        const a = i * 2.399 + banco;
        const ancho = 0.53 + 0.38 * (0.5 + 0.5 * Math.cos(i * 2.17 + banco));
        const px = x + Math.cos(a) * (0.45 + i * 0.14);
        const pz = z + Math.sin(a) * (0.45 + i * 0.14);
        rocas.push({
          x: px,
          y: -1.95,
          z: pz,
          ancho,
          alto: ancho * 0.7,
          fondo: ancho * 1.44,
          color: i % 3 === 0 ? 0x566142 : pal.piedra,
          giro: a,
          luz: 0.76 + 0.05 * i,
        });
        juncos.push({
          x: px,
          y: -1.58,
          z: pz,
          ancho: 0.72 + 0.12 * i,
          alto: ancho * 1.28,
          fondo: 0.85,
          color: i % 3 === 1 ? 0xe1ce96 : 0xffffff,
          giro: a + lado,
        });
      }
    }
    // Boyas de señal y sus cuerdas siguiendo el exterior de los pilotes existentes.
    for (const fila of [1, 3]) {
      const z = tramo.zInicio - (largo * fila) / 4;
      const x = lado * (medio + 1.55);
      const desfase = fila === 1 ? -1.35 : 1.22;
      boyas.push({
        x,
        y: -1.5,
        z: z + desfase,
        ancho: 0.77,
        alto: 0.77,
        fondo: 0.77,
        color: fila === 1 ? 0xbe604b : 0xbb9655,
      });
      postes.push({
        x,
        y: -1.27,
        z: z + desfase,
        ancho: 0.43,
        alto: 0.16,
        fondo: 0.43,
        color: 0xb6a68e,
      });
      amarres.push({
        poste: new THREE.Vector3(lado * (medio + 0.43), 0.45, z),
        boya: new THREE.Vector3(x, -1.17, z + desfase),
      });
    }
  }
  montar(cubo, tablas, true);
  montar(poste, postes, true);
  montar(roca, rocas, false);
  montar(keep(new THREE.SphereGeometry(0.5, 9, 6)), boyas, false);
  montar(
    keep(geometriaJuncos()),
    juncos,
    false,
    keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 1,
      }),
    ),
  );
  const cuerdas = new THREE.Mesh(
    keep(geometriaAmarras(amarres)),
    keep(new THREE.MeshStandardMaterial({ color: 0xb9a181, roughness: 1 })),
  );
  cuerdas.receiveShadow = true;
  raiz.add(cuerdas);
  const letrero = crearLetreroMuelle(keep);
  letrero.position.set(medio - 0.72, 0, tramo.zInicio - 3.3); // al borde del paso peatonal
  letrero.rotation.y = -0.22;
  raiz.add(letrero);

  // Agua facetada. El color y las ondas se calculan una vez: el movimiento reducido también conserva la calma.
  const aguaGeo = keep(
    new THREE.PlaneGeometry(210, 180, 72, 60).rotateX(-Math.PI / 2),
  );
  const vertices = aguaGeo.attributes.position;
  const colores = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      z = vertices.getZ(i);
    const ola = Math.sin(z * 0.72 + x * 0.16) * Math.cos(x * 0.35 - z * 0.22);
    vertices.setY(i, -1.65 + ola * 0.075);
    tono
      .setHex(pal.agua)
      .multiplyScalar(0.94 + 0.13 * ola)
      .toArray(colores, i * 3);
  }
  aguaGeo.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  aguaGeo.computeVertexNormals();
  const agua = new THREE.Mesh(
    aguaGeo,
    keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.56,
        flatShading: true,
      }),
    ),
  );
  agua.position.z = centro;
  raiz.add(agua);
  const espuma = new THREE.Mesh(
    keep(geometriaEspuma(bancos)),
    keep(
      new THREE.MeshBasicMaterial({
        color: 0xb3ccbf,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    ),
  );
  raiz.add(espuma);

  return {
    dispose() {
      scene.remove(raiz); // keep libera los materiales, instancias y geometrías al cerrar la sala
    },
  };
}
