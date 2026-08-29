import {
  NextResponse,
} from "next/server";

import {
  extractText,
  getDocumentProxy,
} from "unpdf";


const SUPABASE_URL =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL
    ?.trim()
    .replace(/\/$/, "") || "";

const PUBLISHABLE_KEY =
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?.trim() || "";

const MAX_FILE_BYTES =
  10 * 1024 * 1024;

const MAX_EXTRACTED_CHARACTERS =
  1_200_000;

const CHUNK_CHARACTERS =
  1_600;

const CHUNK_OVERLAP =
  240;


type JsonRow =
  Record<string, unknown>;

type SourceType =
  | "learning_resource"
  | "profile_document";

type SourceRecord = {
  sourceType: SourceType;
  sourceId: string;
  title: string;
  subject: string;
  department: string;
  semester: string;
  documentType: string;
  storageBucket: string;
  storagePath: string;
  sourceUrl: string;
  fallbackText: string;
  fileName: string;
};


type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type IndexedChunk = {
  content: string;
  pageNumber: number;
  pageChunkIndex: number;
};


function bearerToken(
  request: Request
): string {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authorization
    .slice(7)
    .trim();
}


function isUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}


async function database<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  if (
    !SUPABASE_URL ||
    !PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  const headers =
    new Headers(init.headers);

  headers.set(
    "apikey",
    PUBLISHABLE_KEY
  );

  headers.set(
    "Authorization",
    `Bearer ${accessToken}`
  );

  if (
    init.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${path}`,
      {
        ...init,
        headers,
        cache: "no-store",
      }
    );

  if (!response.ok) {
    const detail =
      await response.text();

    throw new Error(
      `Supabase request failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}


async function authenticatedUser(
  accessToken: string
): Promise<string> {
  const response =
    await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization:
            `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error("UNAUTHORIZED");
  }

  const user =
    await response.json() as {
      id?: string;
    };

  if (!user.id) {
    throw new Error("UNAUTHORIZED");
  }

  return user.id;
}


function textValue(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}


async function loadSource(
  sourceType: SourceType,
  sourceId: string,
  accessToken: string
): Promise<SourceRecord> {
  if (
    sourceType ===
    "learning_resource"
  ) {
    const rows =
      await database<JsonRow[]>(
        `learning_resources?select=id,title,subject,description,department,semester,resource_type,file_path,file_name,url,is_verified&id=eq.${encodeURIComponent(sourceId)}&limit=1`,
        accessToken
      );

    const row = rows?.[0];

    if (!row) {
      throw new Error(
        "RESOURCE_NOT_FOUND"
      );
    }

    return {
      sourceType,
      sourceId,
      title:
        textValue(row.title) ||
        "Learning resource",
      subject:
        textValue(row.subject),
      department:
        textValue(row.department),
      semester:
        textValue(row.semester),
      documentType:
        textValue(row.resource_type),
      storageBucket:
        "learning-resources",
      storagePath:
        textValue(row.file_path),
      sourceUrl:
        textValue(row.url),
      fallbackText:
        textValue(row.description),
      fileName:
        textValue(row.file_name),
    };
  }

  const rows =
    await database<JsonRow[]>(
      `profile_documents?select=id,owner_id,file_name,file_path,document_type&id=eq.${encodeURIComponent(sourceId)}&limit=1`,
      accessToken
    );

  const row = rows?.[0];

  if (!row) {
    throw new Error(
      "RESOURCE_NOT_FOUND"
    );
  }

  return {
    sourceType,
    sourceId,
    title:
      textValue(row.file_name) ||
      "Private document",
    subject: "",
    department: "",
    semester: "",
    documentType:
      textValue(row.document_type),
    storageBucket:
      "campus-documents",
    storagePath:
      textValue(row.file_path),
    sourceUrl: "",
    fallbackText: "",
    fileName:
      textValue(row.file_name),
  };
}


function encodedStoragePath(
  value: string
): string {
  return value
    .split("/")
    .map(segment =>
      encodeURIComponent(segment)
    )
    .join("/");
}


async function downloadStorageFile(
  source: SourceRecord,
  accessToken: string
): Promise<{
  bytes: ArrayBuffer;
  mimeType: string;
}> {
  const response =
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/authenticated/${encodeURIComponent(source.storageBucket)}/${encodedStoragePath(source.storagePath)}`,
      {
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization:
            `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      "DOCUMENT_DOWNLOAD_FAILED"
    );
  }

  const declaredSize =
    Number(
      response.headers.get(
        "content-length"
      ) || 0
    );

  if (
    declaredSize >
    MAX_FILE_BYTES
  ) {
    throw new Error(
      "DOCUMENT_TOO_LARGE"
    );
  }

  const bytes =
    await response.arrayBuffer();

  if (
    bytes.byteLength >
    MAX_FILE_BYTES
  ) {
    throw new Error(
      "DOCUMENT_TOO_LARGE"
    );
  }

  return {
    bytes,
    mimeType:
      response.headers
        .get("content-type")
        ?.split(";")[0]
        ?.trim()
        .toLowerCase() || "",
  };
}


function normalizeText(
  value: string
): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(
      0,
      MAX_EXTRACTED_CHARACTERS
    );
}


async function extractDocumentText(
  source: SourceRecord,
  accessToken: string
): Promise<{
  text: string;
  pages: ExtractedPage[];
  pageCount: number;
  mimeType: string;
}> {
  if (!source.storagePath) {
    const fallback =
      normalizeText(
        source.fallbackText
      );

    if (fallback.length < 40) {
      throw new Error(
        "NO_INDEXABLE_CONTENT"
      );
    }

    return {
      text: fallback,
      pages: [{
        pageNumber: 1,
        text: fallback,
      }],
      pageCount: 1,
      mimeType: "text/plain",
    };
  }

  const {
    bytes,
    mimeType,
  } = await downloadStorageFile(
    source,
    accessToken
  );

  const fileName =
    `${source.fileName} ${source.storagePath}`
      .toLowerCase();

  const isPdf =
    mimeType === "application/pdf" ||
    fileName.includes(".pdf");

  const isPlainText =
    mimeType.startsWith("text/") ||
    /\.(txt|md)$/i.test(fileName);

  if (isPdf) {
    const document =
      await getDocumentProxy(
        new Uint8Array(bytes)
      );

    const extracted =
      await extractText(
        document,
        {
          mergePages: false,
        }
      );

    const rawPages =
      Array.isArray(extracted.text)
        ? extracted.text
        : [String(extracted.text || "")];

    const pages: ExtractedPage[] = [];
    let extractedCharacters = 0;

    rawPages.forEach((rawPage, index) => {
      const remaining =
        MAX_EXTRACTED_CHARACTERS -
        extractedCharacters;

      if (remaining <= 0) return;

      const pageText = normalizeText(
        String(rawPage || "")
      ).slice(0, remaining);

      if (!pageText) return;

      pages.push({
        pageNumber: index + 1,
        text: pageText,
      });

      extractedCharacters +=
        pageText.length;
    });

    const text = pages
      .map(page =>
        `[PAGE ${page.pageNumber}]\n${page.text}`
      )
      .join("\n\n");

    if (text.length < 40) {
      throw new Error(
        "PDF_HAS_NO_EXTRACTABLE_TEXT"
      );
    }

    return {
      text,
      pages,
      pageCount: rawPages.length,
      mimeType: "application/pdf",
    };
  }

  if (isPlainText) {
    const text =
      normalizeText(
        new TextDecoder().decode(bytes)
      );

    if (text.length < 40) {
      throw new Error(
        "NO_INDEXABLE_CONTENT"
      );
    }

    return {
      text,
      pages: [{
        pageNumber: 1,
        text,
      }],
      pageCount: 1,
      mimeType:
        mimeType || "text/plain",
    };
  }

  throw new Error(
    "UNSUPPORTED_DOCUMENT_TYPE"
  );
}


function chunkText(
  text: string
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end =
      Math.min(
        start + CHUNK_CHARACTERS,
        text.length
      );

    if (end < text.length) {
      const paragraphBreak =
        text.lastIndexOf(
          "\n\n",
          end
        );

      const sentenceBreak =
        text.lastIndexOf(
          ". ",
          end
        );

      const preferredBreak =
        Math.max(
          paragraphBreak,
          sentenceBreak
        );

      if (
        preferredBreak >
        start + 800
      ) {
        end = preferredBreak + 1;
      }
    }

    const chunk =
      text
        .slice(start, end)
        .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    start = Math.max(
      end - CHUNK_OVERLAP,
      start + 1
    );
  }

  return chunks.slice(0, 300);
}


function chunkPages(
  pages: ExtractedPage[]
): IndexedChunk[] {
  return pages
    .flatMap(page =>
      chunkText(page.text).map(
        (content, pageChunkIndex) => ({
          content,
          pageNumber: page.pageNumber,
          pageChunkIndex,
        })
      )
    )
    .slice(0, 600);
}


async function sha256(
  value: string
): Promise<string> {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value)
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map(byte =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}


function publicError(
  code: string
): string {
  const messages:
    Record<string, string> = {
      RESOURCE_NOT_FOUND:
        "This document is unavailable or your account does not have access.",
      DOCUMENT_DOWNLOAD_FAILED:
        "The document could not be downloaded from private storage.",
      DOCUMENT_TOO_LARGE:
        "Documents larger than 10 MB cannot be indexed.",
      NO_INDEXABLE_CONTENT:
        "This resource does not contain enough text to index.",
      PDF_HAS_NO_EXTRACTABLE_TEXT:
        "This PDF appears to be scanned or has no extractable text. OCR support will be added later.",
      UNSUPPORTED_DOCUMENT_TYPE:
        "Phase 4 indexing currently supports text-based PDF, TXT and Markdown files.",
    };

  return messages[code] ||
    "The document could not be indexed.";
}


export async function POST(
  request: Request
) {
  let accessToken = "";
  let documentId = "";

  try {
    accessToken =
      bearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {status: 401}
      );
    }

    if (
      !SUPABASE_URL ||
      !PUBLISHABLE_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "CampusConnect database configuration is unavailable.",
        },
        {status: 503}
      );
    }

    const body =
      await request
        .json()
        .catch(() => null) as {
          sourceType?: unknown;
          sourceId?: unknown;
        } | null;

    const sourceType =
      body?.sourceType ===
        "learning_resource" ||
      body?.sourceType ===
        "profile_document"
        ? body.sourceType
        : null;

    const sourceId =
      typeof body?.sourceId ===
      "string"
        ? body.sourceId.trim()
        : "";

    if (
      !sourceType ||
      !isUuid(sourceId)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid CampusConnect document is required.",
        },
        {status: 400}
      );
    }

    const userId =
      await authenticatedUser(
        accessToken
      );

    const source =
      await loadSource(
        sourceType,
        sourceId,
        accessToken
      );

    const documentRows =
      await database<JsonRow[]>(
        "ai_documents?on_conflict=source_type,source_id,owner_id&select=id",
        accessToken,
        {
          method: "POST",
          headers: {
            Prefer:
              "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            owner_id: userId,
            source_type:
              source.sourceType,
            source_id:
              source.sourceId,
            visibility: "private",
            title: source.title,
            subject: source.subject,
            department:
              source.department,
            semester: source.semester,
            document_type:
              source.documentType,
            storage_bucket:
              source.storageBucket,
            storage_path:
              source.storagePath,
            source_url:
              source.sourceUrl,
            status: "processing",
            extraction_error: "",
            updated_at:
              new Date().toISOString(),
          }),
        }
      );

    documentId =
      String(
        documentRows?.[0]?.id || ""
      );

    if (!documentId) {
      throw new Error(
        "DOCUMENT_REGISTRY_FAILED"
      );
    }

    const extracted =
      await extractDocumentText(
        source,
        accessToken
      );

    const chunks =
      chunkPages(extracted.pages);

    if (!chunks.length) {
      throw new Error(
        "NO_INDEXABLE_CONTENT"
      );
    }

    await database<void>(
      `ai_document_chunks?document_id=eq.${encodeURIComponent(documentId)}`,
      accessToken,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal",
        },
      }
    );

    for (
      let offset = 0;
      offset < chunks.length;
      offset += 40
    ) {
      const batch =
        chunks
          .slice(offset, offset + 40)
          .map((chunk, index) => ({
            document_id: documentId,
            owner_id: userId,
            chunk_index:
              offset + index,
            content: chunk.content,
            token_count:
              Math.ceil(
                chunk.content.length / 4
              ),
            metadata: {
              sourceType:
                source.sourceType,
              sourceId:
                source.sourceId,
              title: source.title,
              subject: source.subject,
              pageNumber:
                chunk.pageNumber,
              pageChunkIndex:
                chunk.pageChunkIndex,
              totalPages:
                extracted.pageCount,
            },
          }));

      await database<void>(
        "ai_document_chunks",
        accessToken,
        {
          method: "POST",
          headers: {
            Prefer: "return=minimal",
          },
          body: JSON.stringify(batch),
        }
      );
    }

    const contentHash =
      await sha256(extracted.text);

    await database<void>(
      `ai_documents?id=eq.${encodeURIComponent(documentId)}`,
      accessToken,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "ready",
          mime_type:
            extracted.mimeType,
          content_hash:
            contentHash,
          extracted_character_count:
            extracted.text.length,
          chunk_count: chunks.length,
          extraction_error: "",
          updated_at:
            new Date().toISOString(),
        }),
      }
    );

    return NextResponse.json({
      ok: true,
      documentId,
      title: source.title,
      characters:
        extracted.text.length,
      chunks: chunks.length,
      pages: extracted.pageCount,
      retrieval: "page_aware_full_text",
      embeddings: false,
    });

  } catch (error) {
    const code =
      error instanceof Error
        ? error.message
        : "INDEXING_FAILED";

    if (
      documentId &&
      accessToken
    ) {
      try {
        await database<void>(
          `ai_documents?id=eq.${encodeURIComponent(documentId)}`,
          accessToken,
          {
            method: "PATCH",
            headers: {
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              status: "failed",
              extraction_error:
                publicError(code),
              updated_at:
                new Date().toISOString(),
            }),
          }
        );
      } catch (updateError) {
        console.error(
          "[CampusConnect AI] document status update failed:",
          updateError
        );
      }
    }

    if (code === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          error:
            "Your session has expired. Please sign in again.",
        },
        {status: 401}
      );
    }

    const expectedCodes = [
      "RESOURCE_NOT_FOUND",
      "DOCUMENT_DOWNLOAD_FAILED",
      "DOCUMENT_TOO_LARGE",
      "NO_INDEXABLE_CONTENT",
      "PDF_HAS_NO_EXTRACTABLE_TEXT",
      "UNSUPPORTED_DOCUMENT_TYPE",
    ];

    if (
      expectedCodes.includes(code)
    ) {
      return NextResponse.json(
        {
          error: publicError(code),
        },
        {
          status:
            code ===
            "RESOURCE_NOT_FOUND"
              ? 404
              : 422,
        }
      );
    }

    console.error(
      "[CampusConnect AI] document indexing failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The document could not be indexed right now.",
      },
      {status: 503}
    );
  }
}
