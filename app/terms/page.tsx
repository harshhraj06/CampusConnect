import { publicMetadata } from "@/lib/campus-seo";
import LegalDocument from "../legal-document";
import { getPublishedLegalDocument, termsFallback } from "../legal-data";

export const revalidate = 0;

export const metadata = publicMetadata("/terms");

export default async function TermsPage() {
  const content = await getPublishedLegalDocument("terms", termsFallback);
  return (
    <LegalDocument kind="terms" content={content} />
  );
}
