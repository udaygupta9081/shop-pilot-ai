import { Link } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { useAsync } from "../hooks/useAsync";
import { ErrorState } from "../components/ProductGrid";
import { formatCount } from "../utils/format";
import ProductImage from "../components/ProductImage";

/** "Browse All Categories": every main category with its subcategories. */
const CategoriesIndex = () => {
  const { data, error, loading } = useAsync("all-categories", () => getCategories());
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-white pb-16">
      <div className="w-[92%] md:w-[80%] mx-auto pt-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-8">All categories</h1>
        {loading && <div className="h-64 bg-neutral-100 rounded animate-pulse" role="status" aria-label="Loading categories" />}
        {error && <ErrorState message={error} />}
        {data && (
          <div className="flex flex-col gap-10">
            {data.map((main) => (
              <section key={main.slug}>
                <div className="flex items-baseline justify-between border-b border-gray-200 pb-2 mb-4">
                  <h2 className="text-lg font-bold">{main.name}</h2>
                  <Link to={`/categories/${main.slug}`} className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:underline">
                    View all {formatCount(main.productCount)} →
                  </Link>
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
                  {(main.subcategories ?? []).map((s) => (
                    <li key={s.slug}>
                      <Link to={`/categories/${main.slug}/${s.slug}`} className="flex items-center gap-3 group">
                        <ProductImage src={s.thumbnail} alt="" className="w-10 h-10 object-contain shrink-0 border border-gray-100 rounded bg-white" />
                        <span className="text-sm text-gray-800 group-hover:text-emerald-700 group-hover:underline">
                          {s.name} <span className="text-gray-400">({formatCount(s.productCount)})</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesIndex;
