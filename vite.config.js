import { defineConfig } from "vite";

// Conserva la dirección antigua para que los marcadores abran la portada.
export default defineConfig({
  build: {
    rollupOptions: { input: { juego: "index.html", pista: "pista.html" } },
  },
});
