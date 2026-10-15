import { describe, expect, it } from "vitest";
import { distanceKm, distanceToLineKm, formatDistance, lineLengthKm, pointsAlong, roundLngLat, simplifyLine } from "./geo";

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

describe("géométrie le long d'un tracé", () => {
  // Ligne est-ouest à Lyon, sur ~7,8 km.
  const line: [number, number][] = [
    [4.8, 45.76],
    [4.85, 45.76],
    [4.9, 45.76],
  ];

  it("distanceToLineKm : distance perpendiculaire au tracé", () => {
    // 0,01° de latitude ≈ 1,11 km
    expect(distanceToLineKm([4.83, 45.77], line)).toBeCloseTo(1.113, 2);
    // Au-delà du bout : distance à l'extrémité
    expect(distanceToLineKm([4.95, 45.76], line)).toBeCloseTo(distanceKm([4.95, 45.76], [4.9, 45.76]), 2);
  });

  it("simplifyLine : retire les points alignés, garde les virages", () => {
    expect(simplifyLine(line, 0.01)).toEqual([line[0], line[2]]);
    const corner: [number, number][] = [[4.8, 45.76], [4.85, 45.76], [4.85, 45.8]];
    expect(simplifyLine(corner, 0.01)).toEqual(corner);
  });

  it("pointsAlong : répartit les points sur la longueur", () => {
    const [mid] = pointsAlong(line, 1);
    expect(mid[0]).toBeCloseTo(4.85, 5);
    const pts = pointsAlong(line, 4);
    expect(pts.map((p) => Math.round(p[0] * 1000) / 1000)).toEqual([4.813, 4.838, 4.863, 4.888]);
    expect(lineLengthKm(line)).toBeCloseTo(7.79, 1);
  });
});
