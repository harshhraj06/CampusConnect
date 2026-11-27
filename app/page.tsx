import PublicFeatureSummary from "./public-feature-summary";
import { publicMetadata } from "@/lib/campus-seo";
import CampusConnectApp from "./campusconnect-app";

export const metadata = publicMetadata("/");

export default function HomePage() {
  return <CampusConnectApp publicContent={<PublicFeatureSummary />} />;
}
