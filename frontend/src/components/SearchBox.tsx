import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import { searchProducts } from "../api/catalog";
import { isAbortError } from "../api/client";
import type { ProductSummary } from "../types/catalog";
import { formatPrice } from "../utils/format";
import { addRecentSearch, getRecentSearches } from "../utils/recentSearches";
import ProductImage from "./ProductImage";
import SearchListItem from "./SearchListItem";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;
const SUGGESTION_LIMIT = 6;

type Status = "idle" | "loading" | "ready" | "error";

/**
 * The navbar search bar. Debounced (300 ms) live suggestions from the API,
 * keyboard navigation (Up/Down/Enter/Escape) and stale-request cancellation.
 * Enter (or "View all results") opens /search?q=...
 */
const SearchBox = () => {
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const trimmed = query.trim();
  const searchable = trimmed.length >= MIN_CHARS;

  // Debounced fetch; the cleanup cancels both the timer and any in-flight request.
  useEffect(() => {
    if (trimmed.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus("loading");
      searchProducts(trimmed, { limit: SUGGESTION_LIMIT, withTotal: false }, controller.signal)
        .then((res) => {
          setItems(res.items);
          setStatus("ready");
        })
        .catch((err: unknown) => {
          if (isAbortError(err) || controller.signal.aborted) return;
          setItems([]);
          setStatus("error");
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, retry]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const goToResults = (term: string) => {
    const t = term.trim();
    if (t.length < MIN_CHARS) return;
    addRecentSearch(t);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  const goToProduct = (p: ProductSummary) => {
    addRecentSearch(trimmed);
    setOpen(false);
    navigate(`/product/${encodeURIComponent(p.asin)}`);
  };

  const onChange = (value: string) => {
    setQuery(value);
    setActive(-1);
    setOpen(true);
    if (value.trim().length < MIN_CHARS) {
      setStatus("idle");
      setItems([]);
    } else {
      setStatus("loading");
    }
  };

  const showViewAll = status === "ready" && items.length > 0;
  const rowCount = items.length + (showViewAll ? 1 : 0);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && rowCount > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % rowCount);
    } else if (e.key === "ArrowUp" && rowCount > 0) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? rowCount - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < items.length) goToProduct(items[active]);
      else goToResults(query);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showRecent = open && trimmed.length === 0 && recent.length > 0;
  const showPanel = open && (searchable || showRecent);

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Search any product"
        placeholder="Search any product"
        autoComplete="off"
        maxLength={100}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setRecent(getRecentSearches());
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="w-full bg-gray-800 text-white placeholder:text-gray-400 pl-9 pr-9 py-2 rounded-lg border border-gray-700 hover:border-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
        >
          <FaXmark />
        </button>
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-white text-black rounded-lg border border-gray-200 shadow-xl overflow-hidden"
        >
          {showRecent && (
            <div className="p-2">
              <p className="px-2 pt-1 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Recent</p>
              {recent.map((term) => (
                <SearchListItem key={term} label={term} onSelect={(t) => { setQuery(t); goToResults(t); }} />
              ))}
            </div>
          )}

          {searchable && status === "loading" && (
            <p className="px-4 py-4 text-sm text-gray-500" role="status">Searching…</p>
          )}

          {searchable && status === "error" && (
            <div className="px-4 py-4 text-sm text-gray-600 flex items-center justify-between gap-3" role="alert">
              <span>Search is unavailable right now.</span>
              <button type="button" onClick={() => { setStatus("loading"); setRetry((n) => n + 1); }} className="text-xs font-bold uppercase underline cursor-pointer">
                Retry
              </button>
            </div>
          )}

          {searchable && status === "ready" && items.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-600">
              No products found for “{trimmed}”. Try another name.
            </p>
          )}

          {searchable && status === "ready" && items.map((p, i) => {
            const price = formatPrice(p.price);
            return (
              <button
                key={p.asin}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active === i}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => goToProduct(p)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer ${active === i ? "bg-gray-100" : "hover:bg-gray-50"}`}
              >
                <ProductImage src={p.imgUrl} alt="" className="w-10 h-10 object-contain shrink-0 bg-white border border-gray-100 rounded" />
                <span className="flex-1 min-w-0 text-sm text-black line-clamp-2">{p.title}</span>
                {price && <span className="text-sm font-bold shrink-0">{price}</span>}
              </button>
            );
          })}

          {showViewAll && (
            <button
              id={`${listId}-${items.length}`}
              role="option"
              aria-selected={active === items.length}
              type="button"
              onMouseEnter={() => setActive(items.length)}
              onClick={() => goToResults(query)}
              className={`w-full px-4 py-3 text-left text-sm font-semibold text-emerald-700 border-t border-gray-100 cursor-pointer ${active === items.length ? "bg-gray-100" : "hover:bg-gray-50"}`}
            >
              View all results for “{trimmed}” →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
