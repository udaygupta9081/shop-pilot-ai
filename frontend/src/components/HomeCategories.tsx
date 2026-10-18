import { Link } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { useAsync } from "../hooks/useAsync";
import Categories, { type CategoryItem } from "./categories";

const MAX_GROUPS = 4;
const SUBS_PER_GROUP = 9;
// Marketing label in the source data, not a product type: don't feature it as a group.
const SKIP_MAIN = new Set(["customers-most-loved", "other"]);

/** Homepage category showcase built from real categories + real product thumbnails. */
const HomeCategories = () => {
  const { data, error, loading } = useAsync("home-categories", () => getCategories());

  if (loading) {
    return <div className="h-48 bg-neutral-100 rounded animate-pulse" role="status" aria-label="Loading categories" />;
  }
  if (error || !data) {
    return <p className="text-sm text-gray-500" role="alert">Categories are unavailable right now.</p>;
  }

  const groups = data
    .filter((m) => !SKIP_MAIN.has(m.slug))
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, MAX_GROUPS);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((main) => {
        const items: CategoryItem[] = (main.subcategories ?? [])
          .filter((s) => s.thumbnail)
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, SUBS_PER_GROUP)
          .map((s) => ({
            id: s.slug,
            src: s.thumbnail as string,
            name: s.name,
            to: `/categories/${main.slug}/${s.slug}`,
          }));
        if (items.length === 0) return null;
        return (
          <div key={main.slug} className="flex flex-col">
            <Categories subHeading={main.name} categories={items} />
            <Link to={`/categories/${main.slug}`} className="mt-3 text-xs font-bold uppercase tracking-wider text-emerald-700 hover:underline self-start">
              See all {main.name} →
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default HomeCategories;
