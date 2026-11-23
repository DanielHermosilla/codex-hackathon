import * as THREE from "three";
import { BRASEROS, PISOTON } from "../gameplay/ritos.js";

/**
 * @param {THREE.Scene} scene
 * @param {import('./tipos.js').Keep} keep
 * @param {ReturnType<typeof import('./brillos.js').crearBrillos>} brillos
 */
export function crearVistaRitos(scene, keep, brillos) {
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
  const cuenta = brillos.aro(marca, 0xffb15c);
  cuenta.malla.position.y = 0.1;
  const onda = brillos.aro(raiz, 0xffc070);
  const luz = new THREE.PointLight(0xffa95e, 0, 7);
  raiz.add(luz);
  let golpe = 1;
  let pisotonPrevio = false;
  // Dos huellas dentro de la marca distinguen el refugio compartido.
  for (const lado of [-1, 1]) {
    const huella = anillo(0.35, marfil, marca);
    huella.position.x = lado * 0.46;
  }
  const hierro = keep(
    new THREE.MeshStandardMaterial({
      color: 0x423434,
      metalness: 0.55,
      roughness: 0.5,
    }),
  );
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
    const halo = brillos.halo(base, BRASEROS.colores[i]);
    halo.position.y = 0.83;
    const brasas = Array.from({ length: 5 }, () =>
      brillos.halo(base, BRASEROS.colores[i]),
    );
    return { base, llama, halo, brasas };
  });
  const tiros = [0, 1].map(() => {
    const tiro = new THREE.Mesh(formas[0], tintes[0]);
    raiz.add(tiro);
    tiro.visible = false;
    const halo = brillos.halo(tiro, 0xffffff);
    halo.scale.setScalar(2.5);
    const estela = Array.from({ length: 6 }, () =>
      brillos.halo(raiz, 0xffffff),
    );
    return { tiro, halo, estela };
  });
  /**
   * @param {import('../gameplay/ritos.js').Ritos | null | undefined} r
   * @param {number} dt
   * @param {boolean} flashes
   * @param {{ x: number, z: number }} jefe
   */
  return function sync(r, dt, flashes, jefe) {
    const pisoton = r?.tipo === "pisoton";
    if (pisotonPrevio && !pisoton && r && r.tiempo <= 1e-8) {
      golpe = 0;
      onda.malla.position.set(jefe.x, 0.13, jefe.z);
    }
    pisotonPrevio = pisoton;
    golpe = r ? Math.min(1, golpe + dt / 0.68) : 1;
    raiz.visible = Boolean(r?.tipo) || golpe < 1;
    luz.intensity = 0;
    onda.malla.visible = golpe < 1;
    onda.malla.scale.setScalar(0.5 + 7 * (1 - (1 - golpe) ** 2));
    onda.u.opacidad.value = (flashes ? 0.7 : 0.42) * (1 - golpe) ** 2;
    if (!r) return;
    marca.visible = pisoton;
    if (pisoton) {
      marca.position.set(r.x, 0, r.z);
      const restante = r.tiempo / PISOTON.aviso;
      cuenta.malla.scale.setScalar(PISOTON.radio * Math.max(0.06, restante));
      cuenta.u.opacidad.value = 0.56 + 0.35 * (1 - restante);
      luz.color.setHex(0xffb879);
      luz.position.set(r.x, 1.1, r.z);
      luz.intensity = 1.5 + 3 * (1 - restante);
    }
    const mostrando = r.tipo === "braseros";
    for (const [i, { base, llama, halo, brasas }] of fuegos.entries()) {
      const f = r.braseros[i];
      base.visible = mostrando;
      base.position.set(f.x, 0, f.z);
      const elegido = r.escudo.color === f.color && r.escudo.restante > 0;
      llama.visible = r.escudo.color < 0 || elegido;
      const tiempo = BRASEROS.viaje - r.tiempo;
      llama.rotation.y = tiempo * 2.1;
      llama.position.y = 0.88 + 0.12 * Math.sin(tiempo * 5 + i);
      llama.scale.setScalar(elegido ? 1.25 : 0.88);
      halo.visible = llama.visible;
      halo.material.opacity = elegido ? 0.68 : 0.38;
      halo.scale.setScalar(elegido ? 2.7 : 1.8);
      for (const [k, brasa] of brasas.entries()) {
        const edad = (tiempo * 0.9 + k / brasas.length) % 1;
        const ang = k * 2.4 + tiempo * 1.6;
        brasa.visible = llama.visible;
        brasa.position.set(
          Math.cos(ang) * edad * 0.5,
          0.8 + edad * 1.15,
          Math.sin(ang) * edad * 0.5,
        );
        brasa.material.opacity = 0.8 * (1 - edad);
        brasa.scale.setScalar(0.18 * (1 - edad * 0.6));
      }
      if (mostrando && elegido) {
        luz.color.setHex(BRASEROS.colores[i]);
        luz.position.set(f.x, 1.5, f.z);
        luz.intensity = elegido ? 7 : 4;
      }
    }
    for (const [i, { tiro, halo, estela }] of tiros.entries()) {
      const t = r.tiros[i];
      const visibleAntes = tiro.visible;
      tiro.visible = mostrando && t.activo;
      for (const chispa of estela) chispa.visible = tiro.visible;
      if (!tiro.visible) continue;
      const color = BRASEROS.colores[r.colorObjetivo];
      tiro.material = tintes[r.colorObjetivo];
      tiro.geometry = formas[r.colorObjetivo];
      tiro.position.set(t.x, 0.96 + 0.12 * Math.sin(r.tiempo * 5), t.z);
      tiro.rotation.y = r.tiempo * 3;
      halo.material.color.setHex(color);
      halo.material.opacity = 0.6;
      // Cada tramo sigue al anterior con retardo para que la estela dibuje las curvas.
      let anterior = tiro.position;
      for (const [k, chispa] of estela.entries()) {
        if (visibleAntes)
          chispa.position.lerp(anterior, 1 - Math.exp(-38 * dt));
        else chispa.position.copy(anterior);
        chispa.material.color.setHex(color);
        chispa.material.opacity = 0.48 * (1 - k / estela.length);
        chispa.scale.setScalar(0.85 - k * 0.095);
        anterior = chispa.position;
      }
    }
  };
}
