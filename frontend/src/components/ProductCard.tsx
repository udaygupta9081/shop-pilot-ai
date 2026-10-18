import { Link } from "react-router-dom";
import { memo } from "react";
import type { ProductSummary } from "../types/catalog";
import { formatCount, formatPrice, formatRating } from "../utils/format";
import ProductImage from "./ProductImage";

export interface ProductCardProps {
  product: ProductSummary;
}

/**
 * Shared product card (homepage, category pages, search results).
 * Order: image -> bestseller badge -> title -> rating + reviews -> price -> button.
 * Missing data is omitted, never faked (no "0 stars", no "£0.00").
 */
const ProductCard = ({ product }: ProductCardProps) => {
  const price = formatPrice(product.price);
  const rating = formatRating(product.stars);
  const reviews = formatCount(product.reviews);
  const to = `/product/${encodeURIComponent(product.asin)}`;

  return (
    <article className="flex flex-col h-full text-left bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <Link to={to} aria-label={product.title} className="block">
        <ProductImage
          src={product.imgUrl}
          alt={product.title}
          className="w-full aspect-square object-contain bg-white p-2"
        />
      </Link>

      <div className="flex flex-col flex-1 gap-2 p-3">
        {product.isBestSeller && (
          <span className="self-start bg-emerald-600 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-sm">
            Bestseller
          </span>
        )}

        <h3 className="text-sm font-semibold text-black line-clamp-2 min-h-[2.5rem] break-words">
          <Link to={to} className="hover:text-emerald-700 transition-colors">
            {product.title}
          </Link>
        </h3>

        {(rating || reviews) && (
          <div className="flex items-center gap-1.5 text-xs">
            {rating && (
              <span className="font-semibold text-emerald-700">★ {rating}</span>
            )}
            {reviews && <span className="text-gray-500">({reviews})</span>}
          </div>
        )}

        {price && <p className="text-base font-bold text-black">{price}</p>}

        <div className="mt-auto pt-2">
          <Link
            to={to}
            className="block w-full text-center border border-black bg-white hover:bg-black text-black hover:text-white px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors"
          >
            View Product
          </Link>
        </div>
      </div>
    </article>
  );
};

export default memo(ProductCard);
