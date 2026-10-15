import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, formatKm } from "./format";

describe("formatDuration", () => {
  it.each([
    [10, "1 min"],
    [479, "8 min"],
    [3240, "54 min"],
    [3600, "1 h 00"],
    [3900, "1 h 05"],
    [9000, "2 h 30"],
  ])("%s s → %s", (s, text) => expect(formatDuration(s)).toBe(text));
});

describe("formatClock", () => {
  it("écrit l'heure sans zéro initial, les minutes sur deux chiffres", () => {
    expect(formatClock(new Date(2026, 9, 16, 9, 8))).toBe("9:08");
    expect(formatClock(new Date(2026, 9, 16, 14, 30))).toBe("14:30");
  });
});

describe("formatKm", () => {
  it.each([
    [853, "850 m"],
    [12400, "12,4 km"],
    [9977, "10 km"],
    [128400, "128 km"],
  ])("%s m → %s", (m, text) => expect(formatKm(m)).toBe(text));
});
