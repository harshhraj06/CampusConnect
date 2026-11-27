import { publicMetadata } from "@/lib/campus-seo";
import LegalDocument from "../legal-document";
import { getPublishedLegalDocument, privacyFallback } from "../legal-data";

export const revalidate = 0;

export const metadata = publicMetadata("/privacy");

export default async function PrivacyPage() {
  const content = await getPublishedLegalDocument("privacy", privacyFallback);
  return (
    <LegalDocument kind="privacy" content={content} />
  );
}
