import { describe, expect, it } from "vitest";
import { navigationLinks } from "./navigation";

describe("navigationLinks", () => {
  it("ouvre Waze, Google Maps et Plans en latitude,longitude", () => {
    expect(navigationLinks([4.8357, 45.764])).toEqual([
      { name: "Waze", href: "https://waze.com/ul?ll=45.764,4.8357&navigate=yes" },
      { name: "Google Maps", href: "https://www.google.com/maps/dir/?api=1&destination=45.764,4.8357&travelmode=driving" },
      { name: "Plans", href: "https://maps.apple.com/?daddr=45.764,4.8357&dirflg=d" },
    ]);
  });
});
