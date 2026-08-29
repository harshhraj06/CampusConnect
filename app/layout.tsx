import type { Metadata, Viewport } from "next";
import "./globals.css";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {metadataBase:new URL("https://campusconnect-pro.harshlucky201.chatgpt.site"),title:"CampusConnect Pro — Student Success Platform",description:"Academics, placements, campus networking and resume building in one verified student platform.",openGraph:{title:"CampusConnect Pro",description:"Learn. Connect. Get placed.",type:"website",images:[{url:"/og.png",width:1200,height:630,alt:"CampusConnect Pro — Learn. Connect. Get placed."}]},twitter:{card:"summary_large_image",title:"CampusConnect Pro",description:"Learn. Connect. Get placed.",images:["/og.png"]},other:{"codex-preview":"development"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body suppressHydrationWarning>{children}</body></html>}
