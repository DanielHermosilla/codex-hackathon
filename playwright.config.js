import { defineConfig } from "@playwright/test";

// Servimos la compilación de dist/ en un puerto local reservado para las pruebas.
const origin = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/browser",
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: origin,
  },
  use: {
    baseURL: origin,
    browserName: "chromium",
    headless: true,
    viewport: { width: 960, height: 720 },
    screenshot: "only-on-failure",
    launchOptions: {
      // En CI Chromium dibuja con SwiftShader aunque el runner no tenga GPU.
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
});
