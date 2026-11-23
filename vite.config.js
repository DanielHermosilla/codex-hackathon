import { defineConfig } from "vite";

// Ambas páginas son jugables también al abrir la compilación de producción.
export default defineConfig({
  build: {
    rollupOptions: { input: { juego: "index.html", pista: "pista.html" } },
  },
});
