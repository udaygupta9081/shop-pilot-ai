import { tokenize } from "./normalize.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const MIN_QUERY_LENGTH = 2;
const MAX_TOKENS = 6;
const MAX_QUERY_LENGTH = 100;

/** Only accepts plain strings (rejects arrays/objects such as ?q[$ne]=x). */
export function cleanQuery(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * Builds an index-friendly filter for a user query.
 * Every typed word must match the START of some product keyword
 * ("jbl spea" -> keywords has /^jbl/ AND /^spea/). The regexes are anchored
 * and case-sensitive on a lowercase indexed array, so MongoDB uses an index
 * range scan instead of scanning the collection.
 * Returns null when the query is too short to search.
 */
export function buildSearchFilter(q) {
  const clean = cleanQuery(q);
  if (clean.length < MIN_QUERY_LENGTH) return null;
  const tokens = [...new Set(tokenize(clean))].slice(0, MAX_TOKENS);
  if (!tokens.length || !tokens.some((t) => t.length >= 2)) return null;
  return { $and: tokens.map((t) => ({ keywords: { $regex: `^${escapeRegex(t)}` } })) };
}

export function parsePagination(query, { defaultLimit = 24, maxLimit = 60 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** Whitelist of sort options -> { sort, extraFilter } */
export function parseSort(sortKey) {
  switch (sortKey) {
    case "price_asc":
      // products without a price are excluded so they don't sort first
      return { sort: { price: 1, reviews: -1 }, extra: { price: { $ne: null } } };
    case "price_desc":
      return { sort: { price: -1, reviews: -1 }, extra: { price: { $ne: null } } };
    case "ai":
      return { sort: { aiProductScore: -1, reviews: -1 }, extra: { aiProductScore: { $ne: null } } };
    case "reviews":
    case "popular":
      return { sort: { reviews: -1 }, extra: {} };
    case "rating":
    default:
      return { sort: { stars: -1, reviews: -1 }, extra: {} };
  }
}