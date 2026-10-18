import type { ProductSummary } from "../types/catalog";
import ProductCard from "./ProductCard";

export const ProductGrid = ({ products }: { products: ProductSummary[] }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
    {products.map((p) => (
      <ProductCard key={p.asin} product={p} />
    ))}
  </div>
);

export const ProductGridSkeleton = ({ count = 10 }: { count?: number }) => (
  <div
    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
    role="status"
    aria-label="Loading products"
  >
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="h-72 bg-neutral-100 rounded-lg animate-pulse" />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center" role="alert">
    <p className="text-sm text-gray-600">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="border border-black bg-white hover:bg-black text-black hover:text-white px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
      >
        Retry
      </button>
    )}
  </div>
);
