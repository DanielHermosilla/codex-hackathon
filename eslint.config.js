import js from "@eslint/js";

// Estas reglas estándar detectan errores como usar variables sin declarar.
export default [
  js.configs.recommended,
  {
    // Los módulos y las pruebas de navegador pueden usar las API de la página.
    files: ["src/**/*.js", "tests/browser/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        matchMedia: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        Image: "readonly",
        ResizeObserver: "readonly",
        URLSearchParams: "readonly",
        AudioContext: "readonly",
        OfflineAudioContext: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLParagraphElement: "readonly",
      },
    },
  },
  {
    // Las pruebas de lógica corren en Node.
    files: ["tests/unit/**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        setTimeout: "readonly",
        structuredClone: "readonly",
      },
    },
  },
];
