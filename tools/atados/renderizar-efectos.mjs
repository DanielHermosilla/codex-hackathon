// Renderiza cada efecto del catálogo a WAV (mono, 48 kHz) con la misma mezcla que usa el motor del juego
// (planSonido + mezclarPlan). Sirve para medir niveles y espectro sin navegador.
// Uso: node tools/atados/renderizar-efectos.mjs <carpeta-de-salida>
/* global Buffer, process, console, performance */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG } from "../../src/atados/core/config.js";
import { planSonido } from "../../src/atados/audio/reglas.js";
import { mezclarPlan } from "../../src/atados/audio/sintesis-efectos.js";

const SR = 48000; // muestras por segundo de la mayoría de las tarjetas de sonido
// Duraciones típicas de los avisos estirables (s): telegrafía normal de cada ataque o vuelo del grano.
const DURACION = {
  avisoHoz: 1.2,
  avisoHozDoble: 1.2,
  avisoTripas: 1.4,
  avisoMandibulas: 1.0,
  avisoZumbido: 1.5,
  avisoInhalacion: 1.2,
  avisoGenerico: 1.0,
  enemigoAviso: 0.9,
  proyectilGrano: 0.6,
};

// WAV de 16 bits: cabecera RIFF de 44 bytes y muestras enteras.
function wav(muestras) {
  const b = Buffer.alloc(44 + muestras.length * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + muestras.length * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(muestras.length * 2, 40);
  for (let i = 0; i < muestras.length; i++)
    b.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, muestras[i])) * 32767),
      44 + i * 2,
    );
  return b;
}

const salida = process.argv[2];
if (!salida) {
  console.error("Falta la carpeta de salida.");
  process.exit(1);
}
mkdirSync(salida, { recursive: true });
const t0 = performance.now();
for (const [id, def] of Object.entries(CONFIG.audio.sfx)) {
  const t = performance.now();
  const mezcla = mezclarPlan(
    planSonido(def, DURACION[id] ?? null),
    id,
    SR,
    null,
  );
  writeFileSync(join(salida, `${id}.wav`), wav(mezcla));
  console.log(
    `${id}\t${(mezcla.length / SR).toFixed(2)} s\t${(performance.now() - t).toFixed(1)} ms`,
  );
}
console.log(`total ${(performance.now() - t0).toFixed(0)} ms`);
