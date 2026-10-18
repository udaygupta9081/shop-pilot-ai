/**
 * Small localStorage-backed helper for recent searches shown in the navbar
 * search dropdown. Defensive: never throws if storage is unavailable.
 */
const STORAGE_KEY = "shoppilot_recent_searches";
const MAX_RECENT_SEARCHES = 5;

function isStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

/** Reads recent searches, most-recent-first. Never throws. */
export function getRecentSearches(): string[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/** Adds a term to the front (case-insensitive de-dupe, capped). Returns the new list. */
export function addRecentSearch(term: string): string[] {
  const trimmed = term.trim();
  const current = getRecentSearches();
  if (!trimmed) return current;

  const updated = [
    trimmed,
    ...current.filter((existing) => existing.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);

  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* storage full/unavailable: in-memory state still works */
    }
  }
  return updated;
}
