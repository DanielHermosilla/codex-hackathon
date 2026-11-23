import * as THREE from "three";
import { BRASEROS, PISOTON } from "../gameplay/ritos.js";

/** @param {THREE.Scene} scene @param {import('./tipos.js').Keep} keep */
export function crearVistaRitos(scene, keep) {
  const raiz = new THREE.Group();
  scene.add(raiz);
  /** @param {number} color */
  const pintura = (color) =>
    keep(new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  const marfil = pintura(0xffecaa);
  /** @param {THREE.BufferGeometry} forma @param {THREE.Material} material @param {THREE.Group} padre */
  function malla(forma, material, padre) {
    const mesh = new THREE.Mesh(keep(forma), material);
    padre.add(mesh);
    return mesh;
  }
  /** @param {number} radio @param {THREE.Material} material @param {THREE.Group} padre */
  function anillo(radio, material, padre) {
    const aro = malla(
      new THREE.RingGeometry(radio - 0.1, radio, 48),
      material,
      padre,
    );
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.09;
    return aro;
  }
  const marca = new THREE.Group();
  raiz.add(marca);
  anillo(PISOTON.radio, marfil, marca);
  const cuenta = anillo(PISOTON.radio, pintura(0xff984b), marca);
  // Dos huellas dentro de la marca distinguen el refugio compartido.
  for (const lado of [-1, 1]) {
    const huella = anillo(0.35, marfil, marca);
    huella.position.x = lado * 0.46;
  }
  const hierro = pintura(0x574c50);
  const tintes = BRASEROS.colores.map(pintura);
  // La silueta del fuego se repite en ambos proyectiles como pista adicional al color.
  const formas = [
    keep(new THREE.OctahedronGeometry(0.42)),
    keep(new THREE.SphereGeometry(0.38, 12, 8)),
    keep(new THREE.ConeGeometry(0.42, 0.85, 4)),
  ];
  const fuegos = tintes.map((tinte, i) => {
    const base = new THREE.Group();
    raiz.add(base);
    anillo(BRASEROS.radio, tinte, base);
    const copa = malla(
      new THREE.CylinderGeometry(0.47, 0.24, 0.48, 8),
      hierro,
      base,
    );
    copa.position.y = 0.26;
    const llama = new THREE.Mesh(formas[i], tinte);
    base.add(llama);
    llama.position.y = 0.78;
    return { base, llama };
  });
  const tiros = [0, 1].map(() => {
    const tiro = new THREE.Mesh(formas[0], tintes[0]);
    raiz.add(tiro);
    return tiro;
  });
  raiz.visible = false;
  /** @param {import('../gameplay/ritos.js').Ritos | null | undefined} r */
  return function sync(r) {
    raiz.visible = !!r?.tipo;
    if (!r?.tipo) return;
    marca.visible = r.tipo === "pisoton";
    if (marca.visible) {
      marca.position.set(r.x, 0, r.z);
      cuenta.scale.setScalar(Math.max(0.08, r.tiempo / PISOTON.aviso));
    }
    const mostrando = r.tipo === "braseros";
    for (const [i, { base, llama }] of fuegos.entries()) {
      const f = r.braseros[i];
      base.visible = mostrando;
      base.position.set(f.x, 0, f.z);
      const elegido = r.escudo.color === f.color && r.escudo.restante > 0;
      llama.visible = r.escudo.color < 0 || elegido;
      llama.scale.setScalar(
        elegido ? 1.5 + r.escudo.restante / BRASEROS.ventana : 0.88,
      );
    }
    for (const [i, tiro] of tiros.entries()) {
      const t = r.tiros[i];
      tiro.visible = mostrando && t.activo;
      if (!tiro.visible) continue;
      tiro.material = tintes[r.colorObjetivo];
      tiro.geometry = formas[r.colorObjetivo];
      tiro.position.set(t.x, 0.92, t.z);
      tiro.rotation.y = r.tiempo * 3;
    }
  };
}
