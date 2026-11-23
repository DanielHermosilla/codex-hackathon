"""Pruebas del hook que avisa de números mágicos."""

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
HOOK = ROOT / ".codex/hooks/magic_numbers.py"


class MagicNumbersTest(unittest.TestCase):
    def run_hook(self, source, name="src/regla.js", tool_input=None):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / name
            target.parent.mkdir(parents=True)
            target.write_text(source, encoding="utf-8")
            payload = {"cwd": folder, "hook_event_name": "PostToolUse",
                       "tool_name": "apply_patch",
                       "tool_input": tool_input or {"command": f"*** Begin Patch\n*** Update File: {name}\n"}}
            result = subprocess.run([sys.executable, "-B", str(HOOK)], input=json.dumps(payload),
                                    text=True, capture_output=True, check=True, timeout=20)
        return json.loads(result.stdout)["hookSpecificOutput"] if result.stdout else None

    def test_avisa_de_un_numero_suelto(self):
        output = self.run_hook("const x = pos * 42;\n")
        self.assertEqual(output["hookEventName"], "PostToolUse")
        self.assertIn("línea", output["additionalContext"])

    def test_acepta_constantes_con_nombre(self):
        self.assertIsNone(self.run_hook("const SPEED = 5;\n"))

    def test_ignora_comentarios_y_cadenas(self):
        self.assertIsNone(self.run_hook("const a = 'hola 99'; // 45\n"))

    def test_ignora_archivos_de_configuracion(self):
        self.assertIsNone(self.run_hook("const x = 42;\n", name="src/config.js"))

    def test_ignora_archivos_fuera_del_juego(self):
        self.assertIsNone(self.run_hook("const x = 42;\n", name="docs/ejemplo.js"))


if __name__ == "__main__":
    unittest.main()
