"use client";

import {useEffect, useRef, useState} from "react";
import {getSupabaseClient} from "../lib/supabase";

type Item = {pageNumber: number; summary: string; empty: boolean};
type Progress = {
  totalPages: number;
  currentPage: number;
  items: Item[];
  running: boolean;
  completed: boolean;
  wait: number;
  error: string;
};
type ApiResult = {
  ok?: boolean;
  totalPages?: number;
  title?: string;
  summary?: string;
  empty?: boolean;
  retryAfterSeconds?: number;
  error?: string;
};

const blank = (): Progress => ({
  totalPages: 0,
  currentPage: 0,
  items: [],
  running: false,
  completed: false,
  wait: 0,
  error: "",
});

function storageKey(sourceId: string) {
  return `campusconnect-notes-pages:${sourceId}`;
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Paused", "AbortError"));
    }, {once: true});
  });
}


function inlineSummaryText(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
        : part
    );
}

function summaryPoints(text: string) {
  return text
    .replace(/^\s*[-–—:]\s*/, "")
    .split(/(?:\r?\n\s*[-•]\s*|\s+[-–—]\s+)/)
    .map(point => point.trim())
    .filter(Boolean);
}

function FormattedPageSummary({text}: {text: string}) {
  const headingPattern = /\*\*(Main Ideas|Key Terms|Important Details)\*\*/gi;
  const matches = Array.from(text.matchAll(headingPattern));

  if (!matches.length) {
    const points = summaryPoints(text);
    return points.length > 1 ? (
      <ul>{points.map((point, index) => <li key={index}>{inlineSummaryText(point)}</li>)}</ul>
    ) : (
      <p>{inlineSummaryText(points[0] || text)}</p>
    );
  }

  return (
    <>
      {matches.map((match, index) => {
        const start = (match.index || 0) + match[0].length;
        const end = matches[index + 1]?.index ?? text.length;
        const points = summaryPoints(text.slice(start, end));

        return (
          <section className="campusAiFormattedSection" key={`${match[1]}-${index}`}>
            <h5>{match[1]}</h5>
            {points.length > 1 ? (
              <ul>{points.map((point, pointIndex) => <li key={pointIndex}>{inlineSummaryText(point)}</li>)}</ul>
            ) : (
              <p>{inlineSummaryText(points[0] || "No extractable content on this page.")}</p>
            )}
          </section>
        );
      })}
    </>
  );
}

