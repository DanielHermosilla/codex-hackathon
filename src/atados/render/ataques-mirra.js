// Señales físicas de los ataques de Mirra (fase 1 y fase 2). Cada ataque tiene un cuerpo propio que se lee
// desde la cámara alta: carga → lanzamiento → impacto o ventana de castigo.
// - Siega / Siega doble: filo dorado en el borde por donde empezará la hoz; al golpear, estela que barre el arco;
//   después, dos surcos donde quedan clavados los brazos (ventana de 1,2–1,5 s).
// - Grano: el abdomen se llena (brillo continuo); cinco semillas de dos tonos asoman en la boca; un trazo de puntos
//   claros dibuja el arco desde la boca real hasta cada círculo; al caer brotan espinas altas (base oscura, punta
//   clara) sobre un cráter oscuro y se hunden al terminar.
// - Hambre: dos garfios de quitina se abren y bajan a raspar mientras dos zarpazos marcan el suelo; en la
//   embestida se cierran y dejan una huella ancha con caballones claros a los lados; si tropieza, cuelgan y
//   las cascarillas giran sobre su cabeza (ventana de castigo).
// - Enjambre: la copa se sacude; las langostas salen de ella y forman la nube sobre su círculo; al acabar se dispersan.
// - Banquete: briznas de trigal fluyen hacia la boca mientras aspira; dientes de quitina salen del borde de la
//   mordida y se cierran al golpear; en el letargo el abdomen queda hinchado y suelta motas lentas.
// Las áreas exactas siguen en telegrafias.js: aquí nada sale del área real ni tapa sus colores. Solo lee el estado
// (acción, etapa, tiempos, zonas y proyectiles); no decide gameplay. Todo se crea al inicio (pools): ningún
// `new THREE.*` por cuadro. Con movimiento reducido se quitan oscilaciones y parpadeos, nunca la información.
import * as THREE from "three";

const TAU = Math.PI * 2; // una vuelta completa en radianes
/** Limita un número a 0..1. @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** Curva suave 0→1: arranca y termina despacio (smoothstep). @param {number} v */
const suave = (v) => {
  const k = clamp01(v); // primero se limita al tramo 0..1
  return k * k * (3 - 2 * k); // polinomio de smoothstep
};
/** Parte decimal de un número (0..1), útil para ciclos que se repiten. @param {number} v */
const frac = (v) => v - Math.floor(v);
/** Ruido fijo por índice: mismo resultado cada cuadro (decorado, no gameplay). @param {number} a @param {number} b */
const hash = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);

// Valores para iterar el aspecto. Unidades: m (metros), s (segundos), rad (radianes). Solo cambian el dibujo:
// el daño, el área y los tiempos de golpe salen de CONFIG.jefes.mirra y no se tocan desde aquí.
export const AJUSTE_ATAQUES = {
  siega: {
    anchoFilo: 0.35, // m de grosor del filo dorado; más = hoja más visible desde lejos
    estela: 0.6, // rad máximos de estela tras la hoja (0,6 ≈ 34°); nunca sale de lo ya barrido
    desvanece: 0.3, // s que tarda la estela en apagarse tras el golpe
    surcoLargo: 1.3, // m de cada surco de los brazos clavados
  },
  grano: {
    puasPorZona: 9, // espinas que brotan en cada círculo de impacto
    alturaPua: 2.4, // m de la espina más alta (el trigal llega a ~0,5 m: así sobresalen)
    radioPua: 0.3, // m de radio en la base de cada espina (base oscura, punta clara)
    subida: 0.08, // s que tardan en brotar (golpe seco)
    hundida: 0.25, // s que tardan en hundirse cuando el círculo deja de dañar
    semilla: 1.4, // multiplicador del tamaño de la semilla (1 = 0,35 × 0,8 m)
    arco: 2.5, // m de flecha del arco de vuelo (más 0,12 m por metro de distancia)
    puntos: 7, // puntos claros que dibujan la trayectoria de cada semilla
    previa: 0.45, // s antes del vuelo en que la trayectoria se dibuja desde la boca
    respira: 0.7, // Hz de la respiración lenta del abdomen (sin flashes o reducido: brillo fijo que crece)
  },
  hambre: {
    garraLargo: 1.8, // m que alcanzan los zarpazos al final de la carga
    garfioLargo: 2.6, // m de cada garfio de la mandíbula
    garfioAbre: 0.6, // rad que se abre cada garfio hacia su lado durante la carga
    polvoCada: 0.18, // s entre bocanadas de polvo mientras raspa (el doble con movimiento reducido)
    surcoAncho: 2.2, // m de ancho de la huella oscura que deja la embestida
    caballon: 0.32, // m de alto de los dos bordes claros de tierra levantada
    surcoDura: 1.8, // s que tarda la huella en borrarse
  },
  enjambre: {
    langostas: 42, // langostas en la nube (60 % con movimiento reducido)
    alto: 1.3, // m de altura extra de la nube sobre el suelo
    dispersa: 0.7, // s que tarda la nube en dispersarse al acabar
  },
  banquete: {
    briznas: 40, // briznas que fluyen hacia la boca (la mitad con movimiento reducido)
    periodo: 1.3, // s que tarda una brizna en llegar a la boca
    alcance: 12, // m más allá del cuerpo desde donde salen las briznas
    dientes: 18, // dientes en el borde de la mordida (radio 1,2 L ≈ 8,4 m: uno cada ~3 m)
    alturaDiente: 1.4, // m de cada diente
  },
};

/**
 * @param {{ scene: THREE.Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep, brillos: ReturnType<typeof import('./brillos.js').crearBrillos> }} args
 */
