#!/usr/bin/env node
// PostToolUse (Edit|Write): avisa de posibles números "mágicos" en src/gameplay (regla 1 de AGENTS.md).
// Heurística ruidosa a propósito: solo avisa (no bloquea); el agente decide si van en config.js.
const fs = require('fs');
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let p = '';
  try { p = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch (e) { process.exit(0); }
  if (!/\/src\/gameplay\/(?!rules)[^/]+\.js$/.test(p) || !fs.existsSync(p)) process.exit(0);
  const hits = [];
  fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/(['"`]).*?\1/g, '');
    if (/\b\d+\.\d+\b|\b(?:[3-9]|\d{2,})\b(?!\s*\])/.test(code) && !/CONFIG|RNG|\.length|0x/.test(code)) hits.push(i + 1);
  });
  if (hits.length) console.error(`Aviso: posibles números mágicos en ${p} (líneas ${hits.slice(0, 8).join(', ')}). ¿Van en config.js?`);
  process.exit(0);
});