export function NotesPageSummary({
  sourceId,
  sourceTitle,
}: {
  sourceId: string;
  sourceTitle: string;
}) {
  const [progress, setProgress] = useState<Progress>(blank);
  const [openPage, setOpenPage] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (!sourceId) {
      setProgress(blank());
      setOpenPage(null);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey(sourceId));
      if (!raw) {
        setProgress(blank());
        setOpenPage(null);
        return;
      }
      const saved = JSON.parse(raw) as Partial<Progress>;
      const items = Array.isArray(saved.items)
        ? saved.items.filter(item =>
            Number.isInteger(item?.pageNumber) &&
            typeof item?.summary === "string"
          )
        : [];
      setProgress({
        totalPages: Number(saved.totalPages || 0),
        currentPage: Number(saved.currentPage || 0),
        items,
        running: false,
        completed: Boolean(saved.completed),
        wait: 0,
        error: "",
      });
      setOpenPage(items.at(-1)?.pageNumber ?? null);
    } catch {
      window.localStorage.removeItem(storageKey(sourceId));
      setProgress(blank());
      setOpenPage(null);
    }

    return () => abortRef.current?.abort();
  }, [sourceId]);

  function pause() {
    abortRef.current?.abort();
    abortRef.current = null;
    setProgress(current => ({...current, running: false, wait: 0}));
  }

  async function start() {
    if (!sourceId || progress.running || progress.completed) return;
    const client = getSupabaseClient();
    const {data} = client ? await client.auth.getSession() : {data: {session: null}};
    const token = data.session?.access_token;
    if (!token) {
      setProgress(current => ({...current, error: "Your session expired. Sign in again."}));
      return;
    }

    let items = [...progress.items].sort((a, b) => a.pageNumber - b.pageNumber);
    let page = items.length ? items[items.length - 1].pageNumber + 1 : 1;
    let total = progress.totalPages;
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(current => ({...current, running: true, currentPage: page, error: ""}));

    try {
      while (!controller.signal.aborted && (!total || page <= total)) {
        setProgress(current => ({...current, currentPage: page, wait: 0, error: ""}));
        const response = await fetch("/api/ai/documents/summarize-page", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({sourceId, pageNumber: page}),
          signal: controller.signal,
        });
        const result = await response.json() as ApiResult;

        if (response.status === 429 && result.retryAfterSeconds) {
          const seconds = Math.max(5, Math.min(90, result.retryAfterSeconds));
          for (let remaining = seconds; remaining > 0; remaining -= 1) {
            setProgress(current => ({...current, wait: remaining}));
            await sleep(1000, controller.signal);
          }
          continue;
        }
        if (!response.ok || !result.ok) {
          throw new Error(result.error || `Page ${page} could not be summarized.`);
        }

        total = Number(result.totalPages || total || page);
        items = [...items.filter(item => item.pageNumber !== page), {
          pageNumber: page,
          summary: result.summary || "No summary was returned.",
          empty: Boolean(result.empty),
        }].sort((a, b) => a.pageNumber - b.pageNumber);

        const next: Progress = {
          totalPages: total,
          currentPage: page,
          items,
          running: true,
          completed: page >= total,
          wait: 0,
          error: "",
        };
        window.localStorage.setItem(storageKey(sourceId), JSON.stringify({...next, running: false}));
        setProgress(next);
        setOpenPage(page);
        page += 1;
      }

      if (!controller.signal.aborted) {
        setProgress(current => ({...current, running: false, completed: current.totalPages > 0 && current.items.length >= current.totalPages}));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setProgress(current => ({
          ...current,
          running: false,
          wait: 0,
          error: error instanceof Error ? error.message : "Page summarization stopped.",
        }));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function restart() {
    pause();
    window.localStorage.removeItem(storageKey(sourceId));
    setProgress(blank());
    setOpenPage(null);
  }

  function download() {
    if (!progress.items.length) return;
    const text = [
      sourceTitle,
      "PAGE-BY-PAGE NOTES AI SUMMARY",
      "================================",
      "",
      ...progress.items.flatMap(item => [
        `PAGE ${item.pageNumber}`,
        "----------------",
        item.summary,
        "",
      ]),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], {type: "text/plain;charset=utf-8"}));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sourceTitle || "notes"}-page-summary.txt`.replace(/[^a-zA-Z0-9._-]+/g, "-");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const percent = progress.totalPages
    ? Math.min(100, progress.items.length / progress.totalPages * 100)
    : 0;

  return (
    <section className="campusAiPageSummary">
      <header>
        <div className="campusAiPageSummaryIdentity">
          <i>PDF</i>
          <span><small>LONG DOCUMENT SUMMARY</small><b>Page-by-page Notes AI</b><em>{sourceTitle}</em></span>
        </div>
        <div className="campusAiPageSummaryActions">
          <button type="button" className="primary" onClick={progress.running ? pause : () => void start()} disabled={progress.completed}>
            {progress.running ? "Pause" : progress.items.length ? "Resume summary" : "Start summary"}
          </button>
          <button type="button" onClick={download} disabled={!progress.items.length}>Download</button>
          <button type="button" onClick={restart} disabled={!progress.items.length && !progress.error}>Start over</button>
        </div>
      </header>

      <div className="campusAiPageSummaryProgress">
        <div>
          <span>{progress.completed ? "Summary complete" : progress.wait ? `Groq cooldown · ${progress.wait}s` : progress.running ? `Summarizing page ${progress.currentPage}` : progress.items.length ? "Ready to resume" : "Ready to begin"}</span>
          <strong>{progress.items.length}{progress.totalPages ? ` / ${progress.totalPages} pages` : " pages"}</strong>
        </div>
        <span className="campusAiPageSummaryTrack"><i style={{width: `${percent}%`}}/></span>
      </div>

      {progress.error && <p className="campusAiPageSummaryError">{progress.error}</p>}
      {progress.items.length > 0 && (
        <div className="campusAiPageSummaryResults">
          {progress.items.map(item => (
            <article className={openPage === item.pageNumber ? "active" : ""} key={item.pageNumber}>
              <button
                type="button"
                className="campusAiPageSummaryResultHeader"
                aria-expanded={openPage === item.pageNumber}
                onClick={() => setOpenPage(current => current === item.pageNumber ? null : item.pageNumber)}
              >
                <span>Page {item.pageNumber}</span>
                <small>{item.empty ? "No extractable text" : "Grounded summary"}</small>
                <i>⌄</i>
              </button>
              {openPage === item.pageNumber && (
                <div className="campusAiPageSummaryText">
                  <FormattedPageSummary text={item.summary}/>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <footer><span>RLS secured</span><p>Progress is saved in this browser. Provider cooldowns resume automatically, and missing content is never invented.</p></footer>
    </section>
  );
}
