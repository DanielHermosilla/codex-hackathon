# Hackatón Codex

El repositorio incluye una pista 3D para probar el flujo de desarrollo. Haz clic en la pista o selecciónala con Tab. Mueve el cubo con las flechas o WASD y usa **Volver al centro** para reiniciar su posición.

## Abrir la pista

Instala Git, Python 3.11 o posterior y Node.js 24 con npm. Si usas nvm, ejecuta `nvm install` y `nvm use` desde la raíz.

```sh
npm ci
npm run dev
```

Abre la dirección que imprima Vite, normalmente `http://localhost:5173`. Deja la terminal abierta mientras juegas. Pulsa Ctrl+C para cerrar el servidor. Usa un navegador de escritorio con WebGL 2 y teclado.

## Comprobar un cambio

Instala Chromium para Playwright una vez por cada versión de Playwright. Luego ejecuta la validación completa.

```sh
npx playwright install chromium
python3 scripts/validate.py --strict
```

PowerShell, macOS y Linux pueden ejecutar los comandos de npm. Para el flujo de Codex en Windows, consulta los pasos de WSL en la guía de configuración.

`npm run build` deja la versión web en `dist/`. `npm run preview` permite abrir esa compilación localmente. El test de navegador guarda una captura del canvas en `test-results/`.

## Trabajar con Codex

Lee [Configurar Codex](docs/codex-setup.md) para activar los hooks del repositorio y comprobar las skills. [Arquitectura](docs/architecture.md) muestra dónde cambiar la pista y las reglas. [Colaboración](docs/collaboration.md) describe las ramas, el PR y las aprobaciones.

El [diseño de AtaDos](docs/atados/) reúne las mecánicas, las fichas de jefes y las decisiones del prototipo.
