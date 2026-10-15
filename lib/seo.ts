export const SITE_NAME = "Zigzag";

export const SITE_TITLE = "Zigzag — l'ordre de visite le plus rapide pour vos tournées";

export const SITE_DESCRIPTION =
  "Saisissez les adresses de votre tournée : Zigzag calcule l'ordre de visite le plus rapide et ajoute vos arrêts (carburant, pause, parking) au meilleur endroit du trajet. Gratuit, sans compte.";

// Lue au build. Sur Vercel, l'URL de production sert de valeur par défaut si la variable manque.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_LOCALE = "fr_FR";

// Couleur du sol de la carte : la barre d'état se fond dans la carte.
export const THEME_COLOR = "#EEEFEC";

/** Sérialise un objet JSON-LD sans risque d'injection HTML. */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "TravelApplication",
  applicationSubCategory: "Navigation",
  operatingSystem: "Tous (navigateur web)",
  inLanguage: "fr",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
};

export function faqPageJsonLd(faq: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}
