// Tres juegos de figuras reutilizables. El reloj y el tamaño de cada objetivo vienen del paso fijo.
import * as THREE from "three";

/** @typedef {import("../gameplay/tipos.js").DesafioFarolero} Encuentro */
/** @param {{scene: THREE.Scene, keep: import("./tipos.js").Keep, decalMat: import("./tipos.js").DecalMat}} args */
export function crearSenalesFarolero({ scene, keep, decalMat }) {
  const escenario = new THREE.Group();
  scene.add(escenario);
  const turquesa = 0x62efdf,
    coral = 0xff825f,
    oro = 0xffcf6f,
    tenue = 0x968a79;
  const aroGeo = keep(new THREE.RingGeometry(0.935, 1, 72)).rotateX(
    -Math.PI / 2,
  );
  const discoGeo = keep(new THREE.CircleGeometry(1, 72)).rotateX(-Math.PI / 2);
  const joyaGeo = keep(new THREE.OctahedronGeometry());
  const suelaGeo = keep(new THREE.CircleGeometry(1, 16)).rotateX(-Math.PI / 2);
  const eslabonGeo = keep(new THREE.TorusGeometry(1, 0.15, 5, 24)).rotateX(
    -Math.PI / 2,
  );
  // El perfil de la campana se ensancha hacia el labio. Todas comparten la misma malla.
  const campanaGeo = keep(
    new THREE.LatheGeometry(
      [
        [0, 0.5],
        [0.12, 0.46],
        [0.23, 0.36],
        [0.26, 0.13],
        [0.39, -0.12],
        [0.41, -0.17],
        [0.32, -0.16],
        [0, -0.04],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      24,
    ),
  );
  const metal = keep(
    new THREE.MeshStandardMaterial({
      color: oro,
      metalness: 0.4,
      roughness: 0.48,
      emissive: 0xb86c25,
      emissiveIntensity: 0.32,
    }),
  );
  const cristal = keep(
    new THREE.MeshStandardMaterial({
      color: turquesa,
      emissive: 0x218c80,
      emissiveIntensity: 0.8,
      roughness: 0.24,
      flatShading: true,
    }),
  );
  const veta = keep(
    new THREE.MeshBasicMaterial({ color: 0xe4fff1, wireframe: true }),
  );
  const prisma = new THREE.Group();
  const gema = new THREE.Mesh(joyaGeo, cristal);
  gema.scale.set(0.43, 0.64, 0.43);
  const jaula = new THREE.Mesh(joyaGeo, veta);
  jaula.scale.set(0.53, 0.71, 0.53);
  prisma.add(gema, jaula);

  // Las cifras dan el orden incluso al jugar en escala de grises.
  /** @param {number} numero */
  function cifra(numero) {
    const lienzo = document.createElement("canvas");
    lienzo.width = lienzo.height = 96;
    const pincel = lienzo.getContext("2d");
    if (pincel) {
      pincel.fillStyle = "#382b30";
      pincel.beginPath();
      pincel.arc(48, 48, 41, 0, 2 * Math.PI);
      pincel.fill();
      pincel.strokeStyle = "#ffe0a0";
      pincel.lineWidth = 4;
      pincel.stroke();
      pincel.fillStyle = "#fff2d6";
      pincel.font = "bold 56px system-ui";
      pincel.textAlign = "center";
      pincel.textBaseline = "middle";
      pincel.fillText(String(numero), 48, 49);
    }
    const mapa = keep(new THREE.CanvasTexture(lienzo));
    mapa.colorSpace = THREE.SRGBColorSpace;
    const etiqueta = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map: mapa,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    );
    etiqueta.scale.setScalar(0.82);
    etiqueta.position.y = 1.32;
    return etiqueta;
  }

  // La corona exterior marca el radio exacto. El arco interior se va consumiendo.
  const marcas = Array.from({ length: 3 }, (_, i) => {
    const grupo = new THREE.Group();
    const suelo = new THREE.Group();
    escenario.add(grupo);
    grupo.add(suelo);
    const trazo = decalMat(oro, 1),
      fondo = decalMat(oro, 0.15);
    const base = new THREE.Mesh(discoGeo, fondo);
    const borde = new THREE.Mesh(aroGeo, trazo);
    const relojGeo = keep(aroGeo.clone());
    const reloj = new THREE.Mesh(relojGeo, trazo);
    reloj.scale.setScalar(0.84);
    base.position.y = 0.018;
    borde.position.y = 0.031;
    reloj.position.y = 0.039;
    suelo.add(base, borde, reloj);

    const huellas = new THREE.Group();
    for (const lado of [-1, 1]) {
      // Cada bota lleva puntera y talón separados para verse incluso bajo el personaje.
      const pie = new THREE.Group();
      pie.position.set(lado * 0.18, 0.05, lado * 0.1);
      pie.rotation.y = lado * 0.22;
      for (const [z, largo] of [
        [-0.12, 0.17],
        [0.14, 0.08],
      ]) {
        const suela = new THREE.Mesh(suelaGeo, trazo);
        suela.scale.set(0.115, 1, largo);
        suela.position.z = z;
        pie.add(suela);
      }
      huellas.add(pie);
    }
    suelo.add(huellas);
    const campana = new THREE.Group();
    const casco = new THREE.Mesh(campanaGeo, metal),
      badajo = new THREE.Mesh(joyaGeo, metal);
    badajo.scale.set(0.11, 0.16, 0.11);
    badajo.position.y = -0.18;
    campana.add(casco, badajo);
    campana.position.y = 0.54;
    const etiqueta = cifra(i + 1);
    grupo.add(campana, etiqueta);
    return {
      grupo,
      suelo,
      borde,
      reloj,
      relojGeo,
      trazo,
      fondo,
      huellas,
      campana,
      etiqueta,
    };
  });
  marcas[0].grupo.add(prisma);
  const eslabones = new THREE.Group();
  for (const lado of [-1, 1]) {
    const anilla = new THREE.Mesh(eslabonGeo, marcas[0].trazo);
    anilla.position.set(lado * 0.58, 0.06, 0);
    anilla.scale.set(0.34, 0.12, 0.14);
    eslabones.add(anilla);
    // Las dos estaciones muestran un ejemplo de dónde pararse a cada lado del cristal.
    const sitio = new THREE.Mesh(aroGeo, marcas[0].trazo);
    sitio.scale.setScalar(0.56);
    sitio.position.set(lado * 2.15, 0.04, 0);
    const pisadas = marcas[0].huellas.clone();
    pisadas.position.x = sitio.position.x;
    pisadas.scale.setScalar(1.3);
    eslabones.add(sitio, pisadas);
  }
  marcas[0].suelo.add(eslabones);

  // Dos líneas en el suelo unen las campanas. La siguiente suena y queda enmarcada.
  const guiaGeo = keep(new THREE.PlaneGeometry(1, 1)).rotateX(-Math.PI / 2);
  const guias = Array.from({ length: 2 }, () => {
    const guia = new THREE.Mesh(guiaGeo, decalMat(oro, 0.4));
    escenario.add(guia);
    return guia;
  });
  const rebote = new THREE.Mesh(
    joyaGeo,
    keep(new THREE.MeshBasicMaterial({ color: 0xffedab })),
  );
  rebote.scale.setScalar(0.24);
  escenario.add(rebote);

  /** @param {Encuentro} f @param {boolean} visible @param {number} t @param {boolean} quieto
   * @param {{x: number, z: number}} jefe @param {boolean} enPareja */
  function sync(f, visible, t, quieto, jefe, enPareja) {
    escenario.visible = visible;
    if (!visible) return;
    const ecos = f.tipo === "ecos",
      esPrisma = f.tipo === "prisma",
      sonCampanas = f.tipo === "campanas";
    const acierto = f.etapa === "acierto",
      fallo = f.etapa === "fallo",
      resuelto = acierto || fallo;
    const fraccion = Math.max(0, Math.min(1, f.restante / f.duracion));
    const onda = quieto ? 0 : Math.sin(t * 3.5);
    prisma.visible = esPrisma;
    eslabones.visible = esPrisma && enPareja;
    prisma.position.y = 0.73 + 0.08 * onda;
    prisma.rotation.y = quieto ? 0.35 : t * 0.85;
    for (let i = 0; i < marcas.length; i++) {
      const v = marcas[i],
        m = f.marcas[i];
      v.grupo.visible = Boolean(m);
      if (!m) continue;
      const activa = !sonCampanas || i === f.paso;
      const tocada = sonCampanas && i < f.paso;
      v.grupo.position.set(m.x, 0, m.z);
      v.suelo.scale.set(m.r, 1, m.r);
      const tono = acierto
        ? 0xa5ffd4
        : fallo
          ? coral
          : ecos
            ? coral
            : esPrisma
              ? turquesa
              : activa
                ? oro
                : tenue;
      v.trazo.color.setHex(tono);
      v.fondo.color.setHex(tono);
      v.trazo.opacity = activa || resuelto ? 1 : 0.38;
      v.fondo.opacity = ecos
        ? 0.18 + (1 - fraccion) * 0.18
        : activa
          ? 0.19
          : 0.07;
      v.reloj.visible = activa && f.etapa === "reto";
      // RingGeometry genera dos triángulos (seis índices) por segmento.
      v.relojGeo.setDrawRange(0, Math.ceil(fraccion * 72) * 6);
      v.huellas.visible = ecos || (esPrisma && !enPareja);
      v.campana.visible = v.etiqueta.visible = sonCampanas;
      v.campana.position.y = tocada ? 0.24 : 0.54;
      v.campana.rotation.z = activa && !quieto ? onda * 0.2 : 0;
      v.etiqueta.scale.setScalar(activa ? 0.94 : 0.72);
      v.etiqueta.material.opacity = tocada ? 0.44 : 1;
    }
    for (let i = 0; i < guias.length; i++) {
      const guia = guias[i],
        a = f.marcas[i],
        b = f.marcas[i + 1];
      guia.visible = sonCampanas && Boolean(a && b) && !resuelto;
      if (!guia.visible) continue;
      const dx = b.x - a.x,
        dz = b.z - a.z,
        largo = Math.hypot(dx, dz);
      // Recorta los extremos para que la guía no tape los números ni el reloj.
      const corrimiento = (a.r - b.r) / (2 * (largo || 1));
      guia.position.set(
        (a.x + b.x) / 2 + dx * corrimiento,
        0.025,
        (a.z + b.z) / 2 + dz * corrimiento,
      );
      guia.rotation.y = -Math.atan2(dz, dx);
      guia.scale.set(Math.max(0, largo - a.r - b.r), 1, 0.09);
      guia.material.opacity = i < f.paso ? 0.15 : 0.4;
    }
    // El acierto devuelve visiblemente la energía de la última marca al pecho del guardián.
    const origen = f.marcas[f.marcas.length - 1];
    rebote.visible = acierto && !!origen && !quieto && fraccion > 0.06;
    if (rebote.visible) {
      const k = 1 - fraccion;
      rebote.position.set(
        origen.x + (jefe.x - origen.x) * k,
        0.7 + 1.4 * k + Math.sin(k * Math.PI),
        origen.z + (jefe.z - origen.z) * k,
      );
    }
  }
  return { sync };
}
