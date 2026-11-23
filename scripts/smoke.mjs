// Smoke de navegador, portado de AtaDos: levanta Vite, abre la pista en Chromium headless
// (WebGL por SwiftShader), guarda una captura y falla ante errores de consola, excepciones
// o requests fallidos. Complementa a `npm run test:browser`; no lo reemplaza ni es una etapa de CI.
//   npm run build && node scripts/smoke.mjs
import fs from "node:fs";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { hud } from "./smoke-hud.mjs";

const OUT = "test-results/smoke";
const PORT = 5199;
fs.mkdirSync(OUT, { recursive: true });

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const server = await createServer({
  logLevel: "silent",
  server: { port: PORT, strictPort: true, host: "127.0.0.1" },
});
await server.listen();
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"],
});

try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`consola: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`excepción: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`request fallido: ${r.url()}`));

  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.locator("#pista").waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: `${OUT}/01-inicio.png` });
  check("la pista se dibuja", true);

  await hud({ page, OUT, check });

  check("sin errores de consola, excepciones ni requests fallidos", problems.length === 0, problems.join(" | "));
} finally {
  await browser.close();
  await server.close();
}

console.log(failed ? `${failed} fallo(s)` : "OK");
process.exit(failed ? 1 : 0);
