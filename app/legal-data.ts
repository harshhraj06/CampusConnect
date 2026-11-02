import { createClient } from "@supabase/supabase-js";
import { normalizeLegalSections, validateLegalContent, type LegalDocumentContent } from "@/lib/legal-content";

export const privacyFallback: LegalDocumentContent = {
  title: "Privacy Policy",
  introduction: "CampusConnect Pro (“we”, “us”) is a campus platform for academics, attendance, placements, events and networking. This policy explains what data we collect and how we use it.",
  meta_description: "CampusConnect Privacy Policy — how we collect, use, and protect your data.",
  sections: [
    { id: "data-we-collect", title: "1. Data we collect", blocks: [{ type: "list", items: ["Account data: name, email, role, college ID / USN, profile details and photo.", "Academic data: attendance, marks, timetables, assignments and syllabus progress.", "Placement data: resumes, applications and related documents you upload.", "Content you create: messages, posts, event registrations and notes.", "Technical data: authentication cookies and local storage needed to keep you signed in and secure."] }] },
    { id: "how-we-use-it", title: "2. How we use it", blocks: [{ type: "paragraph", text: "To run the platform, authenticate you, show you your academic and campus information, send notifications and emails, keep the service secure, and provide AI-assisted features you choose to use." }] },
    { id: "service-providers", title: "3. Service providers who process data for us", blocks: [{ type: "list", items: ["Supabase: database, authentication and file storage.", "Cloudflare: hosting and delivery.", "Brevo: transactional emails (verification codes, notifications).", "Groq (AI provider): text you submit to AI chat, quiz or document features is sent to this provider to generate a response.", "Google (Fonts, Drive/Docs embeds): loaded when those features are used."] }, { type: "paragraph", text: "We do not sell your personal data." }] },
    { id: "cookies-and-local-storage", title: "4. Cookies and local storage", blocks: [{ type: "paragraph", text: "We use essential cookies and storage (authentication session cookies, security tokens, your cookie choice and an offline cache) that the platform needs to work. We do not currently load advertising or analytics trackers. If that changes, we will ask for your consent first. You can reopen your choices at any time using the “Privacy” button." }] },
    { id: "retention", title: "5. Retention", blocks: [{ type: "paragraph", text: "[STATE RETENTION PERIOD, e.g. we keep your data while your account is active and delete it within X days after you delete your account or your institution asks us to.]" }] },
    { id: "your-rights", title: "6. Your rights", blocks: [{ type: "paragraph", text: "You can access and correct your information in your profile, and delete your account from within the app. You can also withdraw consent, or request access, correction or erasure, by writing to us. Where required by Indian law (including the Digital Personal Data Protection Act, 2023), we will respond within the legally required time." }] },
    { id: "children", title: "7. Children", blocks: [{ type: "paragraph", text: "If you are under 18, you should use CampusConnect only with the consent of a parent or guardian, or through your institution. [CONFIRM WITH YOUR LEGAL ADVISER.]" }] },
    { id: "security", title: "8. Security", blocks: [{ type: "paragraph", text: "We use encryption in transit, access controls, row-level security and rate limiting. No system is perfectly secure; please protect your password." }] },
    { id: "contact-and-grievance-officer", title: "9. Contact and grievance officer", blocks: [{ type: "link", prefix: "[YOUR NAME], Grievance Officer:", label: "[YOUR_EMAIL]", url: "mailto:YOUR_EMAIL" }] },
    { id: "changes", title: "10. Changes", blocks: [{ type: "paragraph", text: "We may update this policy and will change the date above when we do." }] },
  ],
};

export const termsFallback: LegalDocumentContent = {
  title: "Terms of Use",
  introduction: "By creating an account or using CampusConnect Pro you agree to these terms.",
  meta_description: "CampusConnect Terms of Use — rules and responsibilities for using the platform.",
  sections: [
    { id: "eligibility-and-accounts", title: "1. Eligibility and accounts", blocks: [{ type: "paragraph", text: "Use your real identity and keep your login details private. You are responsible for activity under your account." }] },
    { id: "acceptable-use", title: "2. Acceptable use", blocks: [{ type: "list", items: ["No harassment, hate speech, impersonation or illegal content.", "No attempts to access other users’ data, bypass security, or overload the service.", "Do not upload content you do not have the right to share."] }] },
    { id: "your-content", title: "3. Your content", blocks: [{ type: "paragraph", text: "You keep ownership of what you upload. You give us permission to store and display it as needed to run the platform. We may remove content that breaks these terms." }] },
    { id: "ai-features", title: "4. AI features", blocks: [{ type: "paragraph", text: "AI responses may be inaccurate. Check important information, such as deadlines, marks and attendance, against official sources." }] },
    { id: "availability", title: "5. Availability", blocks: [{ type: "paragraph", text: "We try to keep the service running but do not guarantee uninterrupted access. We may change or discontinue features." }] },
    { id: "suspension", title: "6. Suspension", blocks: [{ type: "paragraph", text: "We may suspend or remove accounts that violate these terms or at the request of your institution." }] },
    { id: "liability", title: "7. Liability", blocks: [{ type: "paragraph", text: "To the extent permitted by law, the platform is provided “as is” and we are not liable for indirect or consequential losses. [REVIEW WITH A LEGAL ADVISER.]" }] },
    { id: "governing-law", title: "8. Governing law", blocks: [{ type: "paragraph", text: "These terms are governed by the laws of India. [ADD JURISDICTION / CITY.]" }] },
    { id: "contact", title: "9. Contact", blocks: [{ type: "link", label: "[YOUR_EMAIL]", url: "mailto:YOUR_EMAIL" }] },
  ],
};

export async function getPublishedLegalDocument(slug: "privacy" | "terms", fallback: LegalDocumentContent): Promise<LegalDocumentContent> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return fallback;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.rpc("get_published_legal_document", { p_slug: slug });
    if (error || !data || typeof data !== "object") return fallback;
    const document = data as Record<string, unknown>;
    const validated = validateLegalContent({
      title: document.title,
      introduction: document.introduction,
      meta_description: document.meta_description,
      sections: normalizeLegalSections(document.sections),
    });
    return validated;
  } catch {
    return fallback;
  }
}
