import { describe, expect, it } from "vitest";
import { highlight } from "./text";

const bold = (text: string, query: string) =>
  highlight(text, query)
    .map((p) => (p.match ? `[${p.text}]` : p.text))
    .join("");

describe("highlight", () => {
  it("met en gras les débuts de mots saisis", () => {
    expect(bold("12 Boulevard des Belges", "12 bd des bel")).toBe("[12] Boulevard [des] [Bel]ges");
  });

  it("ignore accents et majuscules, garde le texte d'origine", () => {
    expect(bold("Rue de l'Église", "rue eglise")).toBe("[Rue] de l'[Église]");
  });

  it("ne marque pas le milieu d'un mot", () => {
    expect(bold("Avenue Foch", "nue")).toBe("Avenue Foch");
  });

  it("renvoie le texte entier quand la saisie est vide", () => {
    expect(highlight("Lyon", "  ")).toEqual([{ text: "Lyon", match: false }]);
  });
});
