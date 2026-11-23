import process from "node:process";
import { defineConfig } from "@playwright/test";

// Servimos la compilación de dist/ en un puerto local reservado para las pruebas.
const puerto = Number(process.env.ATADOS_TEST_PORT ?? 4173);
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error("ATADOS_TEST_PORT debe ser un puerto entre 1 y 65535.");
}
const origin = `http://127.0.0.1:${puerto}`;

export default defineConfig({
  testDir: "./tests/browser",
  workers: process.env.CI ? undefined : 1, // Las sesiones locales comparten la GPU.
  webServer: [
    {
      command: `npm run preview -- --host 127.0.0.1 --port ${puerto} --strictPort`,
      url: origin,
    },
    {
      // La pista de desarrollo se sirve aparte de la compilación que reciben los jugadores.
      command: "npm run dev -- --host 127.0.0.1 --port 4174 --strictPort",
      url: "http://127.0.0.1:4174/tests/browser/fixtures/pista.html",
    },
  ],
  use: {
    baseURL: origin,
    browserName: "chromium",
    headless: true,
    viewport: { width: 960, height: 720 },
    screenshot: "only-on-failure",
    launchOptions: {
      // En CI Chromium dibuja con SwiftShader aunque el runner no tenga GPU.
      args:
        process.platform === "darwin" && !process.env.CI
          ? ["--use-angle=metal"] // las capturas WebGL usan la GPU del Mac local
          : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
});
