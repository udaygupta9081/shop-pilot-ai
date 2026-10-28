import { useRef } from "react";
import { Link } from "react-router-dom";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { getRankedCategories } from "../api/catalog";
import { useAsync } from "../hooks/useAsync";
import { formatCount } from "../utils/format";
import ProductImage from "./ProductImage";

export interface CategoryCarouselProps {
  /** "main" = big aisles (Electronics...), "sub" = subcategories (Toothbrushes...) */
  level: "main" | "sub";
  limit?: number;
  /** "badge" = score badge on the picture + product counts, "plain" = picture + title + score line */
  variant?: "badge" | "plain";
}

/**
 * Sideways card carousel of categories, best AI score first.
 * Every card shows a real product picture (the category's top-scoring product)
 * and links to the category page. All numbers come from the database.
 */
const CategoryCarousel = ({ level, limit = 12, variant = "badge" }: CategoryCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, error, loading } = useAsync(`ranked:${level}:${limit}`, (signal) =>
    getRankedCategories(level, limit, signal),
  );

  const step = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth >= 1024 ? el.clientWidth / 4 : 300;
    const atStart = el.scrollLeft <= 10;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 15;
    if (direction === -1 && atStart) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else if (direction === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="w-full flex gap-5 overflow-hidden" role="status" aria-label="Loading categories">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="flex-shrink-0 w-[260px] md:w-[calc(25%-0.95rem)] aspect-square bg-neutral-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  if (error) {
    // "Category not found" here means the backend is still running OLD code without /categories/ranked.
    const hint = /not found/i.test(error) ? " Restart the backend with the latest files." : "";
    return (
      <p className="text-sm text-gray-500" role="alert">
        Categories are unavailable right now. ({error}){hint}
      </p>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <div className="relative w-full group/ranked">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous categories"
        className="absolute -left-3 md:-left-5 top-1/3 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 border border-gray-200 shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <FaAngleLeft className="text-sm" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next categories"
        className="absolute -right-3 md:-right-5 top-1/3 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-800 border border-gray-200 shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <FaAngleRight className="text-sm" />
      </button>

      <div
        ref={scrollRef}
        className="w-full flex gap-4 md:gap-5 overflow-x-auto scroll-smooth pb-4 select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {data.map((cat) => {
          const to = cat.type === "main" ? `/categories/${cat.slug}` : `/categories/${cat.mainSlug}/${cat.slug}`;
          const products = formatCount(cat.productCount);
          const high = formatCount(cat.highScoreCount);
          return (
            <Link
              key={`${cat.type}:${cat.slug}`}
              to={to}
              className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-[calc(33.333%-0.9rem)] lg:w-[calc(25%-0.95rem)] flex flex-col gap-3 group text-left"
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white border border-gray-200">
                <ProductImage
                  src={cat.topProduct.imgUrl}
                  alt={`${cat.name}: ${cat.topProduct.title}`}
                  className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                />
                {variant === "badge" && (
                  <div className="absolute top-2.5 left-2.5 bg-black/90 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold tracking-wider text-white flex items-center gap-1.5 border border-white/10">
                    <span className="w-1.5 h-1.5 bg-emerald-400 inline-block" />
                    <span>AVG AI SCORE {cat.avgAiScore.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start">
                <h3 className="font-bold text-base sm:text-lg text-black group-hover:text-blue-600 transition-colors line-clamp-2">
                  {cat.name}
                </h3>
                <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                  {variant === "badge"
                    ? `${products} PRODUCTS${high ? ` · ${high} SCORE 95+` : ""}`
                    : `AVG AI SCORE ${cat.avgAiScore.toFixed(1)} · ${products} PRODUCTS`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryCarousel;