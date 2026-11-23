---
name: registrar-decision
description: Registra una decisión de diseño o producción tomada por Diego (respuesta de la entrevista o cambio posterior) en docs/DECISIONES.md, la refleja en el doc de diseño del área y actualiza el contador del experimento. Úsalo cada vez que Diego responda una pregunta o cambie de idea.
---
1. Siguiente ID: `rg -o '^\| D-[0-9]+' docs/DECISIONES.md | tail -1` → +1 (formato `D-001`).
2. Añade fila en `docs/DECISIONES.md`: `| D-NNN | fecha | área | decisión en una frase | pregunta origen (ej. D4) | vigente |`. Usa las palabras de Diego; si interpretas, márcalo "(interpretado)".
3. Si reemplaza otra, marca la vieja `reemplazada por D-NNN`; no la borres.
4. En `docs/ENTREVISTA.md` marca la pregunta como respondida (`✅ D-NNN`).
5. Refleja la consecuencia en `docs/design/<área>.md` citando `[D-NNN]`. Si abre preguntas nuevas, añádelas al bloque en ENTREVISTA.
6. Actualiza `docs/EXPERIMENTO.md` (conteo de decisiones, y si es la primera/última de preproducción, el timestamp).
