import { afterEach, describe, expect, it, vi } from "vitest";
import { GeocodingError, searchAddresses } from "./geocoding";

const feature = (properties: Record<string, unknown>, coordinates: unknown = [4.85, 45.76]) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates },
  properties,
});

function mockFetch(body: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchAddresses", () => {
  it("interroge la Géoplateforme et simplifie les résultats", async () => {
    const fetch = mockFetch({
      features: [
        feature({ id: "69386_0640_00012", name: "12 Boulevard des Belges", postcode: "69006", city: "Lyon", type: "housenumber" }),
        feature({ id: "69123", name: "Lyon", postcode: "69001", city: "Lyon", context: "69, Rhône, Auvergne-Rhône-Alpes", type: "municipality" }),
        feature({ id: "bad", name: "Sans coordonnées" }, null),
        feature({ name: "Sans identifiant" }),
      ],
    });

    const results = await searchAddresses("12 bd des belges", [4.85, 45.76]);

    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://data.geopf.fr/geocodage/search");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      q: "12 bd des belges",
      autocomplete: "1",
      index: "address",
      lon: "4.85",
      lat: "45.76",
    });
    expect(results).toEqual([
      { id: "69386_0640_00012", name: "12 Boulevard des Belges", city: "69006 Lyon", lngLat: [4.85, 45.76] },
      { id: "69123", name: "Lyon", city: "69, Rhône, Auvergne-Rhône-Alpes", lngLat: [4.85, 45.76] },
    ]);
  });

  it("distingue la saturation des autres pannes", async () => {
    mockFetch({}, 429);
    await expect(searchAddresses("lyon", null)).rejects.toEqual(new GeocodingError("rate-limited"));
    mockFetch({}, 500);
    await expect(searchAddresses("lyon", null)).rejects.toEqual(new GeocodingError("unavailable"));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(searchAddresses("lyon", null)).rejects.toBeInstanceOf(GeocodingError);
  });
});
