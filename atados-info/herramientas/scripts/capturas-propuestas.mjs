// Capturas de las propuestas de color (D-082, D-083, D-087). Mismo patrón que smoke.mjs:
// Vite + Chromium headless, falla ante errores de consola, excepciones o requests fallidos.
//   node scripts/capturas-propuestas.mjs [v1]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs';

const VERSION = process.argv[2] || 'v1';
const OUT = 'test-results/propuestas';
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5198;
const ZONAS = ['pasillo', 'trigal', 'muelle', 'tavor'];
const CASOS = ZONAS.flatMap((z) => [
  { nombre: `${z}`, q: `propuesta=colores&zona=${z}&k=0` },
  { nombre: `${z}-climax`, q: `propuesta=colores&zona=${z}&k=1` },
]);

let failed = 0;
const server = await createServer({ logLevel: 'silent', server: { port: PORT, strictPort: true, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
try {
  // Calentamiento: la primera carga hace que Vite optimice dependencias y recargue.
  { const p = await browser.newPage(); await p.goto(`http://127.0.0.1:${PORT}/?${CASOS[0].q}`); await p.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(1500); await p.close(); }
  for (const c of CASOS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const problems = [];
    page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
    page.on('pageerror', (e) => problems.push('excepción: ' + e.message));
    page.on('requestfailed', (r) => problems.push('request fallido: ' + r.url()));
    await page.goto(`http://127.0.0.1:${PORT}/?seed=7&capture&${c.q}`);
    await page.waitForFunction(() => window.__game?.ready === true, null, { timeout: 30000 });
    await page.evaluate(() => window.__game.step(10));
    const dc = await page.evaluate(() => window.__game.drawCalls);
    const file = `${OUT}/${VERSION}-${c.nombre}.png`;
    await page.screenshot({ path: file });
    const ok = problems.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? '✔' : '✖'} ${file} — draw calls escena=${dc?.escena} total=${dc?.total}${ok ? '' : ' — ' + problems.join(' | ')}`);
    await page.close();
  }
} catch (e) {
  failed++;
  console.log('✖ excepción: ' + (e.message || e));
} finally {
  await browser.close();
  await server.close();
}
console.log(failed ? `${failed} fallo(s)` : 'OK');
process.exit(failed ? 1 : 0);
