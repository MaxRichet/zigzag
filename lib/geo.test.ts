import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance, roundLngLat } from "./geo";

describe("distanceKm", () => {
  it("Paris → Lyon ≈ 392 km à vol d'oiseau", () => {
    expect(distanceKm([2.3522, 48.8566], [4.8357, 45.764])).toBeCloseTo(392, -1);
  });

  it("vaut 0 pour un même point", () => {
    expect(distanceKm([4.85, 45.76], [4.85, 45.76])).toBe(0);
  });
});

describe("formatDistance", () => {
  it.each([
    [0.004, "10 m"],
    [0.853, "850 m"],
    [4.24, "4,2 km"],
    [9.96, "10 km"],
    [37.4, "37 km"],
    [1234.5, "1 235 km"],
  ])("%s km → %s", (km, text) => {
    // toLocaleString sépare les milliers par une espace insécable fine.
    expect(formatDistance(km).replace(/\s/g, " ")).toBe(text);
  });
});

describe("roundLngLat", () => {
  it("arrondit au centième de degré", () => {
    expect(roundLngLat([4.85712, 45.76349])).toEqual([4.86, 45.76]);
  });
});
