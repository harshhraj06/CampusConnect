export type LegalBlock =
  | { type: "paragraph" | "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "link"; label: string; url: string; prefix?: string };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocumentContent = {
  title: string;
  introduction: string;
  meta_description: string;
  sections: LegalSection[];
};

const textLimit = 10000;

function cleanText(value: unknown, limit = textLimit): string {
  if (typeof value !== "string") throw new Error("Legal text must be a string");
  const text = value.trim();
  if (text.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    throw new Error("Legal text is too long or contains invalid characters");
  }
  if (/<\/?[a-z][^>]*>/i.test(text)) throw new Error("HTML markup is not allowed in legal text");
  return text;
}

export function isSafeLegalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

export function validateLegalContent(input: unknown): LegalDocumentContent {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Legal document must be an object");
  }
  const data = input as Record<string, unknown>;
  if (!Array.isArray(data.sections) || data.sections.length < 1 || data.sections.length > 100) {
    throw new Error("A legal document must have between 1 and 100 sections");
  }
  const seenIds = new Set<string>();
  const sections = data.sections.map((inputSection, sectionIndex): LegalSection => {
    if (!inputSection || typeof inputSection !== "object" || Array.isArray(inputSection)) {
      throw new Error(`Section ${sectionIndex + 1} is invalid`);
    }
    const section = inputSection as Record<string, unknown>;
    const title = cleanText(section.title, 200);
    const id = typeof section.id === "string" && /^[a-z0-9-]{1,100}$/.test(section.id)
      ? section.id
      : `section-${sectionIndex + 1}`;
    if (!title || seenIds.has(id)) throw new Error("Section titles are required and IDs must be unique");
    seenIds.add(id);
    let blocks: LegalBlock[];
    if (Array.isArray(section.blocks)) {
      blocks = section.blocks.map((item): LegalBlock => {
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid legal content block");
        const block = item as Record<string, unknown>;
        if (block.type === "paragraph" || block.type === "heading") {
          return { type: block.type, text: cleanText(block.text) };
        }
        if (block.type === "list" && Array.isArray(block.items) && block.items.length <= 100) {
          return { type: "list", items: block.items.map(value => cleanText(value, 2000)) };
        }
        if (block.type === "link") {
          const label = cleanText(block.label, 500);
          const url = cleanText(block.url, 2000);
          if (!label || !isSafeLegalUrl(url)) throw new Error("Links must use HTTP, HTTPS, or mailto URLs");
          const prefix = block.prefix === undefined ? undefined : cleanText(block.prefix, 500);
          return { type: "link", label, url, ...(prefix ? { prefix } : {}) };
        }
        throw new Error("Unsupported legal content block");
      });
    } else if (Array.isArray(section.paragraphs)) {
      blocks = section.paragraphs.map(value => ({ type: "paragraph", text: cleanText(value) }));
    } else {
      throw new Error(`Section ${sectionIndex + 1} needs content blocks`);
    }
    if (blocks.length > 200) throw new Error("A section has too many content blocks");
    return { id, title, blocks };
  });
  const title = cleanText(data.title, 200);
  const introduction = cleanText(data.introduction, 5000);
  const meta_description = cleanText(data.meta_description ?? "", 5000);
  if (!title) throw new Error("Title is required");
  return { title, introduction, meta_description, sections };
}

export function normalizeLegalSections(sections: unknown): LegalSection[] {
  const normalized = Array.isArray(sections) ? sections.map(inputSection => {
    if (!inputSection || typeof inputSection !== "object" || Array.isArray(inputSection)) return inputSection;
    const section = inputSection as Record<string, unknown>;
    if (!Array.isArray(section.paragraphs)) return section;
    const blocks = section.paragraphs.flatMap(value => {
      if (typeof value !== "string") return [{ type: "paragraph", text: value }];
      const oldPlaceholderLink = value.match(/^(.*?)<a\s+href=["']mailto:\[YOUR_EMAIL\]["']>(.*?)<\/a>(.*)$/i);
      if (!oldPlaceholderLink) return [{ type: "paragraph", text: value }];
      const result: Array<Record<string, unknown>> = [];
      result.push({ type: "link", prefix: oldPlaceholderLink[1], label: oldPlaceholderLink[2], url: "mailto:YOUR_EMAIL" });
      if (oldPlaceholderLink[3]) result.push({ type: "paragraph", text: oldPlaceholderLink[3] });
      return result;
    });
    return { ...section, blocks };
  }) : sections;
  return validateLegalContent({
    title: "Document",
    introduction: "",
    meta_description: "",
    sections: normalized,
  }).sections;
}