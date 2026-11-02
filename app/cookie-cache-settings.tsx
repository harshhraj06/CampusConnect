"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Cookie, HardDrive, RefreshCw, Trash2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getOfflineTimetableFiles,
  getOfflineTimetableSchedule,
  removeOfflineTimetableFilesForUser,
  removeOfflineTimetableSchedule,
} from "./offline-timetable-cache";
import {
  readCookieConsentChoice,
  saveCookieConsentChoice,
  type CookieConsentChoice,
} from "./cookie-preferences";
import { LegalLinks } from "@/components/ui/legal-links";
import "./cookie-cache-settings.css";

type CacheInfo = { names: string[]; entries: number; originUsage: string; originQuota: string; originUsageBytes: number; originQuotaBytes: number };
const EMPTY_CACHE: CacheInfo = { names: [], entries: 0, originUsage: "Unavailable", originQuota: "Unavailable", originUsageBytes: 0, originQuotaBytes: 0 };

function formatBytes(value?: number): string {
  if (!Number.isFinite(value) || !value) return "0 bytes";
  if (value < 1024) return `${value} bytes`;
  const units = ["KB", "MB", "GB"];
  let amount = value / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit++;
  }
  return `${amount.toFixed(1)} ${units[unit]}`;
}

export default function CookieCacheSettings() {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(null);
  const [selected, setSelected] = useState<CookieConsentChoice>("essential");
  const [cache, setCache] = useState(EMPTY_CACHE);
  const [userId, setUserId] = useState<string | null>(null);
  const [offlineFiles, setOfflineFiles] = useState(0);
  const [hasOfflineSchedule, setHasOfflineSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const names = ("caches" in window ? await caches.keys() : [])
        .filter(name => name.startsWith("campusconnect-"));
      let entries = 0;
      for (const name of names) {
        const bucket = await caches.open(name);
        entries += (await bucket.keys()).length;
      }

      let originUsage = "Unavailable";
      let originQuota = "Unavailable";
      let originUsageBytes = 0;
      let originQuotaBytes = 0;
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        originUsageBytes = estimate.usage || 0;
        originQuotaBytes = estimate.quota || 0;
        originUsage = formatBytes(originUsageBytes);
        originQuota = formatBytes(originQuotaBytes);
      }
      setCache({ names, entries, originUsage, originQuota, originUsageBytes, originQuotaBytes });

      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.auth.getUser();
        const currentUserId = data.user?.id || null;
        setUserId(currentUserId);
        if (currentUserId) {
          const [files, schedule] = await Promise.all([
            getOfflineTimetableFiles(currentUserId),
            getOfflineTimetableSchedule(currentUserId),
          ]);
          setOfflineFiles(files.length);
          setHasOfflineSchedule(Boolean(schedule));
        } else {
          setOfflineFiles(0);
          setHasOfflineSchedule(false);
        }
      } else {
        setUserId(null);
        setOfflineFiles(0);
        setHasOfflineSchedule(false);
      }
    } catch {
      setError("Some storage details could not be read. Try refreshing this page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = readCookieConsentChoice();
    setChoice(current);
    setSelected(current || "essential");
    void refresh();
  }, [refresh]);

  function saveChoice() {
    try {
      saveCookieConsentChoice(selected);
      setChoice(selected);
      setMessage("Your cookie preference has been saved on this device.");
      setError("");
    } catch {
      setError("This browser could not save your preference. Check its storage settings and try again.");
    }
  }

  async function clearAppCache() {
    if (!window.confirm(
      "Clear CampusConnect’s cached app files? They will download again as you use the app. Your cookie preference and timetable data will remain."
    )) return;

    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (!("caches" in window)) {
        setMessage("This browser does not support the app cache controls.");
        return;
      }
      const names = (await caches.keys())
        .filter(name => name.startsWith("campusconnect-"));
      const results = await Promise.all(names.map(async name => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        const removed = await Promise.all(requests.map(request => cache.delete(request)));
        return removed.filter(Boolean).length;
      }));
      const clearedFiles = results.reduce((total, count) => total + count, 0);
      setMessage(clearedFiles
        ? `Removed ${clearedFiles} cached CampusConnect ${clearedFiles === 1 ? "file" : "files"}. The app will save files again as you browse.`
        : "The app cache is already clear. CampusConnect will save supported files as you browse.");
      await refresh();
    } catch {
      setError("Could not clear the app cache. Close other CampusConnect tabs and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function clearOfflineTimetable() {
    if (!userId) return;
    if (!window.confirm(
      "Delete this account’s saved offline timetable files and schedule from this device? Online campus records will not be deleted."
    )) return;

    setBusy(true);
    setMessage("");
    setError("");
    try {
      await Promise.all([
        removeOfflineTimetableFilesForUser(userId),
        removeOfflineTimetableSchedule(userId),
      ]);
      setOfflineFiles(0);
      setHasOfflineSchedule(false);
      setMessage("Saved offline timetable files and schedule were removed from this device.");
    } catch {
      setError("Could not remove the offline timetable data. Close other CampusConnect tabs and try again.");
    } finally {
      setBusy(false);
    }
  }

  const currentLabel = choice === "all"
    ? "Optional analytics preference saved"
    : choice === "essential"
    ? "Essential cookies only"
    : "No preference saved yet";

  return (
    <main className="ccStoragePage">
      <header className="ccStorageHeader">
        <Link href="/" className="ccStorageBrand" aria-label="CampusConnect home">
          <img src="/campusconnect-logo-ui.webp" alt="CampusConnect" width="152" height="48" />
        </Link>
        <Link href="/" className="ccStorageBack">
          <ArrowLeft size={16} aria-hidden="true" /> Back to CampusConnect
        </Link>
      </header>

      <div className="ccStorageMain">
        <div className="ccStorageIntro">
          <span className="ccStorageEyebrow">PRIVACY & DEVICE STORAGE</span>
          <h1>Cookies and cache</h1>
          <p>Manage the preference saved in this browser and remove CampusConnect files saved for offline use.</p>
        </div>

        <section className="ccStorageCard" aria-labelledby="ccCookiesTitle">
          <div className="ccStorageCardHeading">
            <span className="ccStorageIcon"><Cookie size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="ccCookiesTitle">Cookie preferences</h2>
              <p>Choose which preference CampusConnect remembers on this device.</p>
            </div>
          </div>
          <p className="ccStorageCurrent"><span className="ccStorageDot" />{currentLabel}</p>
          <fieldset className="ccStorageChoices">
            <legend>Your preference</legend>
            <label className={selected === "essential" ? "selected" : ""}>
              <input
                type="radio"
                name="cookie-consent"
                value="essential"
                checked={selected === "essential"}
                onChange={() => setSelected("essential")}
              />
              <span>
                <strong>Essential only</strong>
                <small>Save essential authentication, security and app preferences.</small>
              </span>
            </label>
            <label className={selected === "all" ? "selected" : ""}>
              <input
                type="radio"
                name="cookie-consent"
                value="all"
                checked={selected === "all"}
                onChange={() => setSelected("all")}
              />
              <span>
                <strong>Allow optional analytics</strong>
                <small>Save your choice for optional analytics. No analytics provider is currently active.</small>
              </span>
            </label>
          </fieldset>
          <div className="ccStorageActions">
            <button className="ccStoragePrimary" type="button" onClick={saveChoice}>Save preference</button>
            {choice && selected === choice && (
              <span><Check size={15} aria-hidden="true" /> Saved on this device</span>
            )}
          </div>
          <p className="ccStorageNote">
            Essential browser storage is required for sign-in and core app features. This preference does not clear your account or campus data.
          </p>
        </section>

        <section className="ccStorageCard" aria-labelledby="ccCacheTitle">
          <div className="ccStorageCardHeading">
            <span className="ccStorageIcon"><HardDrive size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="ccCacheTitle">App cache</h2>
              <p>Remove CampusConnect files stored for quicker loading and offline access.</p>
            </div>
            <button
              className="ccStorageRefresh"
              type="button"
              onClick={() => void refresh()}
              disabled={loading || busy}
              aria-label="Refresh storage information"
              title="Refresh"
            >
              <RefreshCw size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="ccStorageStats">
            <div><span>App caches</span><strong>{loading ? "…" : cache.names.length}</strong></div>
            <div><span>Cached files</span><strong>{loading ? "…" : cache.entries}</strong></div>
            <div><span>Website storage used</span><strong>{loading ? "…" : cache.originUsage}</strong><small>All site data</small></div>
          </div>
          <div className="ccStorageUsage">
            <div className="ccStorageUsageHeading">
              <strong>All CampusConnect data in this browser</strong>
              <span>{loading ? "Checking…" : `${cache.originUsage} of ${cache.originQuota}`}</span>
            </div>
            <div
              className="ccStorageUsageTrack"
              role="progressbar"
              aria-label="Website storage usage"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={cache.originQuotaBytes ? Math.min(100, Math.round(cache.originUsageBytes / cache.originQuotaBytes * 100)) : 0}
            >
              <span style={{ width: `${cache.originQuotaBytes ? Math.min(100, cache.originUsageBytes / cache.originQuotaBytes * 100) : 0}%` }} />
            </div>
            <p>This browser estimate includes all CampusConnect data stored on this device, such as settings, offline timetable data, and cached files. It can remain above zero when the app cache is clear.</p>
          </div>
          <div className="ccStorageCacheStatus">
            <span className={cache.entries ? "hasCache" : ""} aria-hidden="true" />
            <p>{loading ? "Checking app cache…" : cache.entries ? `${cache.entries} cached app ${cache.entries === 1 ? "file" : "files"} ready for faster loading.` : "No offline app files are currently saved. CampusConnect will cache supported files as you browse."}</p>
          </div>
          <p className="ccStorageNote">
            Clearing the app cache removes only CampusConnect’s cached app files. Your cookie preference and offline timetable data stay on this device.
          </p>
          <button
            className="ccStorageSecondary"
            type="button"
            onClick={() => void clearAppCache()}
            disabled={loading || busy}
          >
            <Trash2 size={16} aria-hidden="true" /> Clear app cache
          </button>
        </section>

        <section className="ccStorageCard" aria-labelledby="ccOfflineTitle">
          <div className="ccStorageCardHeading">
            <span className="ccStorageIcon"><HardDrive size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="ccOfflineTitle">Offline timetable</h2>
              <p>Delete the signed-in account’s saved timetable files from this browser.</p>
            </div>
          </div>
          {!userId ? (
            <p className="ccStorageNote">Sign in to see and manage offline timetable data linked to your account.</p>
          ) : (
            <>
              <p className="ccStorageCurrent">
                {loading
                  ? "Checking saved offline data…"
                  : `${offlineFiles} saved timetable ${offlineFiles === 1 ? "file" : "files"}${hasOfflineSchedule ? " and a saved schedule" : ""}`}
              </p>
              <p className="ccStorageNote">
                This removes only this account’s local offline timetable copies. It does not delete online schedules or documents.
              </p>
              <button
                className="ccStorageSecondary"
                type="button"
                onClick={() => void clearOfflineTimetable()}
                disabled={loading || busy || (!offlineFiles && !hasOfflineSchedule)}
              >
                <Trash2 size={16} aria-hidden="true" /> Clear offline timetable
              </button>
            </>
          )}
        </section>

        {message && <p className="ccStorageStatus" role="status">{message}</p>}
        {error && <p className="ccStorageError" role="alert">{error}</p>}
        <nav className="ccStorageLegal" aria-label="Privacy information">
          <Link href="/privacy">Read privacy policy</Link>
          <Link href="/terms">Terms of use</Link>
          <Link href="/">Return to CampusConnect</Link>
        </nav>
      </div>

      <footer className="ccStorageFooter">
        <span>CampusConnect · Privacy and storage controls</span>
        <LegalLinks />
      </footer>
    </main>
  );
}
