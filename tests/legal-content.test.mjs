import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLegalSections, validateLegalContent, isSafeLegalUrl } from "../lib/legal-content.ts";

const validDocument = {
  title: "Privacy Policy",
  introduction: "Existing introduction",
  meta_description: "Search summary",
  sections: [{
    id: "data-use",
    title: "Data use",
    blocks: [
      { type: "heading", text: "Details" },
      { type: "paragraph", text: "Plain text only." },
      { type: "list", items: ["First item", "Second item"] },
      { type: "link", label: "Contact", url: "mailto:privacy@example.com" },
    ],
  }],
};

test("accepts the supported legal document block types", () => {
  assert.deepEqual(validateLegalContent(validDocument), validDocument);
});

test("rejects markup in text and unsafe link schemes", () => {
  assert.throws(() => validateLegalContent({
    ...validDocument,
    sections: [{ ...validDocument.sections[0], blocks: [{ type: "paragraph", text: "<script>alert(1)</script>" }] }],
  }), /HTML markup is not allowed/);
  for (const url of ["javascript:alert(1)", "data:text/html,evil", "file:///etc/passwd"]) {
    assert.equal(isSafeLegalUrl(url), false, `${url} must be rejected`);
  }
});

test("permits HTTPS and mailto links only", () => {
  assert.equal(isSafeLegalUrl("https://campusconnect.example/privacy"), true);
  assert.equal(isSafeLegalUrl("mailto:privacy@example.com"), true);
});

test("normalizes old paragraph arrays and preserves the known email placeholder link safely", () => {
  const sections = normalizeLegalSections([{
    id: "contact",
    title: "Contact",
    paragraphs: ["Contact: <a href=\"mailto:[YOUR_EMAIL]\">[YOUR_EMAIL]</a>"],
  }]);
  assert.deepEqual(sections[0].blocks, [
    { type: "link", prefix: "Contact:", label: "[YOUR_EMAIL]", url: "mailto:YOUR_EMAIL" },
  ]);
});
