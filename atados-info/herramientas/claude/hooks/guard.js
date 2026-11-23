#!/usr/bin/env node
// PreToolUse (Edit|Write): bloquea editar a mano archivos generados o de infraestructura.
// Código de salida 2 = bloquear y devolver el motivo al agente.
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let p = '';
  try { p = (JSON.parse(raw).tool_input || {}).file_path || ''; } catch (e) { process.exit(0); }
  if (/\/(node_modules|dist|\.github)\//.test(p) || /\/pnpm-lock\.yaml$/.test(p)) {
    console.error('Bloqueado: node_modules/, dist/, pnpm-lock.yaml y .github/ no se editan a mano (ver AGENTS.md). Usa pnpm o pide permiso explícito a Diego.');
    process.exit(2);
  }
  process.exit(0);
});
