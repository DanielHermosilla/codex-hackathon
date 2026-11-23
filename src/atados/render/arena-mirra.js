// Señales de arena de Mirra. La simulación determina posición y tiempo de cada marca.
import * as THREE from "three";

/** @param {{ scene: THREE.Scene, keep: import('./tipos.js').Keep }} args */
export function crearArenaMirraVisual({ scene, keep }) {
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
  const orbe = new THREE.Group();
  raiz.add(orbe);
  pieza(keep(new THREE.IcosahedronGeometry(0.43, 1)), negro, orbe);
  const corona = pieza(aro, amatista, orbe);
  corona.scale.setScalar(0.57);
  const corona2 = pieza(aro, amatista, orbe);
  corona2.scale.setScalar(0.52);
  corona2.rotation.x = 1.25;
  const marca = pieza(aro, amatista, raiz);
  marca.rotation.x = Math.PI / 2;
  marca.scale.setScalar(2.4);

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
  for (const y of [0.25, 1.75]) {
    const runa = pieza(aro, amatista, pilar);
    runa.rotation.x = Math.PI / 2;
    runa.scale.setScalar(1 - y * 0.16);
    runa.position.y = y;
  }
  const onda = pieza(aro, amatista, raiz);
  onda.rotation.x = Math.PI / 2;
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
      float onda = 0.5 + 0.5*cos(length(rayo)*2.4-tiempo*5.0);
      gl_FragColor = vec4(mix(vec3(1.0,0.74,0.28),vec3(0.07,0.12,0.25),seguro),
                            mix(fuerza+0.08*onda,0.67,seguro));
      #include <colorspace_fragment>
    }`,
    }),
  );
  const claro = pieza(disco, luzMat, raiz);
  claro.position.y = 0.052;
  claro.renderOrder = 1;
  const sol = pieza(keep(new THREE.OctahedronGeometry(0.8)), oro, raiz);

  return {
    /** @param {import('./tipos.js').Mundo} w @param {import('./tipos.js').Combate} c */
    sync(w, c) {
      const a = c.arenaMirra;
      raiz.visible = Boolean(a);
      if (!a) return;
      orbe.visible = marca.visible = !!a.orbe;
      if (a.orbe) {
        const { x, z, y, t } = a.orbe;
        orbe.position.set(x, y, z);
        orbe.rotation.set(0.8, t * 2, t);
        marca.position.set(x, 0.1, z);
      }
      pilar.visible = !!a.pilar;
      if (a.pilar) {
        pilar.position.set(a.pilar.x, 0, a.pilar.z);
        pilar.scale.set(a.pilar.r, 1, a.pilar.r);
        gema.rotation.y = w.time;
      }
      onda.visible = !!a.explosion;
      if (a.explosion) {
        onda.position.set(a.explosion.x, 0.18, a.explosion.z);
        onda.scale.setScalar(0.2 + a.explosion.t * w.arenaRadius * 3);
      }
      for (let i = 0; i < Math.max(pozos.length, a.huecos.length); i++) {
        let pozo = pozos[i];
        if (!pozo) {
          pozo = new THREE.Group();
          pieza(disco, negro, pozo);
          const borde = pieza(aro, amatista, pozo);
          borde.rotation.x = Math.PI / 2;
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
      sol.visible = claro.visible = !!a.luz;
      if (a.luz) {
        const l = a.luz;
        sol.position.set(l.x, 2.5, l.z);
        sol.rotation.y = l.t;
        claro.scale.setScalar(w.arenaRadius);
        u.foco.value.set(l.x, l.z);
        u.tiempo.value = l.t;
        u.fuerza.value = l.impacto
          ? 0.68
          : 0.18 + 0.12 * Math.min(1, l.t / 2.5);
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
