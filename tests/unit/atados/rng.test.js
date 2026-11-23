import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { RNG } from "../../../src/atados/core/rng.js";

describe("RNG", () => {
  it("con la misma semilla produce la misma secuencia", () => {
    RNG.seed(42);
    const a = [RNG.next(), RNG.next(), RNG.next()];
    RNG.seed(42);
    const b = [RNG.next(), RNG.next(), RNG.next()];
    expect(a).toEqual(b);
  });
  it("range respeta los límites", () => {
    RNG.seed(7);
    for (let i = 0; i < 200; i++) {
      const v = RNG.range(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(5);
    }
  });
});
