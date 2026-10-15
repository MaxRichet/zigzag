import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

export default function ContentLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header>
        <nav aria-label="Navigation principale">
          <Link href="/">{SITE_NAME}</Link> · <Link href="/cas-usage">Cas d&apos;usage</Link> ·{" "}
          <Link href="/faq">FAQ</Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
