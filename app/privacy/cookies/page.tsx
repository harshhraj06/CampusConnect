import { Breadcrumb } from "../../campus-seo-content";
import { publicMetadata } from "@/lib/campus-seo";
import CookieCacheSettings from "../../cookie-cache-settings";

export const metadata = publicMetadata("/privacy/cookies");

export default function CookiesAndCachePage() {
  return <><Breadcrumb path="/privacy/cookies" /><CookieCacheSettings /></>;
}
