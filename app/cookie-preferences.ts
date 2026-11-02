export type CookieConsentChoice = "essential" | "all";

export const COOKIE_CONSENT_STORAGE_KEY =
  "campusconnect-cookie-consent-v1";
export const COOKIE_CONSENT_CHANGED_EVENT =
  "campusconnect-cookie-consent-changed";

export function readCookieConsentChoice(): CookieConsentChoice | null {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return value === "essential" || value === "all" ? value : null;
  } catch {
    return null;
  }
}

export function saveCookieConsentChoice(choice: CookieConsentChoice): void {
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, {
    detail: { choice },
  }));
}
