# La cadena y el daño

> Estado: 🟡 parcial. Cada afirmación cita su `[D-NNN]`. Base para el greybox del hito 1 (`../PRODUCCION.md`).
> Los parámetros llevan nombre de config (`src/core/config.js`). Valor «❓» = sin decidir: el ingeniero pone uno provisional, lo marca `// provisional` y se ajusta en playtest. Ningún valor provisional es decisión.
> Controles, dash, vida y modo solo: `04-jugabilidad.md`.

## 1. Modelo físico
- Física real: eslabones simulados que se curvan, se enredan y golpean [D-011].
- Largo fijo de base. Algunos drops lo alargan [D-079].
- En el largo máximo no se estira: el que tira más fuerte arrastra al otro [D-022].
- Se enreda en pilares y obstáculos del escenario [D-048]. En la demo, solo pilares estáticos [D-184].
- Atraviesa el cuerpo del jefe cortando; no choca con él [D-148].
- Une a Sael y Odo. Es su única arma [D-039, D-012].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `chain.length` | Largo base | ❓ | D-079 |
| `chain.linkCount` | Número de eslabones simulados | técnico | D-011 |
| `chain.linkMass` | Masa por eslabón | técnico | D-011 |
| `chain.collidesWith` | Capas con las que choca | pilares | D-048, D-184 |

## 2. Tensión
- Estado central, de 0 (floja) a 1 (tensa) [D-012, D-068].
- Se mide como **rectitud de los eslabones por tramo**. Funciona con la cadena enrollada en pilares: cada tramo recto entre apoyos está tenso [D-147].
- Transmite fuerza: si cada uno tira hacia un lado, se jalan. Sirve para empujar al compañero contra el jefe [D-013].
- Se ve solo en la cadena: runas que brillan más con la tensión, más un efecto o cambio leve de color [D-049, D-065].
- Se oye: zumbido armónico que sube de tono con la tensión [D-062].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `chain.tension.smoothing` | Suavizado de la lectura por tramo | técnico | D-147 |
| `chain.runes.glowByTension` | Curva brillo de runas ↔ tensión | ❓ | D-049, D-065 |
| `audio.chainHum.pitchByTension` | Curva tono ↔ tensión | ❓ | D-062 |

## 3. Daño: la cuchilla tensa
- Mecanismo principal: la cadena tensa corta al pasar por un enemigo [D-012].
- Daño continuo por paso de simulación = **tensión × velocidad relativa cadena–cuerpo**, mientras la cadena atraviesa al enemigo [D-148].
- Si el jefe carga contra la cadena tensa, también se corta [D-148].
- Sin umbral duro. Floja ≈ casi nada [D-068]. Sin combo ni multiplicador [D-081].
- Solo daña enemigos. Sin fuego amigo [D-023].
- Daño igual en todo el cuerpo. Único punto débil de la demo: la esquirla de Tavor en su fase final [D-092, D-160].
- Golpes básicos con uno solo; los fuertes piden a los dos [D-017]. Salen de tensión y velocidad altas, sin categorías discretas [D-068, D-081, D-148].
- Para las stats, el daño se atribuye al jugador más cercano al punto de contacto [D-165].
- Los proyectiles atraviesan la cadena: bloquearlos es un drop [D-046].
- Súper ataque coop solo como drop raro [D-094].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `damage.chain.scale` | Daño por unidad de tensión × velocidad | ❓ | D-148 |
| `damage.chain.tensionCurve` | Forma de la curva de tensión (floja ≈ 0, continua) | ❓ | D-068 |
| `damage.chain.speedCurve` | Forma de la curva de velocidad relativa | ❓ | D-148 |

❓ Pregunta abierta (P-31): D-165 atribuye el daño solo para las stats. ¿Los ataques que apuntan «al que más daño hace» [D-091] usan la misma atribución?

## 4. Arrastre en el largo máximo
- La cadena no se estira. Arrastra quien empuja más [D-022, D-149].
- Odo y Sael tienen stats idénticos [D-149].
- El dash siempre gana el tirón [D-149].
- Arrastrar un cadáver vuelve al vivo más lento y tosco [D-021].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `player.pullForce` | Fuerza con la que tira cada jugador (igual para los dos) | ❓ | D-149 |
| `corpse.mass` | Masa del cadáver | ❓ | D-021 |
| `corpse.dragFactor` | Freno extra al vivo que arrastra | ❓ | D-021 |

❓ Pregunta abierta (P-32): D-144 deja el dash como «solo movilidad + invulnerabilidad», pero D-149 dice que «el dash siempre gana» el tirón. Lectura literal de las dos: al largo máximo, quien dashea arrastra al otro sin impulso extra. ¿Confirmado?

