# Cómo se trabajó

## 1. Entrevista → decisiones
- Una entrevista por bloques (visión, lore, arte, cadena, jefes, progresión, audio, UI, dificultad, alcance) en [diseno/ENTREVISTA.md](../diseno/ENTREVISTA.md).
- Cada respuesta se registra con la skill `registrar-decision` en [diseno/DECISIONES.md](../diseno/DECISIONES.md) con un ID. Nunca se borra: se reemplaza.
- Lo que Diego no quiso decidir se **delega**: la IA propone 2–3 opciones con captura y él aprueba.

## 2. GDD y fichas
Se redacta [diseno/gdd/](../diseno/gdd/) citando cada `[D-NNN]`. Lo que falta queda como pregunta, nunca inventado. Fichas de jefe con la skill `diseno-jefe`.

## 3. Verificación
- `pnpm verify` = build + tests + smoke en Chromium headless que falla con cualquier error de consola y guarda capturas. Es la definición de «hecho».
- Se **miran las capturas**, no solo el texto.
- Revisión adversarial con Codex antes de integrar (`gpt-6.1-sol` para física y jefes, `gpt-6.1-terra` para el resto).
- Diego juega 5 minutos y decide: mantener, matar o reajustar (skill `prototipo-rapido`).

## 4. Herramientas
Ver [herramientas/](../herramientas/): skills, hooks (`guard.js` bloquea tocar `node_modules`/`dist`/lockfile; `magic-numbers.js` avisa de números sueltos), MCP de Playwright y Blender, y los scripts de smoke y modelos. Más detalle en [herramientas/HERRAMIENTAS.md](../herramientas/HERRAMIENTAS.md) y [herramientas/SKILLS.md](../herramientas/SKILLS.md).
