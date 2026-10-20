import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct } from "../api/catalog";
import { useAsync } from "../hooks/useAsync";
import { ErrorState } from "../components/ProductGrid";
import ProductImage from "../components/ProductImage";
import { formatAiScore, formatCount, formatPrice, formatRating } from "../utils/format";

const ProductDetail = () => {
  const { asin = "" } = useParams();
  const [retry, setRetry] = useState(0);
  const { data: p, error, loading } = useAsync(`product:${asin}:${retry}`, (signal) => getProduct(asin, signal));

  if (loading) {
    return <div className="w-[92%] md:w-[80%] mx-auto py-10"><div className="h-96 bg-neutral-100 rounded animate-pulse" role="status" aria-label="Loading product" /></div>;
  }
  if (error || !p) {
    const notFound = !!error && /not found|invalid/i.test(error);
    return (
      <div className="w-[92%] md:w-[80%] mx-auto py-16 text-center">
        {notFound ? (
          <>
            <h1 className="text-xl font-bold">Product not found</h1>
            <Link to="/" className="inline-block mt-4 text-sm font-semibold underline">Back to home</Link>
          </>
        ) : (
          <ErrorState message={error ?? "Something went wrong"} onRetry={() => setRetry((n) => n + 1)} />
        )}
      </div>
    );
  }

  const price = formatPrice(p.price);
  const rating = formatRating(p.stars);
  const reviews = formatCount(p.reviews);
  const aiScore = formatAiScore(p.aiProductScore);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white pb-16">
      <div className="w-[92%] md:w-[80%] mx-auto pt-6">
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5">
          <Link to="/" className="hover:text-black">Home</Link><span>/</span>
          <Link to={`/categories/${p.mainSlug}`} className="hover:text-black">{p.mainCategory}</Link><span>/</span>
          <Link to={`/categories/${p.mainSlug}/${p.subSlug}`} className="hover:text-black">{p.subcategory}</Link>
        </nav>

        <div className="mt-6 grid md:grid-cols-2 gap-8">
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <ProductImage src={p.imgUrl} alt={p.title} className="w-full max-h-[480px] aspect-square object-contain" />
          </div>
          <div className="flex flex-col gap-4 text-left">
            {p.isBestSeller && (
              <span className="self-start bg-emerald-600 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm">Bestseller</span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-black break-words">{p.title}</h1>
            {(rating || reviews) && (
              <div className="flex items-center gap-2 text-sm">
                {rating && <span className="font-semibold text-emerald-700">★ {rating}</span>}
                {reviews && <span className="text-gray-500">({reviews} reviews)</span>}
              </div>
            )}
            {aiScore && (
              <div className="self-start rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2" title="AI product score out of 100">
                <p className="text-[10px] font-bold tracking-wider uppercase text-indigo-600">AI Score</p>
                <p className="text-lg font-bold text-indigo-800">{aiScore}<span className="text-sm font-semibold text-indigo-500"> / 100</span></p>
              </div>
            )}
            {price ? <p className="text-3xl font-bold text-black">{price}</p> : <p className="text-sm text-gray-500">Price not available</p>}
            {p.boughtInLastMonth > 0 && (
              <p className="text-sm text-gray-600">{formatCount(p.boughtInLastMonth)} bought in the past month</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
