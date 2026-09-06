import type { Product } from "../data/searchData";

export interface SearchResultCardProps {
  product: Product;
}

/**
 * Product result card shown in the Search page results grid. The
 * project doesn't yet have a shared Product Card component, so this is
 * a small, purpose-built one that follows the same visual language
 * (rounded image container, bold black title, gray-500 meta text) used
 * by Ranked.tsx and categories.tsx on the Home page.
 */
const SearchResultCard = ({ product }: SearchResultCardProps) => {
  return (
    <div className="flex flex-col gap-2 group cursor-pointer text-left">
      <div className="w-full aspect-square rounded-lg overflow-hidden bg-neutral-100 border border-gray-200">
        <img
          src={product.image}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.src = "/7.webp";
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          draggable={false}
        />
      </div>
      <div className="flex flex-col items-start">
        <h3 className="font-semibold text-sm sm:text-base text-black group-hover:text-blue-600 transition-colors line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-black">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
            ★ {product.rating.toFixed(1)}
          </span>
          {typeof product.reviewCount === "number" && (
            <span className="text-xs text-gray-400">
              ({product.reviewCount.toLocaleString("en-IN")})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultCard;
