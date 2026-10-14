/**
 * Small localStorage-backed helper for the Search page's "RECENT"
 * section. Kept isolated (and defensive) so it never throws even if
 * localStorage is unavailable (private browsing, disabled storage, SSR).
 *
 * There is no existing storage utility elsewhere in the project, so this
 * is the single place recent-search persistence lives.
 */
import { DEFAULT_RECENT_SEARCHES } from "../data/searchData";

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
  if (!isStorageAvailable()) return DEFAULT_RECENT_SEARCHES;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECENT_SEARCHES;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    return DEFAULT_RECENT_SEARCHES;
  } catch {
    return DEFAULT_RECENT_SEARCHES;
  }
}

/**
 * Adds a term to the front of the recent-searches list, removing any
 * existing (case-insensitive) duplicate and capping the list length.
 * Returns the updated list so callers can update UI state immediately.
 */
export function addRecentSearch(term: string): string[] {
  const trimmed = term.trim();
  const current = getRecentSearches();
  if (!trimmed) return current;

  const withoutDuplicate = current.filter(
    (existing) => existing.toLowerCase() !== trimmed.toLowerCase(),
  );
  const updated = [trimmed, ...withoutDuplicate].slice(0, MAX_RECENT_SEARCHES);

  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage full/unavailable — fail silently, in-memory state still works.
    }
  }

  return updated;
}
