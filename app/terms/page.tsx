import LegalDocument from "../legal-document";
import { getPublishedLegalDocument, termsFallback } from "../legal-data";

export const revalidate = 0;

export async function generateMetadata() {
  const content = await getPublishedLegalDocument("terms", termsFallback);
  return {
    title: content.title,
    description: content.meta_description,
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const content = await getPublishedLegalDocument("terms", termsFallback);
  return (
    <LegalDocument kind="terms" content={content} />
  );
}
