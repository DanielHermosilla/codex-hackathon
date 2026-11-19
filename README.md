# Hackaton Codex

**Es importante que USTEDES (no una IA) lean esto antes de ponerse a desarrollar**:

1. Confirmen que tienen Git y Python 3.11 (o más) instalado. Desde mac pueden ver al correr

```
git --version && python3 --version
```

Si **no tienen** algunas de esas dos, instalarlo con homebrew:

```
brew install git python
```

2. Abran Codex **desde el terminal**. Deben poner `/hooks` y dar permiso a los hooks que están en el repositorio. Por ejemplo, `PreToolUse` tiene el hook `Comprobando Operación GitHub` que deben aceptar. 

3. Ahora, ponen `/skills` y acá deben buscar **las tres skills que son fundamentales para el desarrollo**. DEBEN usar esas skills **siempre** que quieran implementar una feature nueva: (i) `merge_feature`: para hacer un merge, que idealmente NO lo deben hacer sin supervisión, ya que es **necesario** probar y asegurar que todo esté funcionando correctamente antes de un merge; (ii) `new_feature`: cada vez que quieran añadir para nueva feature al juego; (iii) `code-review`: para evaluar los cambios en el código.

4. Correr `python3 scripts/validate.py --harness` para verificar que todo esté bien. 

Esto si se lo pueden tirar a una IA para que se los lea. Ver la [guía para principiantes](docs/beginner-guide.md) y [publicación y protección en GitHub](docs/collaboration.md).
