import LegalDocument from "../legal-document";
import { getPublishedLegalDocument, privacyFallback } from "../legal-data";

export const revalidate = 0;

export async function generateMetadata() {
  const content = await getPublishedLegalDocument("privacy", privacyFallback);
  return {
    title: content.title,
    description: content.meta_description,
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const content = await getPublishedLegalDocument("privacy", privacyFallback);
  return (
    <LegalDocument kind="privacy" content={content} />
  );
}
