# Cómo se trabajó en el prototipo original

Este documento describe el trabajo de aquel equipo. El flujo vigente está en el [README principal](../../../README.md).

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
El equipo original utilizó skills de diseño, hooks de edición, MCP de Playwright y Blender, y scripts para las pruebas de humo y la preparación de modelos.
