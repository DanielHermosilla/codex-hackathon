// Jugadores: movimiento, dash, ancla, vida. Sin three.js ni DOM.
// D-014/D-069 dash e invulnerabilidad; D-019/D-122/D-150 ancla; D-020/D-021/D-070 cadáver;
// D-149 stats idénticos; D-151 dash sin dirección va hacia donde mira; D-152 invulnerabilidad tras golpe.

/** @typedef {import('./tipos.js').Jugador} Jugador */
/** @typedef {import('./tipos.js').Cfg} Cfg */
/** @typedef {import('./tipos.js').Entrada} Entrada */

/**
 * @param {string} id
 * @param {number} x
 * @param {number} z
 * @param {Cfg} cfg
 * @returns {Jugador}
 */
export function createPlayer(id, x, z, cfg) {
  return {
    id,
    x,
    z,
    px: x,
    pz: z,
    sx: x,
    sz: z,
    vx: 0,
    vz: 0,
    ivx: 0,
    ivz: 0, // iv = velocidad propia del paso; s = posición antes del empuje
    face: -Math.PI / 2, // ángulo en XZ: dirección (cos, sin). -π/2 = mirando a -z (arriba en pantalla)
    hp: cfg.player.maxHp,
    alive: true,
    anchored: false,
    dashT: 0,
    dashCd: 0,
    dashX: 0,
    dashZ: 0,
    dashHeld: false,
    hurtT: 0,
  };
}

/** @param {Jugador} p */
export const isDashing = (p) => p.dashT > 0;
/** @param {Jugador} p */
export const isInvulnerable = (p) => p.dashT > 0 || p.hurtT > 0;

// Peso inverso para el arrastre (ADR-001): ancla absoluta = 0 (D-150); durante el dash pesa más y gana (D-149);
// el cadáver pesa `corpse.mass` (D-021).
/**
 * @param {Jugador} p
 * @param {Cfg} cfg
 * @returns {number}
 */
export function inverseMass(p, cfg) {
  if (p.anchored) return 0;
  let m = cfg.player.mass;
  if (!p.alive) m *= cfg.corpse.mass;
  else if (p.dashT > 0) m *= cfg.dash.massMult;
  return 1 / m;
}

/**
 * @param {Jugador} p
 * @param {number} tx
 * @param {number} tz
 * @param {number} rate
 * @param {number} dt
 */
function turnToward(p, tx, tz, rate, dt) {
  const target = Math.atan2(tz, tx);
  let d = target - p.face;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const max = rate * dt;
  p.face += Math.max(-max, Math.min(max, d));
}

// Actualiza intención y velocidad del jugador para este paso. input: { mx, mz, dash, anchor, dashDir? }.
/**
 * @param {Jugador} p
 * @param {Entrada} input
 * @param {boolean} partnerDead
 * @param {number} dt
 * @param {Cfg} cfg
 */