## 5. Ancla
- Botón mantenido: mientras se aprieta, ancla. No es toggle [D-019].
- Anclado no se mueve, solo gira el cuerpo [D-122].
- Absoluta frente a la cadena: el compañero no puede arrastrarlo [D-150].
- Los empujones reducidos son solo de ataques [D-122, D-150].
- Para dashear hay que soltar el ancla [D-122].
- Uso: pivote para que el otro gire tenso alrededor [D-018].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `anchor.attackPushFactor` | Fracción de empuje de ataques que recibe anclado | ❓ | D-122, D-150 |
| `anchor.turnSpeed` | Velocidad de giro anclado | ❓ | D-122 |

## 6. Sin lanzamiento del compañero
- Se elimina del juego lanzar al compañero con el dash. Reemplaza D-015 y D-067 [D-144].
- El dash es solo movilidad e invulnerabilidad [D-144].
- Sigue en pie empujar al compañero con la tensión [D-013].

## 7. Cadáver como mangual
- Si un jugador muere, su cadáver queda unido a la cadena y el otro lo arrastra [D-020].
- El cadáver sigue siendo un extremo que corta. Se gira como mangual, más lento y tosco [D-070].
- Es uno de los momentos que la gente debe contar [D-119].
- Daño con la misma regla de tensión y velocidad [D-148].

## 8. Efectos de jefe sobre la cadena
- Algunos ataques afectan la cadena si la golpean. Debe pasar poco [D-047]. Los jefes rara vez apuntan a la cadena [D-091].
- Electrificada: no corta durante ~2 s, sin quitar vida [D-157].
- Solo Tavor intenta romperla, en su fase final. Nunca se rompe [D-185].
- Fallar la Sentencia final de Tavor: daño y runas apagadas 4 s [D-161].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `chain.electrified.duration` | Tiempo sin cortar | ~2 s | D-157 |
| `chain.runesOff.duration` | Runas apagadas tras fallar la Sentencia | 4 s | D-161 |

❓ Pregunta abierta (P-33): D-047 cita «congelar», pero solo se decidió electrificar [D-157]. ¿Algún jefe congela la cadena en la demo?
❓ Pregunta abierta (P-34): con las runas apagadas [D-161], ¿la cadena corta? Las runas son el fuego que corta carne divina [D-049, D-057].

## 9. Interacción con el escenario
- Solo pilares estáticos que cambian por fase [D-184]. Sin pilares destructibles ni objetos atables [D-184].

## 10. Feedback de golpe
- Golpe fuerte: hit-stop, shake y chispas según tensión, con números de daño. Desactivables [D-080, D-112].
- Hit-stop al cruzar una tensión alta [D-166].
- Un número de daño que crece mientras dura el contacto [D-166].

| Config | Qué | Valor | Decisión |
|---|---|---|---|
| `feedback.hitstop.duration` | Duración del hit-stop | ❓ | D-080 |
| `feedback.hitstop.tensionThreshold` | Tensión que dispara el hit-stop | ❓ | D-166 |
| `feedback.shake.amount` | Intensidad del shake | ❓ | D-080 |
| `feedback.sparks.byTension` | Chispas ↔ tensión | ❓ | D-080 |
| `feedback.damageNumbers` | Números de daño on/off | on | D-080, D-112 |

## 11. Drops que tocan la cadena
Las mejoras de cadena valen para los dos [D-095]. Ya decididas como drop: alargar la cadena [D-079], bloquear proyectiles [D-046], súper ataque coop raro [D-094]. Cada esquirla de dios vencido se incrusta en la cadena, como hecho narrativo [D-169]. Lista completa en `06-progresion.md`.

## 12. Criterios del greybox (hito 1)
Salen de las decisiones. Se comprueban con `window.__game` y capturas.
1. Los dos se mueven unidos; al largo máximo la cadena no se estira y arrastra quien empuja más [D-022, D-149].
2. Cadena floja que atraviesa al muñeco: daño ≈ 0 [D-068].
3. Más tensión y más velocidad relativa: más daño, sin saltos [D-148].
4. Un muñeco que se mueve contra la cadena tensa quieta también se corta [D-148].
5. La cadena se enreda en un pilar y el tramo recto sigue tenso [D-048, D-147].
6. Anclado no se mueve aunque el otro tire; el otro gira tenso a su alrededor [D-122, D-150].
7. El dash no lanza al compañero [D-144].
8. Matar a uno: el cadáver se arrastra, frena al vivo y sigue cortando [D-020, D-021, D-070].
9. La cadena nunca daña al compañero [D-023].
10. Las runas brillan y el zumbido sube con la tensión [D-049, D-062].
11. Hit-stop al cruzar tensión alta; número que crece durante el contacto [D-166].
12. Modo solo con un teclado [D-016, D-145].
