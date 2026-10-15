import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useCases } from "@/lib/content";

export function generateStaticParams() {
  return useCases.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/cas-usage/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const useCase = useCases.find((u) => u.slug === slug);
  if (!useCase) return {};
  return {
    title: useCase.title,
    description: useCase.description,
    alternates: { canonical: `/cas-usage/${slug}` },
  };
}

export default async function UseCasePage({ params }: PageProps<"/cas-usage/[slug]">) {
  const { slug } = await params;
  const useCase = useCases.find((u) => u.slug === slug);
  if (!useCase) notFound();

  return (
    <article>
      <h1>{useCase.title}</h1>
      {useCase.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </article>
  );
}