export function updatePlayer(p, input, partnerDead, dt, cfg) {
  const P = cfg.player,
    D = cfg.dash;
  if (!p.alive) {
    const k = Math.exp(-cfg.corpse.friction * dt);
    p.vx *= k;
    p.vz *= k;
    p.anchored = false;
    p.dashT = 0;
    p.dashHeld = false;
    return;
  }
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  const pressed = !!input.dash && !p.dashHeld;
  p.dashHeld = !!input.dash;

  let mx = input.mx || 0,
    mz = input.mz || 0;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) {
    mx /= mag;
    mz /= mag;
  }
  const moving = mag > 0.05;
  const tosco = partnerDead ? cfg.corpse.dragFactor : 1;

  // Dash en curso: velocidad fija, sin control.
  if (p.dashT > 0) {
    const speed = D.distance / D.duration;
    p.vx = p.dashX * speed;
    p.vz = p.dashZ * speed;
    p.dashT -= dt;
    if (p.dashT <= 0) {
      p.dashT = 0;
      p.vx = p.dashX * P.moveSpeed;
      p.vz = p.dashZ * P.moveSpeed; // sale a velocidad de carrera
    }
    p.anchored = false;
    return;
  }

  // Ancla mantenida: no se mueve, solo gira (D-019, D-122). Para dashear hay que soltar.
  p.anchored = !!input.anchor;
  if (p.anchored) {
    p.vx = 0;
    p.vz = 0;
    if (moving) turnToward(p, mx, mz, cfg.anchor.turnSpeed * tosco, dt);
    return;
  }

  if (pressed && p.dashCd <= 0) {
    let dx, dz;
    if (input.dashDir) {
      dx = input.dashDir.x;
      dz = input.dashDir.z;
    } else if (moving) {
      dx = mx;
      dz = mz;
    } else {
      dx = Math.cos(p.face);
      dz = Math.sin(p.face);
    } // D-151
    const l = Math.hypot(dx, dz) || 1;
    p.dashX = dx / l;
    p.dashZ = dz / l;
    p.face = Math.atan2(p.dashZ, p.dashX);
    p.dashT = D.duration;
    p.dashCd = D.cooldown;
    const speed = D.distance / D.duration;
    p.vx = p.dashX * speed;
    p.vz = p.dashZ * speed;
    return;
  }

  // Carrera: la velocidad va hacia la deseada con una tasa (impulso proporcional, ver ADR-001):
  // así "empujar más" = entrada mayor, y gana el arrastre quien empuja más (D-022, D-149).
  const k = 1 - Math.exp(-P.accel * tosco * dt);
  p.vx += (mx * P.moveSpeed - p.vx) * k;
  p.vz += (mz * P.moveSpeed - p.vz) * k;
  if (moving) turnToward(p, mx, mz, P.turnSpeed * tosco, dt);
}

// Recibir daño. Devuelve true si se aplicó. Inmune durante el dash (D-069) y en la ventana tras un golpe (D-152).
// `tick` = daño por tick de una zona persistente (enjambre): respeta el dash pero no la ventana tras
// golpe ni la abre (si no, la ventana de 0,8 s se comería los ticks de 0,5 s). Interpretación, ver ITERACIONES.
/**
 * @param {Jugador} p
 * @param {number} amount
 * @param {Cfg} cfg
 * @param {boolean} [tick]
 * @returns {boolean}
 */
export function hurtPlayer(p, amount, cfg, tick = false) {
  if (!p.alive || p.dashT > 0 || (!tick && p.hurtT > 0)) return false;
  p.hp -= amount;
  if (p.hp <= 0) killPlayer(p);
  else if (!tick) p.hurtT = cfg.player.hurtIframes;
  return true;
}

/** @param {Jugador} p */
export function killPlayer(p) {
  p.hp = 0;
  p.alive = false;
  p.anchored = false;
  p.dashT = 0;
  p.hurtT = 0;
}

// D-020 + D-167: revive al terminar el combate con vida llena (en greybox, tecla de debug).
/**
 * @param {Jugador} p
 * @param {Cfg} cfg
 */
export function revivePlayer(p, cfg) {
  p.alive = true;
  p.hp = cfg.player.maxHp;
  p.hurtT = 0;
  p.dashCd = 0;
}

// Empuja un punto fuera de un círculo (cuerpos sólidos: pilares, muñeco). Devuelve true si empujó.
/**
 * @param {import('./tipos.js').Punto} pos
 * @param {number} cx
 * @param {number} cz
 * @param {number} r
 * @returns {boolean}
 */
export function pushOutOfCircle(pos, cx, cz, r) {
  const dx = pos.x - cx,
    dz = pos.z - cz;
  const d = Math.hypot(dx, dz);
  if (d >= r - 1e-9) return false;
  if (d < 1e-9) {
    pos.x = cx + r;
    return true;
  }
  pos.x = cx + (dx / d) * r;
  pos.z = cz + (dz / d) * r;
  return true;
}

// Mantiene un punto dentro del círculo de la arena.
/**
 * @param {import('./tipos.js').Punto} pos
 * @param {number} r
 * @returns {boolean}
 */
export function keepInsideCircle(pos, r) {
  const d = Math.hypot(pos.x, pos.z);
  if (d <= r + 1e-9) return false;
  pos.x *= r / d;
  pos.z *= r / d;
  return true;
}
