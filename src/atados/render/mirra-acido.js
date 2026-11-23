import * as THREE from "three";

/** @param {THREE.Group} raiz @param {import('./tipos.js').Keep} keep @param {number} alturaArco */
export function crearAcidoMirra(raiz, keep, alturaArco) {
  const anilloGeo = keep(new THREE.RingGeometry(0.94, 1, 80)).rotateX(
    -Math.PI / 2,
  );
  const franjaGeo = keep(new THREE.PlaneGeometry(1, 1)).rotateX(-Math.PI / 2);
  const esfera = keep(new THREE.SphereGeometry(1, 12, 8));
  const acido = 0xc6f547,
    listo = 0x64ffcc,
    peligro = 0xff8053;
  /** @param {number} color @param {number} [opacity] */
  const tinta = (color, opacity = 1) =>
    keep(
      new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: opacity < 1,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
  /** @param {THREE.Object3D} grupo @param {THREE.BufferGeometry} geo @param {THREE.Material} material */
  function pieza(grupo, geo, material) {
    const m = new THREE.Mesh(geo, material);
    grupo.add(m);
    return m;
  }
  // Insignias de alto contraste: el barril y el portador también se distinguen detrás del trigo alto.
  /** @param {"barril"|"gota"|"acierto"} signo */
  function insignia(signo) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 80;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#20271d";
      ctx.lineWidth = 4;
      ctx.strokeStyle =
        signo === "barril"
          ? "#ffcf7e"
          : signo === "acierto"
            ? "#64ffcc"
            : "#d9f876";
      ctx.beginPath();
      ctx.arc(40, 35, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(34, 62);
      ctx.lineTo(46, 62);
      ctx.lineTo(40, 72);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.beginPath();
      if (signo === "gota") {
        ctx.moveTo(40, 17);
        ctx.bezierCurveTo(37, 26, 27, 32, 28, 40);
        ctx.bezierCurveTo(31, 56, 53, 54, 52, 39);
        ctx.bezierCurveTo(52, 32, 43, 23, 40, 17);
        ctx.fill();
      } else if (signo === "acierto") {
        ctx.moveTo(26, 35);
        ctx.lineTo(36, 44);
        ctx.lineTo(53, 25);
        ctx.stroke();
      } else {
        ctx.moveTo(29, 24);
        ctx.quadraticCurveTo(24, 35, 29, 47);
        ctx.lineTo(50, 47);
        ctx.quadraticCurveTo(54, 34, 50, 24);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(29, 30);
        ctx.lineTo(50, 30);
        ctx.moveTo(29, 42);
        ctx.lineTo(50, 42);
        ctx.moveTo(40, 23);
        ctx.quadraticCurveTo(42, 14, 47, 17);
        ctx.stroke();
      }
    }
    const map = keep(new THREE.CanvasTexture(canvas));
    map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        }),
      ),
    );
    m.renderOrder = 8;
    raiz.add(m);
    m.scale.setScalar(1.35);
    return m;
  }
  const marcado = insignia("gota"),
    destino = insignia("barril"),
    exito = insignia("acierto");
  const miraMat = tinta(acido);
  const mira = pieza(raiz, anilloGeo, miraMat);
  const cargaGeo = keep(anilloGeo.clone());
  const carga = pieza(raiz, cargaGeo, miraMat);
  // Una cruz aparece cuando Mirra ha fijado el blanco: el círculo ya se puede abandonar.
  const blancoFijo = new THREE.Group();
  raiz.add(blancoFijo);
  const fuegoFijo = tinta(peligro);
  for (const giro of [-Math.PI / 4, Math.PI / 4]) {
    const brazo = pieza(blancoFijo, franjaGeo, fuegoFijo);
    brazo.scale.set(0.86, 1, 0.12);
    brazo.rotation.y = giro;
  }
  const guiaMat = tinta(0xffd081, 0.8);
  const enlace = pieza(raiz, franjaGeo, guiaMat);
  // El barril tiene duelas abombadas, zunchos de hierro y una mecha encendida.
  const barril = new THREE.Group();
  raiz.add(barril);
  const tonelGeo = keep(
    new THREE.LatheGeometry(
      [
        [0, 0.02],
        [0.53, 0.02],
        [0.67, 0.32],
        [0.72, 0.69],
        [0.67, 1.04],
        [0.54, 1.35],
        [0, 1.35],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
  );
  const madera = keep(
    new THREE.MeshStandardMaterial({
      color: 0x994c2b,
      flatShading: true,
      roughness: 0.88,
    }),
  );
  pieza(barril, tonelGeo, madera).castShadow = true;
  const hierro = keep(
    new THREE.MeshStandardMaterial({
      color: 0x56433e,
      metalness: 0.35,
      roughness: 0.62,
    }),
  );
  const zuncho = keep(new THREE.CylinderGeometry(1, 1, 0.12, 12));
  for (const [y, r] of [
    [0.24, 0.66],
    [0.66, 0.73],
    [1.11, 0.65],
  ]) {
    const banda = pieza(barril, zuncho, hierro);
    banda.position.y = y;
    banda.scale.set(r, 1, r);
  }
  const hilo = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.33, 0),
    new THREE.Vector3(0.06, 1.57, 0),
    new THREE.Vector3(0.24, 1.67, 0),
    new THREE.Vector3(0.36, 1.59, 0.02),
  ]);
  pieza(
    barril,
    keep(new THREE.TubeGeometry(hilo, 10, 0.05, 5, false)),
    tinta(0xf2d5a3),
  );
  const brasa = pieza(barril, esfera, tinta(0xffc653));
  const fondoBarril = pieza(barril, anilloGeo, tinta(0xffbc6b));
  fondoBarril.position.y = 0.07;
  fondoBarril.scale.setScalar(0.93);

  // La baba gruesa lleva tres gotas pequeñas; su eje sigue al vuelo balístico.
  const baba = new THREE.Group();
  raiz.add(baba);
  const liquido = keep(
    new THREE.MeshStandardMaterial({
      color: 0xb5e43c,
      emissive: 0x7eac0e,
      emissiveIntensity: 0.6,
      roughness: 0.18,
    }),
  );
  const cabeza = pieza(baba, esfera, liquido);
  cabeza.scale.set(0.31, 0.32, 0.52);
  for (let i = 1; i <= 3; i++) {
    const gota = pieza(baba, esfera, liquido);
    gota.position.set(Math.sin(i * 2) * 0.08, 0, -i * 0.36);
    gota.scale.setScalar(0.24 - i * 0.041);
  }
  const onda = pieza(raiz, anilloGeo, tinta(peligro, 0.9));
  const salpica = pieza(raiz, anilloGeo, tinta(listo, 0.9));
  // El sombreado anima burbujas y reflejos dentro de la superficie circular que inflige daño.
  const uTiempo = { value: 0 };
  const fluido = keep(
    new THREE.ShaderMaterial({
      uniforms: { tiempo: uTiempo },
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec2 p;
      void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 p; uniform float tiempo;
      void main(){
        float r=length(p);
        vec2 celda=p*5.3; vec2 id=floor(celda);
        float semilla=fract(sin(dot(id,vec2(142.3,45.7)))*153.91);
        vec2 d=fract(celda)-vec2(0.35+0.3*semilla,0.5);
        float fase=fract(semilla+tiempo*0.45);
        float burbuja=(1.-smoothstep(0.02,0.075,abs(length(d)-fase*0.23)))*sin(3.14159*fase);
        float vena=0.5+0.5*sin(17.*r+sin(p.x*13.+tiempo)+2.*sin(p.y*6.-tiempo*0.7));
        vec3 base=mix(vec3(0.085,0.18,0.022),vec3(0.33,0.50,0.05),vena);
        vec3 col=base+vec3(0.48,0.58,0.13)*(burbuja+smoothstep(0.89,0.98,r));
        gl_FragColor=vec4(col,0.94);
        #include <colorspace_fragment>
      }`,
    }),
  );
  const charcoGeo = keep(new THREE.CircleGeometry(1, 72)).rotateX(-Math.PI / 2);
  /** @type {THREE.Mesh[]} */
  const charcos = [];

  /** @param {import('../gameplay/tipos.js').Combate["arenaMirra"]} a
   * @param {import('../gameplay/tipos.js').Mundo["players"]} jugadores @param {number} t */
  function sync(a, jugadores, t) {
    const o = a.acido,
      b = a.barril;
    const apuntando = o?.etapa === "punteria";
    const volando = o?.etapa === "vuelo";
    marcado.visible = enlace.visible = !!apuntando;
    mira.visible = carga.visible = !!o;
    baba.visible = blancoFijo.visible = !!volando;
    if (volando && o) blancoFijo.position.set(o.x, 0.14, o.z);
    if (o) {
      const fraccion = Math.max(0, Math.min(1, o.t / o.duracion));
      const tono = volando ? peligro : o.cubreBarril ? listo : acido;
      miraMat.color.setHex(tono);
      mira.position.set(o.x, 0.105, o.z);
      mira.scale.setScalar(o.r);
      carga.position.set(o.x, 0.112, o.z);
      carga.scale.setScalar(o.r * 0.89);
      cargaGeo.setDrawRange(0, Math.max(1, Math.ceil((1 - fraccion) * 80)) * 6);
      if (apuntando && b) {
        const p = jugadores[o.objetivo];
        marcado.position.set(p.x, 2.45, p.z);
        const dx = b.x - o.x,
          dz = b.z - o.z;
        enlace.position.set((b.x + o.x) / 2, 0.125, (b.z + o.z) / 2);
        enlace.rotation.y = -Math.atan2(dz, dx);
        enlace.scale.set(Math.hypot(dx, dz), 1, 0.105);
        guiaMat.color.setHex(o.cubreBarril ? listo : 0xffd081);
      }
      if (volando) {
        baba.position.set(o.tiro.x, o.tiro.y, o.tiro.z);
        // Derivada de la parábola del combate. Las gotas siguen la tangente incluso en su punto más alto.
        baba.lookAt(
          o.tiro.x + (o.x - o.origen.x) * 0.1,
          o.tiro.y + 0.1 * (4 * alturaArco * (1 - 2 * fraccion) - o.origen.y),
          o.tiro.z + (o.z - o.origen.z) * 0.1,
        );
      }
    }
    barril.visible = destino.visible = !!b;
    if (b) {
      barril.position.set(b.x, 0, b.z);
      barril.scale.set(b.r / 0.72, 1, b.r / 0.72);
      destino.position.set(b.x, 2.36, b.z);
      const ritmo = 0.105 + (0.5 + 0.5 * Math.sin(t * 10)) * 0.04;
      brasa.scale.setScalar(!o ? ritmo * 1.6 : ritmo);
      hilo.getPointAt(
        Math.max(0, Math.min(1, a.mecha / a.mechaTotal)),
        brasa.position,
      );
    }
    onda.visible = a.explosion?.origen === "barril-polvora";
    if (a.explosion?.origen === "barril-polvora") {
      onda.position.set(a.explosion.x, 0.15, a.explosion.z);
      onda.scale.setScalar(0.8 + a.explosion.t * 19);
    }
    const res = a.resultadoAcido;
    salpica.visible = res?.tipo === "apagado";
    exito.visible = salpica.visible || !!(apuntando && o?.cubreBarril);
    if (b && apuntando && o?.cubreBarril) {
      destino.visible = false;
      exito.position.set(b.x, 2.36, b.z);
      exito.material.opacity = 1;
    }
    if (res && salpica.visible) {
      const k = Math.min(1, res.t / res.duracion);
      salpica.position.set(res.x, 0.15, res.z);
      salpica.scale.setScalar(0.65 + 1.45 * k);
      exito.position.set(res.x, 1.8 + k * 0.7, res.z);
      exito.material.opacity = 1 - 0.65 * k;
    }
    uTiempo.value = t;
    for (let i = 0; i < Math.max(charcos.length, a.charcos.length); i++) {
      const h = a.charcos[i],
        m = charcos[i] ?? (charcos[i] = pieza(raiz, charcoGeo, fluido));
      m.visible = !!h;
      if (h) {
        m.position.set(h.x, 0.084, h.z);
        m.scale.setScalar(h.r);
      }
    }
  }
  return { sync };
}
