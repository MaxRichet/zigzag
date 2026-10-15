import type { Metadata } from "next";
import Link from "next/link";
import { useCases } from "@/lib/content";

export const metadata: Metadata = {
  title: "Cas d'usage",
  description: "Comment les professionnels de terrain utilisent Zigzag pour leurs tournées.",
  alternates: { canonical: "/cas-usage" },
};

export default function UseCasesPage() {
  return (
    <article>
      <h1>Cas d&apos;usage</h1>
      <ul>
        {useCases.map((u) => (
          <li key={u.slug}>
            <Link href={`/cas-usage/${u.slug}`}>{u.title}</Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
