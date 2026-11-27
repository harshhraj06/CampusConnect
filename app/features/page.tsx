import { publicMetadata } from "@/lib/campus-seo";
import { Breadcrumb } from "../campus-seo-content";
import PublicFeatureSummary from "../public-feature-summary";

export const metadata = publicMetadata("/features");

export default function FeaturesPage() {
  return (
    <main className="ccLegalMain">
      <Breadcrumb path="/features" />
      <h1>CampusConnect features</h1>
      <PublicFeatureSummary />
    </main>
  );
}
