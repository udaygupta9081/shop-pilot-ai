import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getCategory, getCategoryProducts } from "../api/catalog";
import { useAsync } from "../hooks/useAsync";
import Pagination from "../components/Pagination";
import { ErrorState, ProductGrid, ProductGridSkeleton } from "../components/ProductGrid";
import { formatCount } from "../utils/format";
import type { SortKey } from "../types/catalog";

const PAGE_SIZE = 24;

/**
 * /categories/:mainSlug            -> every product in a main category
 * /categories/:mainSlug/:subSlug   -> one subcategory
 * Filtering, sorting and pagination are done by the server.
 */
const CategoryListing = () => {
  const { mainSlug = "", subSlug } = useParams();
  const slug = subSlug ?? mainSlug;
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = (params.get("sort") as SortKey | null) ?? "rating";
  const q = (params.get("q") ?? "").trim();
  const [draft, setDraft] = useState(q);
  const [retry, setRetry] = useState(0);

  const meta = useAsync(`cat:${slug}:${retry}`, (signal) => getCategory(slug, signal));
  const list = useAsync(`list:${slug}|${page}|${sort}|${q}|${retry}`, (signal) =>
    getCategoryProducts(slug, { page, limit: PAGE_SIZE, sort, q }, signal),
  );

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    setParams(next);
    window.scrollTo({ top: 0 });
  };

  const category = meta.data;
  // A subcategory URL must belong to the main category in the URL.
  const mismatch = !!category && category.type === "sub" && category.parentSlug !== mainSlug;
  const notFound = meta.error && /not found/i.test(meta.error);

  if (notFound || mismatch) {
    return (
      <div className="w-[92%] md:w-[80%] mx-auto py-24 text-center">
        <h1 className="text-xl font-bold">Category not found</h1>
        <Link to="/categories" className="inline-block mt-4 text-sm font-semibold underline">Browse all categories</Link>
      </div>
    );
  }

  const parent = category?.type === "sub" ? category.parent : null;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white pb-16">
      <div className="w-[92%] md:w-[80%] mx-auto pt-6">
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5">
          <Link to="/" className="hover:text-black">Home</Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-black">Categories</Link>
          {parent && (<><span>/</span><Link to={`/categories/${parent.slug}`} className="hover:text-black">{parent.name}</Link></>)}
          {category && (<><span>/</span><span className="text-black font-medium">{category.name}</span></>)}
        </nav>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">{category?.name ?? " "}</h1>
            {list.data && list.data.total !== null && (
              <p className="text-sm text-gray-500 mt-1">
                {formatCount(list.data.total) ?? "No"} product{list.data.total === 1 ? "" : "s"}
                {q && <> matching “{q}”</>}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update({ q: draft.trim() || null, page: null });
              }}
              className="flex"
              role="search"
            >
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Search in ${category?.name ?? "this category"}`}
                aria-label="Search within this category"
                maxLength={100}
                className="border border-gray-300 px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:border-emerald-600"
              />
              <button type="submit" className="bg-black text-white px-4 text-xs font-bold uppercase tracking-wider cursor-pointer">Search</button>
            </form>
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Sort by
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value, page: null })}
                className="border border-gray-300 px-2 py-2 text-sm bg-white"
              >
                <option value="rating">Top rated</option>
                <option value="popular">Most reviewed</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
          </div>
        </div>

        {category?.type === "main" && category.subcategories && category.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {category.subcategories.map((s) => (
              <Link key={s.slug} to={`/categories/${category.slug}/${s.slug}`} className="text-xs border border-gray-300 hover:border-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-full transition-colors">
                {s.name}
              </Link>
            ))}
          </div>
        )}

        {list.loading && <ProductGridSkeleton />}
        {list.error && !notFound && <ErrorState message={list.error} onRetry={() => setRetry((n) => n + 1)} />}
        {list.data && list.data.items.length === 0 && (
          <div className="py-16 text-center" role="status">
            <p className="text-base font-semibold">{q ? `No products match “${q}” here.` : "No products in this category yet."}</p>
            {q && <button type="button" onClick={() => { setDraft(""); update({ q: null, page: null }); }} className="mt-3 text-sm underline cursor-pointer">Clear search</button>}
          </div>
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <ProductGrid products={list.data.items} />
            <Pagination page={list.data.page} totalPages={list.data.totalPages ?? 1} onPageChange={(p) => update({ page: String(p) })} />
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryListing;
