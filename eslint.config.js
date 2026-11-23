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
        performance: "readonly",
        requestAnimationFrame: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLParagraphElement: "readonly",
      },
    },
  },
];
