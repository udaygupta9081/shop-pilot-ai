import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchProducts } from "../api/catalog";
import { useAsync } from "../hooks/useAsync";
import Pagination from "../components/Pagination";
import { ErrorState, ProductGrid, ProductGridSkeleton } from "../components/ProductGrid";
import { formatCount } from "../utils/format";
import type { SortKey } from "../types/catalog";

const PAGE_SIZE = 24;

/**
 * Full search results page. The query lives in the URL (?q=&page=&sort=) and
 * is entered through the single navbar search bar.
 */
const Search = () => {
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = (params.get("sort") as SortKey | null) ?? "popular";
  const [retry, setRetry] = useState(0);

  const tooShort = q.length < 2;
  const { data, error, loading } = useAsync(
    `${q}|${page}|${sort}|${retry}`,
    (signal) =>
      tooShort
        ? Promise.resolve(null)
        : searchProducts(q, { page, limit: PAGE_SIZE, sort }, signal),
  );

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white pb-16">
      <div className="w-[92%] md:w-[80%] mx-auto pt-8">
        {tooShort ? (
          <div className="py-16 text-center">
            <h1 className="text-xl font-bold text-black">Search products</h1>
            <p className="mt-2 text-sm text-gray-500">
              Type at least 2 characters in the search bar above and press Enter.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-black">Results for “{q}”</h1>
                {data && data.total !== null && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCount(data.total) ?? "No"} product{data.total === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <label className="text-sm text-gray-600 flex items-center gap-2">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => update({ sort: e.target.value, page: null })}
                  className="border border-gray-300 px-2 py-1.5 text-sm bg-white"
                >
                  <option value="popular">Most reviewed</option>
                  <option value="rating">Top rated</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </label>
            </div>

            {loading && <ProductGridSkeleton />}
            {error && <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />}
            {data && data.items.length === 0 && (
              <div className="py-16 text-center" role="status">
                <p className="text-base font-semibold text-black">No results found for “{q}”</p>
                <p className="text-sm text-gray-500 mt-1">Try a different product name or fewer words.</p>
              </div>
            )}
            {data && data.items.length > 0 && (
              <>
                <ProductGrid products={data.items} />
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages ?? 1}
                  onPageChange={(p) => update({ page: String(p) })}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
