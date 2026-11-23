// Puesto 23: carrito de completos al borde del trigal, con quitasol a rayas y un letrero con el
// emblema de Codex. Es decorado (no choca ni hace daño) y cumple las condiciones de la hackatón:
// el número 23, el completo y el logo de Codex visibles en el mundo. Colores: tokens de CONFIG.
import * as THREE from "three";

const BASE = import.meta.env?.BASE_URL ?? "/";

/**
 * Dibuja el letrero en un canvas: fondo oscuro, «COMPLETOS» en dorado, «Puesto 23» y el emblema.
 * @param {any} P Tokens del puesto (`CONFIG.render.puesto`).
 */
function crearLetrero(P) {
  const lienzo = document.createElement("canvas");
  lienzo.width = 512; // píxeles del letrero: suficientes para leerlo a la distancia de la cámara
  lienzo.height = 192;
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace; // el canvas pinta colores sRGB
  textura.anisotropy = 4;
  const hex = (/** @type {number} */ n) =>
    "#" + n.toString(16).padStart(6, "0");
  /** @param {HTMLImageElement | null} logo */
  function pintar(logo) {
    const g = lienzo.getContext("2d");
    if (!g) return;
    g.fillStyle = hex(P.letrero);
    g.fillRect(0, 0, lienzo.width, lienzo.height);
    g.strokeStyle = hex(P.letreroTexto);
    g.lineWidth = 8;
    g.strokeRect(10, 10, lienzo.width - 20, lienzo.height - 20);
    g.fillStyle = hex(P.letreroTexto);
    g.textBaseline = "middle";
    g.font = "bold 68px Georgia, 'Times New Roman', serif";
    g.fillText("COMPLETOS", 150, 78, lienzo.width - 172); // el último número = ancho máximo en píxeles
    g.font = "600 40px Georgia, 'Times New Roman', serif";
    g.fillText("Puesto 23", 152, 140, lienzo.width - 172);
    // El emblema (blanco sobre fondo oscuro) va a la izquierda, a 112 px de alto.
    if (logo) g.drawImage(logo, 26, 40, 112, 112);
    textura.needsUpdate = true;
  }
  pintar(null);
  const logo = new Image();
  logo.onload = () => pintar(logo); // el SVG llega después: se repinta con el emblema
  logo.src = `${BASE}atados/codex.svg`;
  return textura;
}

/**
 * @param {{scene: THREE.Scene, cfg: any, keep: <T>(o: T) => T, world0: {arenaRadius: number}}} opciones
 */
export function crearPuesto({ scene, cfg, keep, world0 }) {
  const P = cfg.render.puesto;
  const mat = (/** @type {number} */ color) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.85,
      }),
    );
  const raiz = new THREE.Group();

  // Caja del carro (metros): 1,8 de largo, 0,9 de alto y 1 de fondo, sobre dos ruedas.
  const caja = new THREE.Mesh(
    keep(new THREE.BoxGeometry(1.8, 0.9, 1)),
    mat(P.carro),
  );
  caja.position.y = 0.75;
  const borde = new THREE.Mesh(
    keep(new THREE.BoxGeometry(1.9, 0.08, 1.1)),
    mat(P.borde),
  );
  borde.position.y = 1.22;
  const ruedaGeo = keep(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 10));
  ruedaGeo.rotateX(Math.PI / 2); // la rueda gira alrededor del eje Z del carro
  const ruedaMat = mat(P.rueda);
  for (const lado of [-1, 1]) {
    const rueda = new THREE.Mesh(ruedaGeo, ruedaMat);
    rueda.position.set(lado * 0.6, 0.32, 0.56);
    raiz.add(rueda);
  }

  // Quitasol a rayas: un cono de 8 gajos con dos colores alternos (color por vértice, un draw call).
  const toldoGeo = keep(
    new THREE.ConeGeometry(1.05, 0.5, 8, 1, true).toNonIndexed(),
  );
  const colores = [];
  const a = new THREE.Color(P.toldoA);
  const b = new THREE.Color(P.toldoB);
  const triangulos = toldoGeo.attributes.position.count / 3;
  for (let i = 0; i < triangulos; i++) {
    const c = Math.floor(i / 2) % 2 === 0 ? a : b; // cada gajo son dos triángulos
    for (let k = 0; k < 3; k++) colores.push(c.r, c.g, c.b);
  }
  toldoGeo.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
  const toldo = new THREE.Mesh(
    toldoGeo,
    keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
    ),
  );
  toldo.position.y = 2.55;
  const palo = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6)),
    mat(P.borde),
  );
  palo.position.y = 1.9;

  const letrero = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(2.3, 0.86)),
    keep(
      new THREE.MeshBasicMaterial({
        map: keep(crearLetrero(P)),
        toneMapped: false,
        fog: false,
      }),
    ),
  );

  raiz.add(caja, borde, toldo, palo);
  raiz.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== letrero) o.castShadow = true;
  });
  // Fuera del círculo jugable, en el ángulo de la config.
  const ang = (P.anguloDeg * Math.PI) / 180;
  const r = world0.arenaRadius + P.margen;
  raiz.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
  // El frente (+z local) mira hacia `mirarA`, un punto del lado de la cámara: el letrero se lee de frente.
  raiz.rotation.y = Math.atan2(
    P.mirarA[0] - raiz.position.x,
    P.mirarA[1] - raiz.position.z,
  );
  // El letrero no gira con el carro: mira siempre a la cámara 3/4 (inclinado lo mismo que su elevación),
  // delante del carro y sobre el trigal alto, para que se lea desde arriba.
  letrero.position.set(
    raiz.position.x,
    P.letreroAltura * P.escala,
    raiz.position.z + P.letreroDelante * P.escala,
  );
  letrero.rotation.x = -(cfg.camera.elevationDeg * Math.PI) / 180;
  // `escala` agranda todo el puesto para que se lea en la portada.
  raiz.scale.setScalar(P.escala);
  letrero.scale.setScalar(P.escala);
  scene.add(raiz, letrero);

  return {
    /** Agrega el carrito a la lista [x, z, radio] que encuadra la cámara (portada del menú). @param {number[]} puntos */
    foco(puntos) {
      puntos.push(raiz.position.x, raiz.position.z, 2);
    },
    dispose() {
      scene.remove(raiz, letrero); // geometrías, materiales y textura se liberan con la lista `keep` del render
    },
  };
}