export function crearAtaquesMirra({ scene, cfg, keep, brillos }) {
  const A = AJUSTE_ATAQUES; // alias corto para los ajustes
  const X = cfg.paleta.corrupcion; // ámbar corrupto de la esquirla y las vetas
  const NZ = cfg.jefes.comun.pools.zonas; // tamaño del pool de zonas del combate
  const NP = cfg.jefes.comun.pools.proyectiles; // tamaño del pool de proyectiles
  const raiz = new THREE.Group(); // todo cuelga de aquí para ocultarlo de una vez
  scene.add(raiz);

  // ─── Materiales (uno por papel; se comparten entre piezas) ───
  // Marca plana en el suelo: sin niebla, sin escribir profundidad y empujada hacia la cámara para no parpadear.
  /** @param {number} color @param {number} opacity @param {boolean} [aditivo] @param {boolean} [conAlfa] */
  const marcaMat = (color, opacity, aditivo = false, conAlfa = false) =>
    keep(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true, // permite opacidad < 1
        opacity,
        depthWrite: false, // no tapa otras marcas transparentes
        side: THREE.DoubleSide, // se ve aunque la malla esté espejada (estela de la siega)
        fog: false,
        toneMapped: false, // color exacto, igual que las telegrafías
        vertexColors: conAlfa, // true: usa el alfa por vértice de la geometría
        blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, // aditivo = brilla sobre lo de abajo
        polygonOffset: true,
        polygonOffsetFactor: -3, // un poco más cerca que las telegrafías (-2)
        polygonOffsetUnits: -3,
      }),
    );
  // Cuerpo sólido con luz (púas, dientes, langostas). `brillo` = emisión propia (0 = ninguna).
  /** @param {number} color @param {number} [brillo] */
  const cuerpoMat = (color, brillo = 0) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: brillo,
        flatShading: true, // caras planas, como el resto del arte low-poly
        roughness: 0.85,
      }),
    );
  const filoMat = marcaMat(X.brasaPura, 0.5, true); // filo de la hoz (oro blanco)
  const estelaMat = marcaMat(X.esquirla, 0.6, true, true); // estela con alfa que se apaga hacia la cola
  const clavadoMat = marcaMat(X.costra, 0.5); // surcos de los brazos clavados (Siega)
  const surcoMat = marcaMat(X.costra, 0.42); // surco de la embestida (Hambre)
  const garraMat = marcaMat(X.costra, 0.4); // zarpazos de la carga del Hambre
  const sombraMat = marcaMat(X.costra, 0.35); // sombra de cada semilla en vuelo
  // Silueta de dos tonos (base oscura, punta clara) para espinas, semillas y garfios: se lee sobre el trigal
  // dorado y sobre el rojo de la telegrafía. El color sale de cada vértice (`vertexColors`).
  const bicolorMat = keep(
    new THREE.MeshStandardMaterial({
      color: 0xffffff, // blanco: no tiñe los colores de los vértices
      vertexColors: true,
      flatShading: true,
      roughness: 0.7,
    }),
  );
  const OSCURO = 0x2e1b0e; // corteza quemada
  const CLARO = 0xfff0c2; // grano pálido casi blanco
  const trazoMat = keep(
    new THREE.MeshBasicMaterial({ color: X.brasaPura, toneMapped: false }),
  ); // puntos de la trayectoria (sin luz: siempre claros)
  const craterMat = marcaMat(OSCURO, 0.55); // cráter oscuro en el centro de cada impacto
  const langostaMat = cuerpoMat(0x5c5a2c); // langosta verde oliva oscuro
  const dienteMat = cuerpoMat(0xe8dcc0, 0.05); // quitina marfil
  const briznaMat = marcaMat(0xe7cf8a, 0.8); // paja aspirada (el color se ajusta a la paleta en `sync`)
  briznaMat.polygonOffset = false; // las briznas vuelan: no necesitan empujarse hacia la cámara

  // ─── Geometrías (se crean una vez) ───
  // Franja plana que sale del origen hacia +x: largo 1 y ancho 1; se escala en x (largo) y z (ancho).
  const franjaGeo = keep(
    new THREE.PlaneGeometry(1, 1)
      .rotateX(-Math.PI / 2) // tumbada en el suelo
      .translate(0.5, 0, 0), // empieza en el origen y avanza hacia +x
  );
  // Estela de la siega: abanico de radio 1 entre 0,15 y 1, con el filo en el ángulo 0 y la cola hacia atrás.
  const SEG_ESTELA = 12; // segmentos del abanico (más = curva más lisa)
  const estelaPos = new Float32Array((SEG_ESTELA + 1) * 2 * 3); // 2 vértices (dentro/fuera) por segmento, xyz
  const estelaCol = new Float32Array((SEG_ESTELA + 1) * 2 * 4); // rgba por vértice
  /** @type {number[]} */
  const estelaIdx = [];
  for (let s = 0; s <= SEG_ESTELA; s++) {
    const cola = s / SEG_ESTELA; // 0 = filo, 1 = final de la cola
    for (let k = 0; k < 2; k++) {
      const i = s * 2 + k; // índice del vértice
      estelaCol.set([1, 1, 1, (1 - cola) ** 2], i * 4); // alfa: 1 en el filo, 0 en la cola
    }
    if (s < SEG_ESTELA) {
      const i = s * 2; // dos triángulos por segmento
      estelaIdx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const estelaGeo = keep(new THREE.BufferGeometry());
  estelaGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(estelaPos, 3).setUsage(THREE.DynamicDrawUsage), // se reescribe al crecer
  );
  estelaGeo.setAttribute("color", new THREE.BufferAttribute(estelaCol, 4)); // 4 = rgba (alfa por vértice)
  estelaGeo.setIndex(estelaIdx);
  let estelaAbierta = -1; // ángulo (rad) que cubre ahora la estela; -1 = sin formar
  /** Reescribe el abanico para que cubra `abre` rad detrás del filo. @param {number} abre */
  function formarEstela(abre) {
    if (Math.abs(abre - estelaAbierta) < 1e-3) return; // sin cambios: no se sube nada a la GPU
    estelaAbierta = abre;
    for (let s = 0; s <= SEG_ESTELA; s++) {
      const ang = (-s / SEG_ESTELA) * abre; // la cola queda en ángulos negativos (detrás del filo)
      const c = Math.cos(ang),
        sn = Math.sin(ang);
      const i = s * 6; // 6 números por segmento: interior xyz + exterior xyz
      estelaPos[i] = c * 0.15; // vértice interior a 0,15 del radio (no tapa el cuerpo de Mirra)
      estelaPos[i + 1] = 0;
      estelaPos[i + 2] = sn * 0.15;
      estelaPos[i + 3] = c; // vértice exterior en el borde del arco
      estelaPos[i + 4] = 0;
      estelaPos[i + 5] = sn;
    }
    estelaGeo.attributes.position.needsUpdate = true; // sube los vértices nuevos (la malla no se recorta: frustumCulled = false)
  }
  formarEstela(A.siega.estela);
  /**
   * Pinta una geometría de oscuro (base) a claro (punta) a lo largo de un eje. Se hace una vez al crearla.
   * @param {THREE.BufferGeometry} geo @param {number} eje  0 = x, 1 = y, 2 = z
   */
  function bicolor(geo, eje) {
    const pos = geo.attributes.position;
    geo.computeBoundingBox(); // caja para saber dónde empieza y acaba la pieza
    const caja = /** @type {THREE.Box3} */ (geo.boundingBox);
    const min = caja.min.getComponent(eje),
      largo = Math.max(1e-6, caja.max.getComponent(eje) - min);
    const base = new THREE.Color(OSCURO),
      punta = new THREE.Color(CLARO),
      c = new THREE.Color();
    const col = new Float32Array(pos.count * 3); // rgb por vértice
    for (let i = 0; i < pos.count; i++) {
      const k = (pos.getComponent(i, eje) - min) / largo; // 0 = base, 1 = punta
      c.copy(base).lerp(punta, suave((k - 0.4) / 0.45)); // el cambio de tono va en la mitad superior
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return keep(geo);
  }
  // Espina: cono de 5 lados con la base en el suelo y 1 m de alto (se escala con `alturaPua`).
  const puaGeo = bicolor(
    new THREE.ConeGeometry(A.grano.radioPua, 1, 5).translate(0, 0.5, 0),
    1,
  );
  // Semilla: rombo alargado en z (0,35 × 0,35 × 0,8 m); la punta clara va delante, en el sentido del vuelo.
  const semillaGeo = bicolor(
    new THREE.OctahedronGeometry(0.5, 0).scale(0.7, 0.7, 1.6),
    2,
  );
  const trazoGeo = keep(new THREE.OctahedronGeometry(0.11, 0)); // punto de trayectoria (0,22 m)
  // Garfio de la mandíbula: cono tumbado que sale del origen hacia +x (base oscura, punta clara).
  const garfioGeo = bicolor(
    new THREE.ConeGeometry(0.2, 1, 5)
      .rotateZ(-Math.PI / 2) // la punta pasa de +y a +x
      .translate(0.5, 0, 0), // la base queda en el origen
    0,
  );
  // Caballón: tierra levantada a cada lado de la huella; base en el suelo, sale hacia +x.
  const caballonGeo = keep(
    new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0),
  );
  const langostaGeo = keep(
    new THREE.OctahedronGeometry(0.5, 0).scale(0.84, 0.2, 0.6),
  ); // 0,42 × 0,1 × 0,3 m
  const briznaGeo = keep(new THREE.BoxGeometry(1, 0.05, 0.07)); // brizna larga en x (se estira según la velocidad)
  const dienteGeo = keep(
    new THREE.ConeGeometry(0.32, 1, 5).translate(0, 0.5, 0),
  ); // base en el suelo
  const sombraGeo = keep(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2)); // disco tumbado

  // ─── Mallas ───
  /** Marca plana del pool. @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {number} orden */
  function marca(geo, mat, orden) {
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = orden; // 5–6: encima del relleno de las telegrafías (2–3) y de sus aros (4)
    m.frustumCulled = false; // se mueve cada cuadro: no merece calcular su caja
    m.visible = false;
    raiz.add(m);
    return m;
  }
  /** Pool instanciado: una sola llamada de dibujo para muchas piezas. @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {number} n @param {boolean} sombra */
  function instancias(geo, mat, n, sombra) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // cambia cada cuadro
    m.castShadow = sombra; // solo las piezas grandes proyectan sombra
    m.frustumCulled = false;
    m.count = 0; // cuántas instancias se dibujan; 0 = ninguna
    raiz.add(m);
    return m;
  }
  const filo = marca(franjaGeo, filoMat, 6);
  const filo2 = marca(franjaGeo, filoMat, 6); // segundo filo de la Siega doble («dos afiladas»)
  const estela = marca(estelaGeo, estelaMat, 6);
  const clavados = [
    marca(franjaGeo, clavadoMat, 5),
    marca(franjaGeo, clavadoMat, 5),
  ];
  const garras = [marca(franjaGeo, garraMat, 5), marca(franjaGeo, garraMat, 5)];
  const surco = marca(franjaGeo, surcoMat, 5);
  /** Pieza 3D suelta (garfios, caballones). @param {THREE.BufferGeometry} geo @param {THREE.Material} mat */
  function pieza(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.order = "YXZ"; // inclina (z) y después orienta (y), como las instancias
    m.castShadow = true; // la sombra separa la pieza del suelo vista desde arriba
    m.visible = false;
    raiz.add(m);
    return m;
  }
  const garfios = [pieza(garfioGeo, bicolorMat), pieza(garfioGeo, bicolorMat)];
  const caballonMat = cuerpoMat(0xead39b, 0.08); // tierra clara removida
  const caballones = [
    pieza(caballonGeo, caballonMat),
    pieza(caballonGeo, caballonMat),
  ];
  const NPUA = A.grano.puasPorZona;
  const puas = instancias(puaGeo, bicolorMat, NZ * NPUA, true);
  const crateres = instancias(sombraGeo, craterMat, NZ, false);
  crateres.renderOrder = 5;
  const semillas = instancias(semillaGeo, bicolorMat, NP, true);
  const NT = A.grano.puntos;
  const trazos = instancias(trazoGeo, trazoMat, NP * NT, false);
  const sombras = instancias(sombraGeo, sombraMat, NP, false);
  sombras.renderOrder = 5;
  const NL = A.enjambre.langostas;
  const langostas = instancias(langostaGeo, langostaMat, NL, false);
  const NB = A.banquete.briznas;
  const briznas = instancias(briznaGeo, briznaMat, NB, false);
  const ND = A.banquete.dientes;
  const dientes = instancias(dienteGeo, dienteMat, ND, true);
  const pools = [
    puas,
    crateres,
    semillas,
    trazos,
    sombras,
    langostas,
    briznas,
    dientes,
  ];
  // Halos aditivos (sprites que siempre miran a la cámara).
  /** @param {number} color */
  const halo = (color) => {
    const s = brillos.halo(raiz, color);
    s.visible = false;
    return s;
  };
  const brilloFilo = halo(X.brasaPura); // destello que recorre el filo (afilado)
  const latido = halo(X.veta); // abdomen que se llena (Grano)
  const boca = halo(X.veta); // boca que se carga (Grano y Banquete)
  // La carga del Grano brilla por encima del cuerpo: sin prueba de profundidad el tronco no la tapa.
  for (const s of [latido, boca]) {
    s.material.depthTest = false;
    s.renderOrder = 9; // después de las marcas del suelo (5–6)
  }
  const ojos = halo(X.veta); // mirada que se enciende (Hambre)
  const cascarillas = Array.from({ length: 5 }, () => halo(X.esquirla)); // aturdida tras tropezar
  const saciedad = Array.from({ length: 4 }, () => halo(X.brasaPura)); // letargo del Banquete
  // Piezas sueltas que se apagan al empezar cada cuadro; cada ataque enciende solo las suyas.
  const todos = [
    filo,
    filo2,
    estela,
    ...clavados,
    ...garras,
    surco,
    ...garfios,
    ...caballones,
    brilloFilo,
    latido,
    boca,
    ojos,
    ...cascarillas,
    ...saciedad,
  ];

  // ─── Utilidades sin asignaciones por cuadro ───
  const d = new THREE.Object3D(); // «maniquí» para armar matrices de instancias
  d.rotation.order = "YXZ"; // primero inclina (z) y después orienta (y): así se inclinan hacia fuera o hacia dentro
  const pCabeza = new THREE.Vector3(),
    pAbdomen = new THREE.Vector3(),
    pCopa = new THREE.Vector3(); // posiciones de huesos reutilizadas
  /**
   * Posición mundial de un hueso del GLB; si el modelo no cargó, un punto aproximado delante del cuerpo.
   * @param {Record<string, THREE.Object3D>} huesos @param {string} nombre @param {any} j
   * @param {number} adelante  m hacia donde mira Mirra (negativo = detrás) @param {number} alto  m sobre el suelo
   * @param {THREE.Vector3} out
   */
  function punto(huesos, nombre, j, adelante, alto, out) {
    const h = huesos[nombre];
    if (h) return h.getWorldPosition(out); // sigue la pose del clip
    return out.set(
      j.x + Math.cos(j.face) * adelante, // el modelo mira a +x girado por `face`
      alto,
      j.z + Math.sin(j.face) * adelante,
    );
  }
  /** Mueve `out` `m` metros hacia donde mira Mirra. @param {THREE.Vector3} out @param {any} j @param {number} m */
  function adelantar(out, j, m) {
    out.x += Math.cos(j.face) * m;
    out.z += Math.sin(j.face) * m;
    return out;
  }
  // Retoques sobre la pose del mixer (copa que se sacude, abdomen hinchado). Si el mixer no reescribe el hueso
  // en el cuadro siguiente, se deshace el retoque anterior antes de aplicar el nuevo: nunca se acumula.
  /** @typedef {{ q: THREE.Quaternion, qInv: THREE.Quaternion, qHecha: THREE.Quaternion, s: number, sHecha: THREE.Vector3, giro: boolean, escala: boolean }} Retoque */
  const ejeRetoque = new THREE.Vector3(1, 0, 0); // eje local del hueso para el giro
  /** @returns {Retoque} */
  const crearRetoque = () => ({
    q: new THREE.Quaternion(), // giro aplicado
    qInv: new THREE.Quaternion(), // su inverso, para deshacerlo
    qHecha: new THREE.Quaternion(), // cómo quedó el hueso tras el retoque
    s: 1, // escala aplicada
    sHecha: new THREE.Vector3(1, 1, 1), // escala que quedó tras el retoque
    giro: false,
    escala: false,
  });
  const retCopa = crearRetoque(),
    retAbdomen = crearRetoque();
  /**
   * @param {THREE.Object3D | undefined} hueso @param {Retoque} r
   * @param {number} angulo  rad de giro extra @param {number} escala  multiplicador (1 = sin cambio)
   */
  function retocar(hueso, r, angulo, escala) {
    if (!hueso) return; // sin GLB no hay huesos que retocar
    if (r.giro && hueso.quaternion.equals(r.qHecha))
      hueso.quaternion.multiply(r.qInv); // deshace el giro previo
    if (r.escala && hueso.scale.equals(r.sHecha))
      hueso.scale.multiplyScalar(1 / r.s); // deshace la escala previa
    r.giro = angulo !== 0;
    r.escala = escala !== 1;
    if (r.giro) {
      r.q.setFromAxisAngle(ejeRetoque, angulo);
      r.qInv.copy(r.q).invert();
      hueso.quaternion.multiply(r.q); // se suma encima de la pose del clip
      r.qHecha.copy(hueso.quaternion);
    }
    if (r.escala) {
      r.s = escala;
      hueso.scale.multiplyScalar(escala);
      r.sHecha.copy(hueso.scale);
    }
  }
  /** Primer bloque de un tipo dentro de la acción (bucle simple, sin cierres). @param {any} acc @param {string} tipo */
  function bloqueDe(acc, tipo) {
    for (let i = 0; i < acc.bloques.length; i++)
      if (acc.bloques[i].tipo === tipo) return acc.bloques[i];
    return null;
  }
  /** Zona visible de un ataque (aviso o activa). @param {any} c @param {string} id @param {string} [forma] */
  function zonaDe(c, id, forma) {
    const items = c.zonas.items;
    for (let i = 0; i < items.length; i++) {
      const z = items[i];
      if (!z.activo || z.ataque !== id) continue;
      if (z.etapa !== "aviso" && z.etapa !== "activa") continue; // «espera» aún no se dibuja
      if (forma && z.forma !== forma) continue;
      return z;
    }
    return null;
  }
  /** Coloca una franja: sale de (x,z) con ángulo `ang`, empieza a `desde` m y mide `largo` × `ancho` m. */
  function ponerFranja(
    /** @type {THREE.Mesh} */ m,
    /** @type {number} */ x,
    /** @type {number} */ z,
    /** @type {number} */ ang,
    /** @type {number} */ desde,
    /** @type {number} */ largo,
    /** @type {number} */ ancho,
    /** @type {number} */ y,
  ) {
    m.visible = true;
    m.position.set(x + Math.cos(ang) * desde, y, z + Math.sin(ang) * desde);
    m.rotation.set(0, -ang, 0); // girar -ang en y apunta +x al ángulo `ang` del suelo
    m.scale.set(largo, 1, ancho);
  }

  let reloj = 0; // s propios del render (decorado)
  let combatePrev = /** @type {import('./tipos.js').Combate | null} */ (null);
  let accionPrev = /** @type {any} */ (null); // para detectar el inicio de cada ataque
  let colorPaja = -1; // último color de paja aplicado a las briznas

  // ─── Siega ───
  const siega = {
    t: 9, // s desde el último cuadro de golpe (estela)
    ang: 0, // rad donde quedó el filo
    abre: 0, // rad que cubre la estela
    sentido: 1, // +1 / −1: hacia dónde barre la hoja
    r: 0, // m de radio del arco
    x: 0,
    z: 0,
    fin: 0, // rad del borde final (donde se clavan los brazos)
    paso: -1, // quinto del arco donde se soltó paja por última vez
    clavado: false, // ya se soltó el polvo de los brazos clavados
  };
  /** @param {any} at @param {any} j @param {number} dt @param {any} vfx @param {any} colores @param {boolean} reducido */
  function syncSiega(at, j, dt, vfx, colores, reducido) {
    const es = at && (at.id === "siega" || at.id === "siega_doble");
    const b = es ? at.bloques[0] : null;
    const z = b ? b.zonas[0] : null;
    let golpeando = false;
    if (z) {
      const doble = at.id === "siega_doble";
      const cargando =
        at.etapa === "telegrafia" ||
        (at.etapa === "activo" && b.sub === "entre");
      if (cargando) {
        // Carga: el filo aparece en el borde por donde empezará la hoja y se enciende hasta el golpe.
        const k =
          at.etapa === "telegrafia"
            ? clamp01(at.t / Math.max(0.01, at.T))
            : clamp01(z.progreso);
        const inicio = z.ang - (z.sentido * z.apertura) / 2; // borde de salida de la hoja (franja 0 del barrido)
        ponerFranja(
          filo,
          z.x,
          z.z,
          inicio,
          z.r * 0.12,
          z.r * 0.88,
          A.siega.anchoFilo,
          0.07,
        );
        filoMat.opacity = 0.15 + 0.6 * k; // más brillo = más cerca del golpe
        if (doble) {
          // Dos filos paralelos = dos barridos (ida y vuelta).
          ponerFranja(
            filo2,
            z.x,
            z.z,
            inicio + z.sentido * 0.07,
            z.r * 0.2,
            z.r * 0.8,
            A.siega.anchoFilo * 0.7,
            0.07,
          );
        }
        // Afilado: un destello recorre el filo hacia fuera (una pasada por afilada); reducido = quieto en la punta.
        const pasadas = doble ? 2 : 1;
        const u = reducido ? 1 : 0.15 + 0.85 * frac(k * pasadas * 0.999);
        brilloFilo.visible = true;
        brilloFilo.position.set(
          z.x + Math.cos(inicio) * u * z.r,
          0.35,
          z.z + Math.sin(inicio) * u * z.r,
        );
        brilloFilo.scale.setScalar(0.9 + 0.8 * k); // m de diámetro del destello
        brilloFilo.material.opacity = 0.25 + 0.6 * k;
        siega.paso = -1;
        siega.clavado = false;
      } else if (at.etapa === "activo") {
        // Golpe: el filo está exactamente donde la hoja daña en este paso (misma fórmula que golpearBarrido).
        golpeando = true;
        const f = clamp01(z.progreso); // 0..1 del arco ya barrido
        const ang = z.ang + z.sentido * (f - 0.5) * z.apertura;
        ponerFranja(
          filo,
          z.x,
          z.z,
          ang,
          z.r * 0.12,
          z.r * 0.88,
          A.siega.anchoFilo,
          0.07,
        );
        filoMat.opacity = 0.95;
        siega.t = 0; // la estela está en pleno brillo mientras la hoja barre
        siega.ang = ang;
        siega.sentido = z.sentido;
        siega.r = z.r;
        siega.x = z.x;
        siega.z = z.z;
        siega.abre = Math.min(A.siega.estela, f * z.apertura); // la estela nunca pasa del borde de salida
        siega.fin = z.ang + (z.sentido * z.apertura) / 2;
        // Paja cortada: un puñado por cada quinto del arco que cruza la hoja.
        const paso = Math.floor(f * 4.999);
        if (paso > siega.paso) {
          siega.paso = paso;
          vfx.paja(
            z.x + Math.cos(ang) * z.r * 0.75,
            0.5,
            z.z + Math.sin(ang) * z.r * 0.75,
            reducido ? 1 : 3,
          );
        }
      }
    }
    if (!golpeando) siega.t += dt;
    // Estela: sigue a la hoja y se apaga en `desvanece` s. La malla se espeja cuando la hoja barre al revés.
    const kE = 1 - siega.t / A.siega.desvanece;
    if (kE > 0 && siega.r > 0) {
      formarEstela(siega.abre);
      estela.visible = true;
      estela.position.set(siega.x, 0.075, siega.z);
      estela.rotation.set(0, -siega.ang, 0);
      estela.scale.set(siega.r, 1, siega.r * siega.sentido); // z negativo = espejo (barrido al revés)
      estelaMat.opacity = 0.6 * kE;
    }
    // Brazos clavados: dos surcos al final del barrido durante toda la recuperación (ventana de castigo).
    if (es && at.etapa === "recuperacion") {
      const k = clamp01(at.t / Math.max(0.01, at.recuperacion));
      const ux = Math.cos(siega.fin),
        uz = Math.sin(siega.fin);
      for (let s = 0; s < 2; s++) {
        const lado = s ? 0.55 : -0.55; // m a cada lado de la línea del borde final
        ponerFranja(
          clavados[s],
          j.x - uz * lado,
          j.z + ux * lado,
          siega.fin,
          j.r * 0.9,
          A.siega.surcoLargo,
          0.3,
          0.06,
        );
        if (!siega.clavado)
          vfx.polvo(
            j.x + ux * (j.r + 0.6) - uz * lado,
            j.z + uz * (j.r + 0.6) + ux * lado,
            reducido ? 2 : 4,
            colores.polvo,
            1,
          );
      }
      siega.clavado = true;
      clavadoMat.opacity = 0.5 * (1 - k * k); // se borra al final de la ventana
    }
  }

  // ─── Grano ───
  const grano = { latido: 0, lanzado: false, goteo: 0 };
  const puaEdad = new Float32Array(NZ).fill(-1); // s desde que brotaron las púas de cada zona; −1 = sin púas
  const puaFin = new Float32Array(NZ).fill(-1); // s desde que la zona dejó de dañar; −1 = aún daña
  const puaX = new Float32Array(NZ),
    puaZ = new Float32Array(NZ),
    puaR = new Float32Array(NZ); // centro y radio guardados para hundirlas aunque la zona ya se liberó
  const pBoca = new THREE.Vector3(),
    pAux = new THREE.Vector3(); // boca real y vector auxiliar (m)
  const d2 = new THREE.Object3D(); // segundo maniquí: sombras y cráteres sin pisar la matriz de la semilla
  /**
   * Boca real: punto medio entre las dos mandíbulas, un poco por delante. Sin GLB, delante de la cabeza.
   * @param {Record<string, THREE.Object3D>} huesos @param {any} j @param {THREE.Vector3} out
   */
  function puntoBoca(huesos, j, out) {
    const mi = huesos.mandI,
      md = huesos.mandD;
    if (mi && md) {
      mi.getWorldPosition(out);
      md.getWorldPosition(pAux);
      return adelantar(out.add(pAux).multiplyScalar(0.5), j, 0.35);
    }
    return adelantar(punto(huesos, "cabeza", j, 0.9, 2.3, out), j, 0.7);
  }
  /**
   * Punto del arco de vuelo de una semilla: sale de la boca y cae en su círculo (x1, z1) a 0,3 m del suelo.
   * @param {any} p  proyectil del pool @param {number} t  0..1 del vuelo @param {THREE.Vector3} out
   */
  function arco(p, t, out) {
    const dx = p.x1 - pBoca.x,
      dz = p.z1 - pBoca.z;
    const flecha = A.grano.arco + 0.12 * Math.hypot(dx, dz); // m: los tiros largos suben más
    return out.set(
      pBoca.x + dx * t,
      pBoca.y * (1 - t) + 0.3 * t + 4 * flecha * t * (1 - t), // parábola: 0 en los extremos, máximo en t = 0,5
      pBoca.z + dz * t,
    );
  }
  /**
   * Disco oscuro tumbado en (x, z) con `r` m de radio, en la instancia `i` del pool indicado.
   * @param {number} x @param {number} z @param {number} r @param {number} i @param {THREE.InstancedMesh} [pool]
   */
  function sombraEn(x, z, r, i, pool = sombras) {
    d2.position.set(x, 0.06, z);
    d2.scale.setScalar(Math.max(0.001, r));
    d2.updateMatrix();
    pool.setMatrixAt(i, d2.matrix);
  }
  /** @param {any} c @param {any} at @param {any} j @param {number} dt @param {Record<string, THREE.Object3D>} huesos @param {any} vfx @param {any} colores @param {boolean} reducido @param {boolean} flashes */
  function syncGrano(c, at, j, dt, huesos, vfx, colores, reducido, flashes) {
    const es = at && at.id === "grano";
    const b = es ? bloqueDe(at, "proyectil_arco") : null;
    if (es) puntoBoca(huesos, j, pBoca); // de aquí salen todas las semillas
    const k = es ? clamp01(at.t / Math.max(0.01, at.T)) : 0; // 0..1 de la telegrafía
    // s del aviso en que salen las semillas (el bloque las lanza `vuelo` s antes del golpe)
    const vuelo = b ? b.inicioAviso + b.telegrafia - b.vuelo : 0;
    if (b && at.etapa === "telegrafia") {
      // Abdomen que se llena: brillo que crece sin parpadear. Con flashes y sin movimiento reducido respira
      // despacio (±8 % a `respira` Hz); si no, solo crece.
      const crece = suave(k);
      const respira =
        flashes && !reducido
          ? 0.92 + 0.08 * Math.sin(reloj * TAU * A.grano.respira)
          : 1;
      adelantar(punto(huesos, "abdomen", j, -1, 1.3, pAbdomen), j, -0.5); // centro del abdomen
      latido.visible = true;
      latido.position.copy(pAbdomen);
      latido.scale.setScalar((1.6 + 2 * crece) * respira); // m de diámetro
      latido.material.opacity = 0.15 + 0.55 * crece;
      // Boca: se carga justo antes del vuelo y se apaga al soltar las semillas.
      const kb =
        suave((at.t - (vuelo - 0.4)) / 0.4) * (1 - suave((at.t - vuelo) / 0.3));
      if (kb > 0.01) {
        boca.visible = true;
        boca.position.copy(pBoca);
        boca.scale.setScalar(1 + 1.4 * kb);
        boca.material.opacity = 0.7 * kb;
      }
      if (!grano.lanzado && at.t >= vuelo) {
        grano.lanzado = true; // una sola ráfaga por ataque
        vfx.trozos(
          pBoca.x,
          pBoca.y,
          pBoca.z,
          reducido ? 3 : 8,
          colores.grano,
          0.8,
          0.09,
        );
      }
    } else if (es && at.etapa === "recuperacion") {
      // «Quieta escupiendo»: gotea grano por la boca cada 0,3 s.
      grano.goteo += dt;
      if (grano.goteo >= 0.3) {
        grano.goteo = 0;
        vfx.trozos(
          pBoca.x,
          pBoca.y - 0.2,
          pBoca.z,
          1,
          colores.grano,
          0.35,
          0.06,
        );
      }
    }
    // Semillas, trayectoria y sombras. Cada semilla vive en la boca (t < 0), vuela por un arco que sale de la
    // boca real y cae exactamente en su círculo (x1, z1) cuando el gameplay la da por caída (t = 1).
    const pr = c.proyectiles.items;
    const previa = A.grano.previa; // s
    const revela = b ? suave((at.t - (vuelo - previa)) / previa) : 0; // 0..1 del trazo dibujado
    const px = -Math.sin(j.face),
      pz = Math.cos(j.face); // lateral de Mirra (para abrir el abanico en la boca)
    let ns = 0,
      nt = 0,
      n = 0,
      orden = 0;
    for (let i = 0; i < NP; i++) {
      const p = pr[i];
      if (!es || !p.activo || p.ataque !== "grano") continue;
      if (p.t < 0) {
        // En la boca: abanico de semillas que asoma con la carga (silueta delante de la cabeza).
        const tam = suave((k - 0.15) / 0.5) * A.grano.semilla;
        const lado = (orden++ - 2) * 0.4; // m: −0,8 … +0,8 a los lados de la boca
        d.position.set(
          pBoca.x + px * lado,
          pBoca.y + 0.15,
          pBoca.z + pz * lado,
        );
        const yaw = Math.atan2(Math.cos(j.face), Math.sin(j.face)); // rad: la punta mira hacia delante
        d.rotation.set(0.25, yaw, 0); // 0,25 rad: algo inclinada hacia abajo
        d.scale.setScalar(Math.max(0.001, tam));
      } else {
        arco(p, p.t, d.position);
        // Orientación según la velocidad: yaw en el plano y cabeceo según la pendiente del arco.
        const dx = p.x1 - pBoca.x,
          dz = p.z1 - pBoca.z;
        const flecha = A.grano.arco + 0.12 * Math.hypot(dx, dz);
        const dy = 0.3 - pBoca.y + 4 * flecha * (1 - 2 * p.t);
        d.rotation.set(
          -Math.atan2(dy, Math.hypot(dx, dz)),
          Math.atan2(dx, dz),
          0,
        );
        d.scale.setScalar(A.grano.semilla);
        // Sombra: crece al bajar y marca en el plano dónde va cada semilla.
        const radio = 0.3 + 0.5 * p.t; // m: de 0,3 junto a la boca a 0,8 al caer
        sombraEn(pBoca.x + dx * p.t, pBoca.z + dz * p.t, radio, n++);
      }
      d.updateMatrix();
      semillas.setMatrixAt(ns++, d.matrix);
      // Trayectoria: puntos claros por delante de la semilla, revelados desde la boca hacia el círculo.
      const visto = p.t < 0 ? revela : 1;
      for (let s = 0; s < NT; s++) {
        const u = (s + 1) / (NT + 1); // 0..1 a lo largo del arco
        if (u > visto || u <= p.t + 0.03) continue;
        arco(p, u, d.position);
        d.rotation.set(0, 0, 0);
        d.scale.setScalar(1 + 0.6 * u); // más grandes cerca del suelo, donde la cámara los ve de frente
        d.updateMatrix();
        trazos.setMatrixAt(nt++, d.matrix);
      }
    }
    semillas.count = ns;
    trazos.count = nt;
    sombras.count = n;
    if (ns) semillas.instanceMatrix.needsUpdate = true;
    if (nt) trazos.instanceMatrix.needsUpdate = true;
    if (n) sombras.instanceMatrix.needsUpdate = true;
    // Espinas: brotan en cada círculo del Grano cuando daña y se hunden al terminar; un cráter oscuro marca
    // el centro del impacto.
    const items = c.zonas.items;
    let m = 0,
      nc = 0;
    for (let i = 0; i < NZ; i++) {
      const z = items[i];
      const activa = z.activo && z.ataque === "grano" && z.etapa === "activa";
      if (activa) {
        if (puaEdad[i] < 0 || puaFin[i] >= 0) {
          puaEdad[i] = 0; // brota ahora
          puaFin[i] = -1;
        } else puaEdad[i] += dt;
        puaX[i] = z.x;
        puaZ[i] = z.z;
        puaR[i] = z.r;
      } else if (puaEdad[i] >= 0) {
        puaEdad[i] += dt;
        puaFin[i] = puaFin[i] < 0 ? 0 : puaFin[i] + dt; // empieza o sigue el hundimiento
        if (puaFin[i] > A.grano.hundida) {
          puaEdad[i] = -1; // terminado: libera el hueco
          puaFin[i] = -1;
        }
      }
      if (puaEdad[i] < 0) continue;
      const alto =
        suave(puaEdad[i] / A.grano.subida) *
        (1 - suave(Math.max(0, puaFin[i]) / A.grano.hundida));
      for (let e = 0; e < NPUA; e++) {
        const ang = (e / NPUA) * TAU + hash(i, e) * 0.8; // reparto en círculo con algo de desorden
        // m desde el centro: hasta el 55 % del radio para que la punta inclinada no salga del círculo
        const rr = e === 0 ? 0 : puaR[i] * (0.2 + 0.35 * hash(e, i + 3));
        d.position.set(
          puaX[i] + Math.cos(ang) * rr,
          0,
          puaZ[i] + Math.sin(ang) * rr,
        );
        d.rotation.set(0, -ang, e === 0 ? 0 : -0.2 - 0.25 * hash(i, e + 9)); // abiertas hacia fuera
        // La central es la más alta; el resto entre el 55 % y el 90 %.
        const alzada = e === 0 ? 1 : 0.55 + 0.35 * hash(e, i);
        d.scale.set(1, A.grano.alturaPua * alto * alzada, 1);
        d.updateMatrix();
        puas.setMatrixAt(m++, d.matrix);
      }
      // Cráter: disco oscuro del 60 % del radio que se cierra con las espinas.
      sombraEn(puaX[i], puaZ[i], puaR[i] * 0.6 * alto, nc++, crateres);
    }
    puas.count = m;
    crateres.count = nc;
    if (m) puas.instanceMatrix.needsUpdate = true;
    if (nc) crateres.instanceMatrix.needsUpdate = true;
  }

  // ─── Hambre ───
  const hambre = {
    polvo: 0,
    x: 0,
    z: 0,
    ang: 0,
    largo: 0,
    t: 9,
    tropezo: false,
  };
  const pGarfio = new THREE.Vector3(); // base de los garfios: la boca real (m)
  /**
   * Coloca los dos garfios según la etapa del Hambre. Ángulos en rad; el largo, en fracción de `garfioLargo`.
   * @param {any} at @param {any} j @param {Record<string, THREE.Object3D>} huesos
   */
  function garfiosHambre(at, j, huesos) {
    puntoBoca(huesos, j, pGarfio);
    let abre = 0.1, // rad que se abre cada garfio hacia su lado
      baja = 0.1, // rad que apunta hacia el suelo
      largo = 1; // fracción del largo
    if (at.etapa === "telegrafia") {
      const k = clamp01(at.t / Math.max(0.01, at.T));
      abre = A.hambre.garfioAbre * suave(k * 1.6); // se abren pronto…
      baja = 0.2 + 0.55 * suave(k); // …y bajan hasta rozar el suelo al final de la carga
      largo = 0.5 + 0.5 * suave(k * 1.4); // asoman desde la boca
    } else if (at.etapa === "recuperacion") {
      const r = clamp01(at.t / Math.max(0.01, at.recuperacion));
      abre = 0.1 + 0.2 * r;
      baja = at.tropezo ? 0.8 : 0.1 + 0.2 * r; // tras tropezar, cuelgan
      largo = 1 - 0.5 * suave(r); // se recogen
    }
    const px = -Math.sin(j.face),
      pz = Math.cos(j.face); // lateral de Mirra
    for (let s = 0; s < 2; s++) {
      const lado = s ? 1 : -1;
      const g = garfios[s];
      g.visible = true;
      g.position.set(
        pGarfio.x + px * lado * 0.45, // m a cada lado de la boca
        Math.max(0.8, pGarfio.y - 0.2),
        pGarfio.z + pz * lado * 0.45,
      );
      g.rotation.set(0, -(j.face + lado * abre), -baja); // −baja: la punta mira al suelo
      g.scale.set(A.hambre.garfioLargo * largo, 1.2, 1.2); // 1,2 = 0,48 m de grosor en la base
    }
  }
  /** @param {any} at @param {any} j @param {number} dt @param {Record<string, THREE.Object3D>} huesos @param {any} vfx @param {any} colores @param {boolean} reducido */
  function syncHambre(at, j, dt, huesos, vfx, colores, reducido) {
    const es = at && at.id === "hambre";
    const b = es ? bloqueDe(at, "carga") : null;
    const zona = b?.zonas[0];
    if (zona && at.etapa === "telegrafia") {
      // Carga: dos zarpazos raspan el suelo hacia la línea y crecen hasta el golpe.
      const k = clamp01(at.t / Math.max(0.01, at.T));
      const ux = Math.cos(zona.ang),
        uz = Math.sin(zona.ang);
      const base = Math.min(j.r * 0.7, zona.largo); // m desde el centro: nacen bajo las mandíbulas
      const punta = Math.min(
        zona.largo,
        base + 0.3 + A.hambre.garraLargo * suave(k),
      ); // m: una cobertura puede acortar la zona
      for (let s = 0; s < 2; s++) {
        const lado = s ? 0.6 : -0.6; // m a cada lado del eje de la carga
        ponerFranja(
          garras[s],
          zona.x - uz * lado,
          zona.z + ux * lado,
          zona.ang,
          base,
          punta - base,
          0.4, // m: zarpazo ancho, legible a 960 × 720
          0.06,
        );
      }
      garraMat.opacity = 0.35 + 0.35 * k;
      hambre.polvo += dt;
      if (hambre.polvo >= A.hambre.polvoCada * (reducido ? 2 : 1)) {
        hambre.polvo = 0;
        const origen = Math.min(punta, zona.largo - 0.2); // deja 0,2 m para la dispersión inicial del polvo
        vfx.polvo(
          zona.x + ux * origen,
          zona.z + uz * origen,
          2,
          colores.polvo,
          0.9,
        );
      }
      // Mirada: los ojos se encienden con la carga.
      adelantar(punto(huesos, "cabeza", j, 0.9, 2.6, pCabeza), j, 0.4);
      ojos.visible = true;
      ojos.position.copy(pCabeza);
      ojos.scale.setScalar(1.2 + 0.8 * k);
      ojos.material.opacity = 0.15 + 0.6 * k;
      hambre.tropezo = false;
    } else if (b && at.etapa === "activo") {
      // Embestida: el surco crece desde la salida hasta el cuerpo; lo que queda atrás ya es seguro.
      hambre.x = b.sx; // punto de salida de la carga
      hambre.z = b.sz;
      hambre.ang = b.dir;
      hambre.largo = Math.max(0, b.recorrido); // m ya recorridos
      hambre.t = 0;
    }
    if (!(b && at.etapa === "activo")) hambre.t += dt;
    // Garfios: dos mandíbulas de quitina (base oscura, punta clara) que asoman delante del cuerpo solo durante
    // el Hambre real. Carga: se abren y bajan a raspar; embestida: se cierran hacia delante; recuperación:
    // vuelven despacio (si tropieza, cuelgan).
    if (b) garfiosHambre(at, j, huesos);
    const kS = 1 - hambre.t / A.hambre.surcoDura; // 1 = recién hecho, 0 = borrado
    if (kS > 0 && hambre.largo > 0.05) {
      // Huella ancha: franja oscura desde la salida hasta debajo del cuerpo, con dos caballones claros de tierra
      // levantada a los lados (dentro del ancho de la línea de daño). Se hunden mientras se borra.
      ponerFranja(
        surco,
        hambre.x,
        hambre.z,
        hambre.ang,
        0,
        hambre.largo,
        A.hambre.surcoAncho,
        0.055,
      );
      surcoMat.opacity = 0.6 * kS;
      const ux = Math.cos(hambre.ang),
        uz = Math.sin(hambre.ang);
      for (let s = 0; s < 2; s++) {
        const lado = (s ? 1 : -1) * (A.hambre.surcoAncho / 2 + 0.2); // m desde el eje
        const cab = caballones[s];
        cab.visible = true;
        cab.position.set(hambre.x - uz * lado, 0, hambre.z + ux * lado);
        cab.rotation.set(0, -hambre.ang, 0);
        const alto = Math.max(0.001, A.hambre.caballon * kS); // m: se hunde al borrarse
        cab.scale.set(hambre.largo, alto, 0.4); // 0,4 m de ancho
      }
      // Tierra que salta por los lados mientras embiste (cada `polvoCada` s, el doble con reducido).
      if (hambre.t === 0) {
        hambre.polvo += dt;
        if (hambre.polvo >= A.hambre.polvoCada * (reducido ? 2 : 1) * 0.5) {
          hambre.polvo = 0;
          for (let s = -1; s <= 1; s += 2)
            vfx.polvo(
              j.x - uz * s * (A.hambre.surcoAncho / 2 + 0.2),
              j.z + ux * s * (A.hambre.surcoAncho / 2 + 0.2),
              2,
              colores.polvo,
              1.1,
            );
        }
      }
    }
    // Tropiezo: cascarillas que giran sobre la cabeza durante la ventana de castigo.
    const tropieza = es && at.etapa === "recuperacion" && at.tropezo;
    if (tropieza) {
      punto(huesos, "cabeza", j, 0.9, 2.6, pCabeza);
      if (!hambre.tropezo)
        vfx.paja(pCabeza.x, pCabeza.y, pCabeza.z, reducido ? 4 : 10); // se le cae el grano al cortarse
      for (let i = 0; i < cascarillas.length; i++) {
        const ang = (i / cascarillas.length) * TAU + (reducido ? 0 : reloj * 3); // reducido = corona quieta
        const s = cascarillas[i];
        s.visible = true;
        s.position.set(
          pCabeza.x + Math.cos(ang) * 0.75,
          pCabeza.y + 1,
          pCabeza.z + Math.sin(ang) * 0.75,
        );
        s.scale.setScalar(0.35);
        s.material.opacity = 0.85;
      }
    }
    hambre.tropezo = tropieza;
  }

  // ─── Enjambre ───
  const enj = { vivo: false, forma: 0, dispersa: -1, x: 0, z: 0, r: 0 };
  /** @param {any} c @param {any} at @param {any} j @param {number} dt @param {Record<string, THREE.Object3D>} huesos @param {boolean} reducido */
  function syncEnjambre(c, at, j, dt, huesos, reducido) {
    // La copa se sacude durante la carga (amplitud en rad que crece con la telegrafía); reducido = quieta.
    const carga = at && at.id === "enjambre" && at.etapa === "telegrafia";
    const sacude =
      carga && !reducido
        ? 0.09 * clamp01(at.t / Math.max(0.01, at.T)) * Math.sin(reloj * 31)
        : 0;
    retocar(huesos.copa, retCopa, sacude, 1);
    const z = zonaDe(c, "enjambre");
    if (z) {
      enj.vivo = true;
      enj.forma = z.etapa === "activa" ? 1 : clamp01(z.progreso); // 0..1: cuánto se ha formado la nube
      enj.dispersa = -1;
      enj.x = z.x;
      enj.z = z.z;
      enj.r = z.r;
    } else if (enj.vivo) {
      enj.dispersa = enj.dispersa < 0 ? 0 : enj.dispersa + dt; // la nube se deshace
      if (enj.dispersa > A.enjambre.dispersa) enj.vivo = false;
    }
    if (!enj.vivo) {
      langostas.count = 0;
      return;
    }
    punto(huesos, "copa", j, 0, 3.4, pCopa); // de aquí salen las langostas
    const n = reducido ? Math.ceil(NL * 0.6) : NL;
    const kD = enj.dispersa < 0 ? 0 : enj.dispersa / A.enjambre.dispersa; // 0..1 de la dispersión
    for (let i = 0; i < n; i++) {
      const ang0 = hash(i, 1) * TAU; // ángulo inicial en la nube
      const rad = Math.sqrt(hash(i, 2)) * 0.85; // fracción del radio (raíz = reparto uniforme en el disco)
      const vel =
        (0.7 + hash(i, 4) * 0.9) *
        (hash(i, 5) < 0.5 ? -1 : 1) *
        (reducido ? 0.35 : 1); // rad/s
      const ang = ang0 + reloj * vel;
      const e = suave((enj.forma - hash(i, 6) * 0.5) / 0.5); // cada una sale de la copa con su retraso
      let x = enj.x + Math.cos(ang) * rad * enj.r;
      let y =
        0.45 +
        hash(i, 3) * A.enjambre.alto +
        (reducido ? 0 : Math.sin(reloj * 3 + i) * 0.15);
      let zz = enj.z + Math.sin(ang) * rad * enj.r;
      x = pCopa.x + (x - pCopa.x) * e; // vuela de la copa a su sitio en la nube
      y = pCopa.y + (y - pCopa.y) * e;
      zz = pCopa.z + (zz - pCopa.z) * e;
      let s = e > 0.001 ? 1 : 0; // escondida hasta que despega
      if (kD > 0) {
        x += Math.cos(ang0) * kD * 5; // se abre 5 m hacia fuera
        zz += Math.sin(ang0) * kD * 5;
        y += kD * 2.5; // y sube 2,5 m
        s *= 1 - kD;
      }
      d.position.set(x, y, zz);
      d.rotation.set(0, -(ang + Math.sign(vel) * Math.PI * 0.5), 0); // mira en la dirección en que vuela
      const alas = reducido
        ? 0.8
        : 0.4 + 0.6 * Math.abs(Math.sin(reloj * 40 + i * 1.7)); // aleteo
      d.scale.set(s, s, s * alas);
      d.updateMatrix();
      langostas.setMatrixAt(i, d.matrix);
    }
    langostas.count = n;
    langostas.instanceMatrix.needsUpdate = true;
  }

  // ─── Banquete ───
  const banq = { vivo: false, sube: 0, mordida: -1, x: 0, z: 0, r: 0 };
  /** @param {any} c @param {any} at @param {any} j @param {number} dt @param {Record<string, THREE.Object3D>} huesos @param {any} vfx @param {any} colores @param {boolean} reducido */
  function syncBanquete(c, at, j, dt, huesos, vfx, colores, reducido) {
    const es = at && at.id === "banquete";
    const tiron = es ? bloqueDe(at, "tiron_radial") : null;
    // 1) Aspiración: briznas que fluyen en espiral hacia la boca mientras dura el tirón.
    if (tiron && tiron.tirando && at.etapa === "telegrafia") {
      if (colores.paja !== colorPaja) {
        colorPaja = colores.paja; // la paja sigue la paleta de la fase
        briznaMat.color.setHex(colorPaja);
      }
      const entra = suave(at.t / 0.35); // aparecen en 0,35 s
      const n = reducido ? NB >> 1 : NB; // `>> 1` = mitad entera
      const giro = reducido ? 0 : 0.9; // rad de espiral por recorrido
      const r0 = j.r * 0.8; // m: llegan al borde del cuerpo
      for (let i = 0; i < n; i++) {
        const s = frac(reloj / A.banquete.periodo + hash(i, 1)); // 0 = sale, 1 = llega a la boca
        const desde = j.r + 2 + hash(i, 2) * A.banquete.alcance; // m desde el centro de Mirra
        const rr = r0 + (desde - r0) * (1 - s) ** 1.7; // acelera al acercarse
        const ang = hash(i, 3) * TAU + giro * s;
        d.position.set(
          j.x + Math.cos(ang) * rr,
          0.12 + 0.5 * s * s,
          j.z + Math.sin(ang) * rr,
        );
        d.rotation.set(0, -ang, 0); // la brizna apunta hacia el centro
        d.scale.set((0.35 + 1.1 * s) * entra, entra, entra); // se estira con la velocidad
        d.updateMatrix();
        briznas.setMatrixAt(i, d.matrix);
      }
      briznas.count = n;
      briznas.instanceMatrix.needsUpdate = true;
      const k = clamp01(at.t / Math.max(0.01, at.T));
      adelantar(punto(huesos, "cabeza", j, 0.9, 2.4, pCabeza), j, 0.7);
      boca.visible = true;
      boca.position.copy(pCabeza);
      boca.scale.setScalar(1 + 1.4 * k);
      boca.material.opacity = 0.2 + 0.45 * k;
    } else briznas.count = 0;
    // 2) Dientes: salen del borde de la mordida durante su aviso y se cierran hacia dentro al golpear.
    const z = zonaDe(c, "banquete", "circulo");
    if (z) {
      banq.vivo = true;
      banq.x = z.x;
      banq.z = z.z;
      banq.r = z.r;
      if (z.etapa === "activa") {
        if (banq.mordida < 0) {
          banq.mordida = 0; // primer cuadro del golpe: polvo en el borde
          const golpes = reducido ? 4 : 8;
          for (let i = 0; i < golpes; i++) {
            const a = (i / golpes) * TAU;
            vfx.polvo(
              z.x + Math.cos(a) * z.r,
              z.z + Math.sin(a) * z.r,
              3,
              colores.polvo,
              1.2,
            );
          }
        } else banq.mordida += dt;
      } else {
        banq.mordida = -1;
        banq.sube = clamp01(z.progreso); // 0..1 del aviso de la mordida
      }
    } else if (banq.vivo) {
      if (banq.mordida < 0)
        banq.vivo = false; // cancelado antes de morder: los dientes no muerden en falso
      else banq.mordida += dt;
    }
    let nd = 0;
    if (banq.vivo) {
      let alto, inclina; // alto 0..1; inclinación en rad (negativa = hacia fuera)
      if (banq.mordida < 0) {
        alto = suave(banq.sube);
        inclina = -0.35 * alto; // abiertos hacia fuera mientras avisa
      } else {
        const m = banq.mordida;
        inclina = -0.35 + 0.95 * suave(m / 0.08); // cierre en 0,08 s
        alto = 1 - suave((m - 0.25) / 0.45); // se hunden después
        if (m > 0.7) banq.vivo = false;
      }
      for (let k = 0; k < ND; k++) {
        const ang = (k / ND) * TAU + 0.2;
        const rr = banq.r * 0.97; // justo dentro del borde del área
        d.position.set(
          banq.x + Math.cos(ang) * rr,
          0,
          banq.z + Math.sin(ang) * rr,
        );
        d.rotation.set(0, -ang, inclina);
        d.scale.set(
          1,
          A.banquete.alturaDiente * alto * (0.8 + 0.4 * hash(k, 9)),
          1,
        );
        d.updateMatrix();
        dientes.setMatrixAt(nd++, d.matrix);
      }
    }
    dientes.count = nd;
    if (nd) dientes.instanceMatrix.needsUpdate = true;
    // 3) Letargo: abdomen hinchado que respira despacio y motas que suben (ventana del corte fuerte).
    const letargo = es && at.etapa === "recuperacion";
    const hincha = letargo
      ? reducido
        ? 1.18
        : 1.16 + 0.06 * Math.sin(reloj * 1.7)
      : 1;
    retocar(huesos.abdomen, retAbdomen, 0, hincha);
    if (letargo) {
      adelantar(punto(huesos, "cabeza", j, 0.9, 2.6, pCabeza), j, 0.3);
      const entra = suave(at.t / 0.3);
      for (let i = 0; i < saciedad.length; i++) {
        const f = frac(reloj * 0.4 + i / saciedad.length); // 0..1 del recorrido de cada mota
        const vaiven = reducido ? 0 : Math.sin(reloj * 1.3 + i * 2) * 0.25; // m de balanceo lateral
        const s = saciedad[i];
        s.visible = true;
        s.position.set(
          pCabeza.x + vaiven,
          pCabeza.y + 0.4 + f * 1.6,
          pCabeza.z + vaiven * 0.5,
        );
        s.scale.setScalar(0.3 + 0.25 * f);
        s.material.opacity = 0.7 * (1 - f) * entra;
      }
    }
  }

  /** Borra las colas de efectos del intento anterior. @param {Record<string, THREE.Object3D>} huesos */
  function reiniciar(huesos) {
    reloj = 0; // s: las oscilaciones del intento nuevo empiezan desde cero
    accionPrev = null;
    siega.r = siega.fin = 0; // sin arco anterior ni borde final para los brazos
    siega.paso = -1;
    siega.clavado = false;
    grano.latido = 0;
    puaEdad.fill(-1); // −1 = no hay púas ni hundimientos pendientes
    puaFin.fill(-1);
    hambre.largo = 0; // m: no queda surco del recorrido anterior
    hambre.tropezo = false;
    enj.vivo = banq.vivo = false; // corta la dispersión de langostas y el cierre de los dientes
    banq.mordida = -1;
    for (const m of pools) m.count = 0; // conserva los búferes, deja de dibujar sus instancias
    retocar(huesos.copa, retCopa, 0, 1); // vuelve a la pose del mixer
    retocar(huesos.abdomen, retAbdomen, 0, 1);
  }

  return {
    /**
     * Llamar después de `mirra.sync` (los retoques de huesos van encima de la pose del mixer).
     * @param {import('./tipos.js').Combate} c
     * @param {number} dt  s de animación (ya frenados por el hit-stop)
     * @param {Record<string, THREE.Object3D>} huesos  huesos del GLB de Mirra (vacío si no cargó)
     * @param {ReturnType<typeof import('./vfx.js').crearVfx>} vfx
     * @param {{ polvo: number, grano: number, paja: number }} colores
     * @param {boolean} reducido  movimiento reducido activo
     * @param {boolean} [flashes]  destellos y pulsos permitidos (false = brillos que solo crecen)
     */
    sync(c, dt, huesos, vfx, colores, reducido, flashes = !reducido) {
      const j = c.jefe;
      const enPelea = j.vivo && c.estado === "pelea";
      // Reintentar reutiliza la escena. Las estelas y disipaciones solo duran dentro del mismo combate.
      if (combatePrev && (combatePrev !== c || !enPelea)) reiniciar(huesos);
      combatePrev = enPelea ? c : null;
      raiz.visible = enPelea;
      if (!enPelea) return;
      reloj += dt;
      for (let i = 0; i < todos.length; i++) todos[i].visible = false; // cada parte enciende lo suyo
      const acc = j.accion;
      const at = acc && acc.tipo === "ataque" ? acc : null; // solo ataques (no transición, burla…)
      if (at !== accionPrev) {
        grano.lanzado = false; // ataque nuevo: se reinician las ráfagas de una sola vez
        grano.goteo = 0;
        hambre.polvo = 0;
        accionPrev = at;
      }
      syncSiega(at, j, dt, vfx, colores, reducido);
      syncGrano(c, at, j, dt, huesos, vfx, colores, reducido, flashes);
      syncHambre(at, j, dt, huesos, vfx, colores, reducido);
      syncEnjambre(c, at, j, dt, huesos, reducido);
      syncBanquete(c, at, j, dt, huesos, vfx, colores, reducido);
    },
    dispose() {
      for (const m of pools) m.dispose(); // búferes de instancias
      scene.remove(raiz);
    },
  };
}
