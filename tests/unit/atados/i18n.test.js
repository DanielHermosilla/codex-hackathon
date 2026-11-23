import { describe, it, afterEach } from "node:test";
import { expect } from "./_expect.js";
import {
  t,
  setIdioma,
  idiomaDe,
  IDIOMAS,
} from "../../../src/atados/i18n/index.js";
import { CONFIG } from "../../../src/atados/core/config.js";

describe("traducciones (D-102)", () => {
  afterEach(() => setIdioma("es"));
  it("es y en tienen las mismas claves", () => {
    expect(Object.keys(IDIOMAS.en).sort()).toEqual(
      Object.keys(IDIOMAS.es).sort(),
    );
  });
  it("cada jefe en config tiene sus textos", () => {
    for (const [id, def] of Object.entries(CONFIG.jefes)) {
      if (id === "comun") continue;
      for (const k of [
        "nombre",
        "antiguo",
        "presentacion",
        "muerte",
        "burla",
        "derrota",
      ]) {
        expect(IDIOMAS.es[`jefe.${def.textos}.${k}`]).toBeTruthy();
      }
    }
  });
  it("t() traduce, interpola y cae al español", () => {
    expect(t("lapida.titulo", { jefe: "Mirra" })).toBe("Aquí cayó Mirra");
    setIdioma("en");
    expect(t("combate.reintentar")).toBe("{dash} to retry");
    expect(t("no.existe")).toBe("no.existe");
    expect(idiomaDe(["en-US", "es"])).toBe("en");
    expect(idiomaDe(["fr"])).toBe("es");
  });
});
