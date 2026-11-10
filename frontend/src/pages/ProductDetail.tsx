import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct, getProductVerdict } from "../api/catalog";
import { useAsync } from "../hooks/useAsync";
import { ErrorState } from "../components/ProductGrid";
import ProductImage from "../components/ProductImage";
import {
  formatAiScore,
  formatCount,
  formatPrice,
  formatRating,
  safeExternalUrl,
} from "../utils/format";
import type { ProductVerdict } from "../types/catalog";

type VerdictState = {
  asin: string;
  loading: boolean;
  data?: ProductVerdict;
  error?: string;
};

const ProductDetail = () => {
  const { asin = "" } = useParams();
  const [retry, setRetry] = useState(0);
  const [verdictState, setVerdictState] = useState<VerdictState | null>(null);
  const {
    data: p,
    error,
    loading,
  } = useAsync(`product:${asin}:${retry}`, (signal) =>
    getProduct(asin, signal),
  );

  if (loading) {
    return (
      <div className="w-[92%] md:w-[80%] mx-auto py-10">
        <div
          className="h-96 bg-neutral-100 rounded animate-pulse"
          role="status"
          aria-label="Loading product"
        />
      </div>
    );
  }
  if (error || !p) {
    const notFound = !!error && /not found|invalid/i.test(error);
    return (
      <div className="w-[92%] md:w-[80%] mx-auto py-16 text-center">
        {notFound ? (
          <>
            <h1 className="text-xl font-bold">Product not found</h1>
            <Link
              to="/"
              className="inline-block mt-4 text-sm font-semibold underline"
            >
              Back to home
            </Link>
          </>
        ) : (
          <ErrorState
            message={error ?? "Something went wrong"}
            onRetry={() => setRetry((n) => n + 1)}
          />
        )}
      </div>
    );
  }

  const price = formatPrice(p.price);
  const rating = formatRating(p.stars);
  const reviews = formatCount(p.reviews);
  const aiScore = formatAiScore(p.aiProductScore);
  const verdictStateForProduct = verdictState?.asin === p.asin ? verdictState : null;

  const requestVerdict = async () => {
    setVerdictState({ asin: p.asin, loading: true });
    try {
      const response = await getProductVerdict(p.asin);
      setVerdictState({ asin: p.asin, loading: false, data: response.verdict });
    } catch (reason) {
      setVerdictState({
        asin: p.asin,
        loading: false,
        error: reason instanceof Error ? reason.message : "Could not research this product's reviews.",
      });
    }
  };

  const verdictStyle = {
    BUY: "border-emerald-200 bg-emerald-50 text-emerald-800",
    WAIT: "border-amber-200 bg-amber-50 text-amber-800",
    AVOID: "border-rose-200 bg-rose-50 text-rose-800",
  } as const;
  const verdictLabel = verdictStateForProduct?.data?.verdict === "AVOID"
    ? "NOT BUY"
    : verdictStateForProduct?.data?.verdict;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white pb-16">
      <div className="w-[92%] md:w-[80%] mx-auto pt-6">
        <nav
          aria-label="Breadcrumb"
          className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5"
        >
          <Link to="/" className="hover:text-black">
            Home
          </Link>
          <span>/</span>
          <Link to={`/categories/${p.mainSlug}`} className="hover:text-black">
            {p.mainCategory}
          </Link>
          <span>/</span>
          <Link
            to={`/categories/${p.mainSlug}/${p.subSlug}`}
            className="hover:text-black"
          >
            {p.subcategory}
          </Link>
        </nav>

        <div className="mt-6 grid md:grid-cols-2 gap-8">
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <ProductImage
              src={p.imgUrl}
              alt={p.title}
              className="w-full max-h-[480px] aspect-square object-contain"
            />
          </div>
          <div className="flex flex-col gap-4 text-left">
            {p.isBestSeller && (
              <span className="self-start bg-emerald-600 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm">
                Bestseller
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-black break-words">
              {p.title}
            </h1>
            {(rating || reviews) && (
              <div className="flex items-center gap-2 text-sm">
                {rating && (
                  <span className="font-semibold text-emerald-700">
                    ★ {rating}
                  </span>
                )}
                {reviews && (
                  <span className="text-gray-500">({reviews} reviews)</span>
                )}
              </div>
            )}
            {aiScore && (
              <div
                className="self-start rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2"
                title="AI product score out of 100"
              >
                <p className="text-[10px] font-bold tracking-wider uppercase text-indigo-600">
                  AI Score
                </p>
                <p className="text-lg font-bold text-indigo-800">
                  {parseInt(aiScore) > 95 ? 95 : aiScore}
                  <span className="text-sm font-semibold text-indigo-500">
                    {" "}
                    / 100
                  </span>
                </p>
              </div>
            )}
            {price ? (
              <p className="text-3xl font-bold text-black">{price}</p>
            ) : (
              <p className="text-sm text-gray-500">Price not available</p>
            )}
            {p.boughtInLastMonth > 0 && (
              <p className="text-sm text-gray-600">
                {formatCount(p.boughtInLastMonth)} bought in the past month
              </p>
            )}
            <button
              type="button"
              onClick={() => void requestVerdict()}
              disabled={verdictStateForProduct?.loading}
              className="mt-2 inline-flex w-fit items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
            >
              {verdictStateForProduct?.loading
                ? "Researching reviews…"
                : verdictStateForProduct?.data
                  ? "Refresh verdict"
                  : "Get verdict"}
            </button>
            <p className="text-xs text-gray-500">Checks current web reviews using Tavily. Research can take a few seconds.</p>
          </div>
        </div>

        {verdictStateForProduct?.error && (
          <div role="alert" className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>{verdictStateForProduct.error}</p>
            <button type="button" onClick={() => void requestVerdict()} className="mt-2 font-semibold underline">Try again</button>
          </div>
        )}

        {verdictStateForProduct?.data && (
          <section aria-labelledby="product-verdict-title" className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Web review research</p>
                <h2 id="product-verdict-title" className="mt-1 text-xl font-bold text-gray-900">Should you buy this product?</h2>
                <p className="mt-1 text-sm text-gray-600">{p.title}</p>
              </div>
              <span className={`rounded-full border px-4 py-2 text-sm font-bold ${verdictStyle[verdictStateForProduct.data.verdict]}`}>
                {verdictLabel}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-gray-700">{verdictStateForProduct.data.summary}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
              {price && <span><strong className="text-gray-800">Listed price:</strong> {price}</span>}
              {rating && <span><strong className="text-gray-800">Catalog rating:</strong> ★ {rating}</span>}
              {reviews && <span><strong className="text-gray-800">Catalog reviews:</strong> {reviews}</span>}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Review confidence score: {verdictStateForProduct.data.score}/100 · {verdictStateForProduct.data.sources_used} sources analyzed
            </p>
            {verdictStateForProduct.data.sources_used === 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No external review sources were available. Treat the WAIT verdict as insufficient evidence, not as a product-quality finding.
              </p>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-white p-4">
                <h3 className="font-semibold text-emerald-800">What reviewers like</h3>
                {verdictStateForProduct.data.strengths.length
                  ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-gray-700">{verdictStateForProduct.data.strengths.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                  : <p className="mt-2 text-sm text-gray-500">No consistent strengths were identified.</p>}
              </div>
              <div className="rounded-xl border border-amber-100 bg-white p-4">
                <h3 className="font-semibold text-amber-800">Limitations to consider</h3>
                {verdictStateForProduct.data.limitations.length
                  ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-gray-700">{verdictStateForProduct.data.limitations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                  : <p className="mt-2 text-sm text-gray-500">No consistent limitations were identified.</p>}
              </div>
            </div>

            {verdictStateForProduct.data.reviews.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold text-gray-900">Review excerpts</h3>
                <ul className="mt-2 space-y-3">
                  {verdictStateForProduct.data.reviews.map((review, index) => (
                    <li key={`${review.url}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4">
                      {review.snippet && <p className="text-sm leading-6 text-gray-700">{review.snippet}</p>}
                      {safeExternalUrl(review.url) && (
                        <a href={safeExternalUrl(review.url) ?? undefined} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm font-medium text-emerald-800 underline">
                          {review.title || review.url}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {verdictStateForProduct.data.sources.length > 0 && (
              <div className="mt-5 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900">Sources</h3>
                <ul className="mt-2 space-y-1">
                  {verdictStateForProduct.data.sources.map((source, index) => (
                    <li key={`${source.url}-${index}`}>
                      {safeExternalUrl(source.url) && (
                        <a href={safeExternalUrl(source.url) ?? undefined} target="_blank" rel="noreferrer" className="break-all text-sm text-emerald-800 underline">
                          {source.title || source.url}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
