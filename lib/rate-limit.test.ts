import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("bloque au-delà de la limite, puis libère à la fenêtre suivante", () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect([allow("ip", 0), allow("ip", 10), allow("ip", 20)]).toEqual([true, true, false]);
    expect(allow("autre", 20)).toBe(true);
    expect(allow("ip", 1000)).toBe(true);
  });
});

describe("clientKey", () => {
  it("prend la première adresse de x-forwarded-for", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientKey(new Headers())).toBe("local");
  });
});
