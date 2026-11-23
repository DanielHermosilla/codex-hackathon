// Señales de arena de Mirra. La simulación determina posición y tiempo de cada marca.
import * as THREE from "three";

/** @param {{ scene: THREE.Scene, keep: import('./tipos.js').Keep, brillos: ReturnType<typeof import('./brillos.js').crearBrillos> }} args */
export function crearArenaMirraVisual({ scene, keep, brillos }) {
  const raiz = new THREE.Group();
  scene.add(raiz);
  /** @param {number} color */
  const colorPlano = (color) =>
    keep(new THREE.MeshBasicMaterial({ color, fog: false }));
  const amatista = colorPlano(0xce78ff),
    negro = colorPlano(0x160c28);
  const oro = colorPlano(0xffe9a0);
  const disco = keep(new THREE.CircleGeometry(1, 80).rotateX(-Math.PI / 2));
  const aro = keep(new THREE.TorusGeometry(1, 0.035, 6, 64));
  /** @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {THREE.Object3D} padre */
  function pieza(geo, mat, padre) {
    const mesh = new THREE.Mesh(geo, mat);
    padre.add(mesh);
    return mesh;
  }
  // Ilumina el suelo y los cuerpos cercanos. Sin sombras extra para mantener el coste bajo.
  const luzLocal = new THREE.PointLight(0xae50ff, 0, 11);
  raiz.add(luzLocal);
  const orbe = new THREE.Group();
  raiz.add(orbe);
  pieza(keep(new THREE.IcosahedronGeometry(0.43, 1)), negro, orbe);
  const haloOrbe = brillos.halo(orbe, 0xbc61ff);
  haloOrbe.scale.setScalar(2.6);
  const satelites = Array.from({ length: 7 }, () =>
    brillos.halo(orbe, 0xdfa5ff),
  );
  const corona = pieza(aro, amatista, orbe);
  corona.scale.setScalar(0.57);
  const corona2 = pieza(aro, amatista, orbe);
  corona2.scale.setScalar(0.52);
  corona2.rotation.x = 1.25;
  const marca = brillos.aro(raiz, 0xc572ff);
  marca.malla.scale.setScalar(2.4);

  const pilar = new THREE.Group();
  raiz.add(pilar);
  const columna = pieza(
    keep(new THREE.CylinderGeometry(0.57, 1, 2.4, 6)),
    negro,
    pilar,
  );
  columna.position.y = 1.2;
  const gema = pieza(keep(new THREE.OctahedronGeometry(0.55)), amatista, pilar);
  gema.position.y = 2.8;
  const haloPilar = brillos.halo(pilar, 0xbc61ff);
  haloPilar.position.y = 2.8;
  haloPilar.scale.setScalar(2.7);
  for (const y of [0.25, 1.75]) {
    const runa = pieza(aro, amatista, pilar);
    runa.rotation.x = Math.PI / 2;
    runa.scale.setScalar(1 - y * 0.16);
    runa.position.y = y;
  }
  const onda = brillos.aro(raiz, 0xdb8aff);
  const eco = brillos.aro(raiz, 0x8d48ff);
  // Espirales dentro del mismo disco que delimita el daño. El color se desvanece en el borde.
  const vacio = keep(
    new THREE.ShaderMaterial({
      uniforms: { tiempo: { value: 0 } },
      vertexShader: `
      varying vec2 local;
      void main() {
        local = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader: `
      uniform float tiempo;
      varying vec2 local;
      void main() {
        float r = length(local);
        float a = atan(local.y, local.x + 0.0001);
        float giros = 0.5 + 0.5 * sin(4.0 * a - r * 17.0 + tiempo * 1.5);
        float corriente = smoothstep(0.54, 0.98, giros) * smoothstep(0.08, 0.45, r);
        float borde = smoothstep(0.65, 1.0, r);
        vec3 color = vec3(0.009, 0.003, 0.022);
        color += vec3(0.32, 0.075, 0.53) * (corriente * 0.27 + borde * 0.72);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
    }),
  );
  /** @type {THREE.Group[]} */
  const pozos = [];

  // El claro se ilumina hasta el borde. Cada píxel comprueba si un obstáculo corta
  // el segmento hacia la fuente. Así la sombra se ensancha detrás de cada pilar.
  const maxCoberturas = 16;
  const u = {
    foco: { value: new THREE.Vector2() },
    piedras: {
      value: Array.from({ length: maxCoberturas }, () => new THREE.Vector3()),
    },
    cantidad: { value: 0 },
    fuerza: { value: 0 },
    tiempo: { value: 0 },
  };
  const luzMat = keep(
    new THREE.ShaderMaterial({
      uniforms: u,
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec2 punto;
    void main() { vec4 p = modelMatrix * vec4(position,1.0); punto = p.xz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `uniform vec2 foco; uniform vec3 piedras[16]; uniform int cantidad;
    uniform float fuerza, tiempo; varying vec2 punto;
    void main() {
      vec2 rayo = punto - foco;
      float distancia2 = max(dot(rayo,rayo),0.0001);
      float seguro = 0.0;
      for(int i=0;i<16;i++){
        if(i>=cantidad) break;
        vec3 p = piedras[i];
        float t = clamp(dot(p.xy-foco,rayo)/distancia2,0.0,1.0);
        float d = distance(foco+t*rayo,p.xy);
        seguro = max(seguro,1.0-smoothstep(p.z-0.04,p.z+0.04,d));
      }
      float onda = 0.5 + 0.5*cos(length(rayo)*1.7-tiempo*3.0);
      float rayos = 0.5 + 0.5*cos(atan(rayo.y,rayo.x+0.0001)*34.0+tiempo*0.5);
      float cerca = 1.0 / (1.0 + length(rayo)*0.085);
      vec3 luz = mix(vec3(1.0,0.59,0.19),vec3(1.0,0.9,0.63),cerca);
      gl_FragColor = vec4(mix(luz,vec3(0.07,0.12,0.25),seguro),
                            mix(fuerza + cerca*(0.05*onda+0.035*rayos),fuerza*0.62,seguro));
      #include <colorspace_fragment>
    }`,
    }),
  );
  const claro = pieza(disco, luzMat, raiz);
  claro.position.y = 0.052;
  claro.renderOrder = 1;
  const sol = pieza(keep(new THREE.OctahedronGeometry(0.8)), oro, raiz);

  const haloSol = brillos.halo(raiz, 0xffc96d);
  haloSol.scale.setScalar(6);
  return {
    /** @param {import('./tipos.js').Mundo} w @param {import('./tipos.js').Combate} c @param {boolean} flashes */
    sync(w, c, flashes) {
      const a = c.arenaMirra;
      raiz.visible = Boolean(a);
      if (!a) return;
      luzLocal.intensity = 0;
      const pelea = c.estado === "pelea";
      orbe.visible = marca.malla.visible = pelea && !!a.orbe;
      vacio.uniforms.tiempo.value = w.time;
      if (pelea && a.orbe) {
        const { x, z, y, t } = a.orbe;
        const carga = Math.min(1, t / 4.5);
        orbe.position.set(x, y + 0.11 * Math.sin(t * 3) * (1 - carga), z);
        orbe.rotation.set(0.8, t * 1.65, t * 0.7);
        haloOrbe.material.opacity = 0.48 + carga * 0.24;
        for (const [i, chispa] of satelites.entries()) {
          const ang = t * 2.3 + i * 2.4;
          const r = 0.7 + 0.16 * Math.sin(t * 2 + i);
          chispa.position.set(
            r * Math.cos(ang),
            0.33 * Math.sin(ang + i),
            r * Math.sin(ang),
          );
          chispa.scale.setScalar(0.19);
          chispa.material.opacity = 0.68;
        }
        marca.malla.position.set(x, 0.1, z);
        marca.u.opacidad.value = 0.42 + 0.48 * carga;
        luzLocal.color.setHex(0xb56aff);
        luzLocal.position.set(x, y + 0.55, z);
        luzLocal.intensity = 4 + 4 * carga;
      }
      pilar.visible = pelea && !!a.pilar;
      if (a.pilar) {
        pilar.position.set(a.pilar.x, 0, a.pilar.z);
        pilar.scale.set(a.pilar.r, 1, a.pilar.r);
        gema.rotation.y = w.time * 1.7;
        gema.position.y = 2.8 + Math.sin(w.time * 3.2) * 0.13;
        haloPilar.position.y = gema.position.y;
        haloPilar.material.opacity = a.mecha ? 0.72 : 0.52;
      }
      onda.malla.visible = eco.malla.visible = pelea && !!a.explosion;
      if (pelea && a.explosion) {
        const { x, z, t } = a.explosion;
        const k = Math.min(1, t / 0.6);
        onda.malla.position.set(x, 0.18, z);
        eco.malla.position.set(x, 0.16, z);
        onda.malla.scale.setScalar(0.5 + k * w.arenaRadius * 1.7);
        eco.malla.scale.setScalar(0.3 + k * w.arenaRadius * 1.2);
        onda.u.opacidad.value = (flashes ? 1 : 0.6) * (1 - k) ** 2;
        eco.u.opacidad.value = 0.5 * (1 - k);
        luzLocal.color.setHex(0xd58cff);
        luzLocal.position.set(x, 2, z);
        luzLocal.intensity = (flashes ? 23 : 9) * (1 - k) ** 2;
      }
      for (let i = 0; i < Math.max(pozos.length, a.huecos.length); i++) {
        let pozo = pozos[i];
        if (!pozo) {
          pozo = new THREE.Group();
          pieza(disco, vacio, pozo);
          const borde = brillos.aro(pozo, 0xbd58f5);
          borde.malla.position.y = 0.014;
          borde.u.opacidad.value = 0.76;
          raiz.add(pozo);
          pozos.push(pozo);
        }
        const h = a.huecos[i];
        pozo.visible = !!h;
        if (h) {
          pozo.position.set(h.x, 0.085, h.z);
          pozo.scale.setScalar(h.r);
        }
      }
      haloSol.visible = sol.visible = claro.visible = pelea && !!a.luz;
      if (pelea && a.luz) {
        const l = a.luz;
        sol.position.set(l.x, 2.5 + Math.sin(l.t * 2) * 0.18, l.z);
        sol.rotation.set(l.t * 0.42, l.t * 1.45, l.t * 0.6);
        haloSol.position.copy(sol.position);
        claro.scale.setScalar(w.arenaRadius);
        u.foco.value.set(l.x, l.z);
        u.tiempo.value = l.t;
        const carga = Math.min(1, l.t / 2.5);
        const salida = Math.min(1, 4 * l.t);
        const impacto = Math.max(0, 1 - (l.t - 2.5) / 0.45);
        u.fuerza.value = l.impacto
          ? impacto * (flashes ? 0.54 : 0.37)
          : salida * (0.17 + 0.16 * carga);
        haloSol.material.opacity = l.impacto
          ? 0.78 * impacto
          : 0.36 + 0.25 * carga;
        luzLocal.color.setHex(0xffc275);
        luzLocal.position.copy(sol.position);
        luzLocal.intensity = 10 * haloSol.material.opacity;
        let n = 0;
        for (const p of w.pillars) {
          if (p.id === "pilar-void" || n === maxCoberturas) continue;
          u.piedras.value[n++].set(p.x, p.z, p.r);
        }
        u.cantidad.value = n;
      }
    },
  };
}
