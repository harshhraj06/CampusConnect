import { publicMetadata } from "@/lib/campus-seo";
import CookieCacheSettings from "../../cookie-cache-settings";

export const metadata = publicMetadata("/privacy/cookies");

export default function CookiesAndCachePage() {
  return <CookieCacheSettings />;
}
