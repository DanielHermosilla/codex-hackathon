// Títere de la ventanilla. Frente = +Z; las medidas son metros locales del furgón.
import * as THREE from "three";

/** @param {import("./tipos.js").Keep} keep */
export function crearVendedor(keep) {
  const cuerpo = new THREE.Group();
  cuerpo.name = "vendedor-completos";
  const ovalo = keep(new THREE.SphereGeometry(1, 12, 8));

  /** @param {number} color @param {THREE.Texture | null} [map] */
  const paño = (color, map = null) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        map,
        roughness: 0.92,
        flatShading: true,
      }),
    );
  const rojo = paño(0xb81932);
  const mejillas = paño(0xcf2337);
  const labio = paño(0xa91630);
  const boca = paño(0x4a121c);
  const fieltro = paño(0xe6ac36);
  const nariz = paño(0xf7a13c);
  const blanco = paño(0xfff4dd);
  const oscuro = paño(0x211d22);
  const bolsillo = paño(0xc7bba8);

  // Una textura de 64 filas envuelve el tejido. Cada ocho filas alternan crudo y carbón.
  // La misma textura sigue el largo de cada manga.
  const rayas = new Uint8Array(64 * 4);
  for (let fila = 0; fila < 64; fila++) {
    const clara = fila % 8 < 4;
    rayas.set(clara ? [213, 203, 186, 255] : [43, 39, 44, 255], fila * 4);
  }
  const mapa = keep(new THREE.DataTexture(rayas, 1, 64));
  mapa.colorSpace = THREE.SRGBColorSpace; // Los bytes de la paleta son colores de pantalla.
  mapa.generateMipmaps = true; // Suaviza las rayas cuando el carro ocupa pocos píxeles.
  mapa.minFilter = THREE.LinearMipmapLinearFilter;
  mapa.magFilter = THREE.LinearFilter;
  mapa.needsUpdate = true;
  const tejido = paño(0xffffff, mapa);

  /** @param {THREE.Object3D} padre @param {THREE.Material} material
   * @param {number} x @param {number} y @param {number} z
   * @param {number} ancho @param {number} alto @param {number} fondo */
  function elipse(padre, material, x, y, z, ancho, alto, fondo) {
    const malla = new THREE.Mesh(ovalo, material);
    malla.position.set(x, y, z);
    malla.scale.set(ancho, alto, fondo); // Radios en X, Y y Z, en metros.
    padre.add(malla);
    return malla;
  }

  // El cuerpo termina debajo del mesón. El cilindro se ensancha hacia los hombros.
  const torso = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.22, 0.17, 0.41, 12)),
    tejido,
  );
  torso.position.y = 0.18;
  torso.scale.z = 0.72;
  cuerpo.add(torso);
  elipse(cuerpo, oscuro, 0, 0.38, 0, 0.154, 0.036, 0.132);
  elipse(cuerpo, bolsillo, -0.078, 0.228, 0.142, 0.07, 0.065, 0.017);
  elipse(cuerpo, oscuro, -0.078, 0.219, 0.158, 0.024, 0.022, 0.007);
  elipse(cuerpo, oscuro, -0.089, 0.24, 0.158, 0.009, 0.023, 0.006).rotation.z =
    0.18;
  elipse(cuerpo, oscuro, -0.072, 0.24, 0.158, 0.007, 0.019, 0.006).rotation.z =
    -0.14;

  // Los hombros son pivotes. En reposo los brazos bajan hasta apoyar las manos en el mesón.
  const manga = keep(new THREE.CapsuleGeometry(0.061, 0.246, 4, 8));
  /** @param {number} lado */
  function brazo(lado) {
    const hombro = new THREE.Group();
    hombro.position.set(lado * 0.182, 0.313, 0.065);
    hombro.rotation.set(-0.8, 0, lado * 0.42);
    const tela = new THREE.Mesh(manga, tejido);
    tela.position.y = -0.136;
    hombro.add(tela);
    elipse(hombro, rojo, 0, -0.312, 0, 0.065, 0.092, 0.053);
    elipse(hombro, rojo, -lado * 0.047, -0.294, 0.028, 0.034, 0.044, 0.027);
    cuerpo.add(hombro);
    return hombro;
  }
  const saludo = brazo(-1);
  saludo.name = "saludo-vendedor";
  brazo(1);

  const cabeza = new THREE.Group();
  cabeza.name = "cabeza-vendedor";
  cabeza.position.set(0, 0.36, 0.035); // Gira desde el cuello.
  const inclinacionReposo = -0.38; // Radianes. Eleva la mirada hacia el encuadre 3/4.
  cabeza.rotation.x = inclinacionReposo;
  cuerpo.add(cabeza);
  elipse(cabeza, rojo, 0, 0.213, 0, 0.264, 0.272, 0.212);
  elipse(cabeza, labio, 0, 0.086, 0.091, 0.212, 0.127, 0.177);
  elipse(cabeza, boca, 0, 0.121, 0.152, 0.214, 0.076, 0.144);
  elipse(cabeza, fieltro, 0, 0.083, 0.23, 0.176, 0.042, 0.09);
  elipse(cabeza, mejillas, 0, 0.248, 0.106, 0.264, 0.153, 0.217).rotation.x =
    0.24;
  elipse(cabeza, nariz, 0.012, 0.193, 0.319, 0.058, 0.042, 0.043);

  // Ojos pequeños y levemente disparejos, encima del hocico largo de paño.
  const ojoIzq = elipse(
    cabeza,
    blanco,
    -0.102,
    0.345,
    0.209,
    0.057,
    0.051,
    0.024,
  );
  ojoIzq.rotation.set(-0.49, -0.25, 0.18);
  const ojoDer = elipse(cabeza, blanco, 0.094, 0.35, 0.213, 0.05, 0.047, 0.024);
  ojoDer.rotation.set(-0.42, 0.2, -0.12);
  elipse(cabeza, oscuro, -0.093, 0.345, 0.232, 0.027, 0.029, 0.014);
  elipse(cabeza, oscuro, 0.087, 0.348, 0.236, 0.026, 0.027, 0.013);

  // Las orejas nacen juntas y se abren en V. Las puntas y sus inclinaciones son asimétricas.
  const orejaAlta = elipse(
    cabeza,
    rojo,
    -0.124,
    0.64,
    0.09,
    0.079,
    0.325,
    0.088,
  );
  orejaAlta.rotation.set(0.16, 0.08, 0.22);
  const orejaCorta = elipse(
    cabeza,
    mejillas,
    0.141,
    0.625,
    0.094,
    0.078,
    0.29,
    0.084,
  );
  orejaCorta.rotation.set(0.09, -0.13, -0.37);

  const duracionSaludo = 0.76; // Segundos desde que llega el primer cliente.
  let pasoSaludo = duracionSaludo;
  let atendiendo = false;
  let atencion = 0;

  return {
    cuerpo,
    /** @param {number} dt segundos del cuadro @param {boolean} cerca @param {boolean} animar */
    sync(dt, cerca, animar) {
      if (!animar) {
        pasoSaludo = duracionSaludo;
        atencion = 0;
        atendiendo = false;
      } else if (dt > 0) {
        if (cerca && !atendiendo) pasoSaludo = 0;
        pasoSaludo = Math.min(duracionSaludo, pasoSaludo + dt);
        atencion = THREE.MathUtils.damp(atencion, cerca ? 1 : 0, 8, dt);
        atendiendo = cerca;
      }

      // Una campana breve levanta la mano. La cabeza queda atenta mientras haya clientes.
      const progreso = pasoSaludo / duracionSaludo;
      const gesto = ((1 - Math.cos(2 * Math.PI * progreso)) / 2) * atencion;
      const reboteOrejas = gesto * Math.sin(progreso * Math.PI * 3);
      cabeza.rotation.x = inclinacionReposo + 0.08 * atencion + 0.13 * gesto;
      cabeza.rotation.y = -0.14 * atencion;
      orejaAlta.rotation.z = 0.22 + 0.095 * reboteOrejas;
      orejaCorta.rotation.z = -0.37 - 0.075 * reboteOrejas;
      saludo.rotation.x = -0.8 - 1.22 * gesto;
      saludo.rotation.z = -0.42 - 0.28 * gesto;
    },
  };
}
