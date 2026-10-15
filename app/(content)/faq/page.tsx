import type { Metadata } from "next";
import { faq } from "@/lib/content";
import { faqPageJsonLd, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description: "Réponses aux questions fréquentes sur Zigzag.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <article>
      <h1>Questions fréquentes</h1>
      {faq.map(({ question, answer }) => (
        <section key={question}>
          <h2>{question}</h2>
          <p>{answer}</p>
        </section>
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqPageJsonLd(faq)) }}
      />
    </article>
  );
}
