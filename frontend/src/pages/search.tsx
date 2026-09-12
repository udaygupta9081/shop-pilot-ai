import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaMagnifyingGlass, FaXmark } from "react-icons/fa6";
import SearchListItem from "../components/SearchListItem";
import SearchResultCard from "../components/SearchResultCard";
import {
  POPULAR_SEARCHES,
  getSuggestions,
  searchProducts,
  type Product,
} from "../data/searchData";
import { addRecentSearch, getRecentSearches } from "../utils/recentSearches";

type ViewState = "idle" | "typing" | "loading" | "results" | "no-results" | "error";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  // If the page was opened with ?q= already set (e.g. a shared link),
  // treat it as an already-submitted search instead of the typing state.
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(
    initialQuery || null,
  );
  const [results, setResults] = useState<Product[]>([]);
  const [status, setStatus] = useState<ViewState>(
    initialQuery ? "loading" : "idle",
  );
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    getRecentSearches(),
  );
  // Bumped whenever a search should re-run even if the term is unchanged
  // (e.g. hitting "Retry" after an error), since the fetch effect below
  // is keyed on [submittedQuery, searchToken].
  const [searchToken, setSearchToken] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus the search input when landing on the page, matching the
  // "click navbar search -> dedicated search interface opens" flow.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Suggestions are cheap/synchronous, so just derive them from `query`.
  const suggestions = useMemo(() => {
    if (submittedQuery !== null) return [];
    return getSuggestions(query);
  }, [query, submittedQuery]);

  // Fetch results whenever a search is submitted. State updates only
  // happen inside the async callback, not synchronously in the effect
  // body, so this stays a plain "sync with an external system" effect.
  useEffect(() => {
    if (submittedQuery === null) return;

    let cancelled = false;

    searchProducts(submittedQuery)
      .then((products) => {
        if (cancelled) return;
        setResults(products);
        setStatus(products.length > 0 ? "results" : "no-results");
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [submittedQuery, searchToken]);

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setStatus("loading");
    setSearchParams({ q: trimmed }, { replace: true });
    setRecentSearches(addRecentSearch(trimmed));
    setSubmittedQuery(trimmed);
    setSearchToken((token) => token + 1);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setSubmittedQuery(null);
    setResults([]);
    if (!value) {
      setStatus("idle");
      setSearchParams({}, { replace: true });
    } else {
      setStatus("typing");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runSearch(query);
    } else if (e.key === "Escape") {
      handleChange("");
      setSubmittedQuery(null);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    handleChange("");
    setSubmittedQuery(null);
    inputRef.current?.focus();
  };

  const showIdleSections = status === "idle";
  const showTypingSuggestions = status === "typing";
  const showLoading = status === "loading";
  const showResults = status === "results";
  const showNoResults = status === "no-results";
  const showError = status === "error";

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white pb-16">
      <div className="w-[90%] max-w-2xl mx-auto pt-8 sm:pt-12">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b-2 border-gray-200 focus-within:border-blue-600 transition-colors pb-3">
          <FaMagnifyingGlass className="text-gray-400 text-lg shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label="Search any product or concern"
            placeholder="Search any product or concern"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-lg sm:text-xl text-black placeholder:text-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClear}
              className="text-gray-400 hover:text-black transition-colors shrink-0 cursor-pointer"
            >
              <FaXmark />
            </button>
          )}
        </div>

        {/* Idle: recent + popular */}
        {showIdleSections && (
          <div className="mt-6 flex flex-col gap-8">
            {recentSearches.length > 0 && (
              <section>
                <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase mb-2">
                  Recent
                </h2>
                <div className="flex flex-col">
                  {recentSearches.map((term) => (
                    <SearchListItem
                      key={term}
                      label={term}
                      onSelect={runSearch}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase mb-2">
                Popular
              </h2>
              <div className="flex flex-col">
                {POPULAR_SEARCHES.map((term) => (
                  <SearchListItem
                    key={term}
                    label={term}
                    onSelect={runSearch}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Typing: suggestions */}
        {showTypingSuggestions && (
          <div className="mt-6">
            <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase mb-2">
              Searching for
            </h2>
            {suggestions.length > 0 ? (
              <div className="flex flex-col">
                {suggestions.map((suggestion) => (
                  <SearchListItem
                    key={suggestion}
                    label={suggestion}
                    onSelect={runSearch}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-3">
                Press Enter to search for "{query}"
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {showLoading && (
          <div
            className="mt-10 flex items-center justify-center text-sm text-gray-500"
            role="status"
            aria-live="polite"
          >
            Searching...
          </div>
        )}

        {/* Error */}
        {showError && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center" role="alert">
            <p className="text-sm text-gray-600">
              Something went wrong while searching. Please try again.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!submittedQuery) return;
                setStatus("loading");
                setSearchToken((token) => token + 1);
              }}
              className="border border-black bg-white hover:bg-black text-black hover:text-white px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div className="mt-10 flex flex-col items-center text-center gap-1" role="status">
            <p className="text-base font-semibold text-black">
              No results found for "{submittedQuery}"
            </p>
            <p className="text-sm text-gray-500">
              Try a different product name or concern.
            </p>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div className="mt-8" aria-live="polite">
            <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-gray-500 uppercase mb-4">
              Results for "{submittedQuery}"
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {results.map((product) => (
                <SearchResultCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
