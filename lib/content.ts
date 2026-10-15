// Pages de contenu indexables. Ajouter une entrée ici crée la page et l'ajoute au sitemap.
// Contenu factice : à rédiger avant la mise en ligne.

export type FaqItem = { question: string; answer: string };

export type UseCase = {
  slug: string;
  title: string;
  description: string;
  body: string[];
};

export const faq: FaqItem[] = [
  {
    question: "Question à rédiger ?",
    answer: "Réponse à rédiger.",
  },
];

export const useCases: UseCase[] = [
  {
    slug: "exemple",
    title: "Cas d'usage à rédiger",
    description: "Description à rédiger.",
    body: ["Contenu à rédiger."],
  },
];

/** Chemins des pages de contenu, pour le sitemap. */
export const contentPaths: string[] = [
  "/faq",
  "/cas-usage",
  ...useCases.map((u) => `/cas-usage/${u.slug}`),
];
