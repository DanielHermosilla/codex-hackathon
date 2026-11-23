"""PostToolUse: avisa de posibles números «mágicos» en el código del juego.

Portado del hook `magic-numbers.js` de AtaDos. Solo avisa: nunca bloquea.
Heurística ruidosa a propósito: el agente decide si el valor va en una constante.
"""

import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
# Archivos del juego donde se revisa. Los de configuración se omiten.
GAME_FILE = re.compile(r"(^|/)src/(?!.*(config|constants?)\.js$).+\.js$")
PATCH_FILE = re.compile(r"^\*\*\* (?:Add|Update) File: (.+)$", re.MULTILINE)
NUMBER = re.compile(r"\b\d+\.\d+\b|\b(?:[3-9]|\d{2,})\b(?!\s*\])")
ALLOWED_LINE = re.compile(r"^\s*(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*=|RNG|\.length|0x")


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def touched_files(tool_input):
    paths = []
    if isinstance(tool_input, dict) and isinstance(tool_input.get("file_path"), str):
        paths.append(tool_input["file_path"])
    for text in strings(tool_input):
        paths.extend(PATCH_FILE.findall(text))
    return paths


def suspicious_lines(path):
    lines = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        code = re.sub(r"//.*$", "", line)
        code = re.sub(r"""(['"`]).*?\1""", "", code)
        if NUMBER.search(code) and not ALLOWED_LINE.search(code):
            lines.append(number)
    return lines


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return 0
    cwd = Path(payload.get("cwd") or ROOT)
    warnings = []
    for name in touched_files(payload.get("tool_input")):
        path = (cwd / name).resolve()
        if not GAME_FILE.search(path.as_posix()) or not path.is_file():
            continue
        lines = suspicious_lines(path)
        if lines:
            shown = ", ".join(map(str, lines[:8]))
            warnings.append(f"{name} (líneas {shown})")
    if warnings:
        message = ("Aviso: posibles números mágicos en " + "; ".join(warnings)
                   + ". ¿Conviene moverlos a una constante con nombre?")
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PostToolUse", "additionalContext": message}}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
