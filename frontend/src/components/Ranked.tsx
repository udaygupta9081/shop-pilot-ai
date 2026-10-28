import CategoryCarousel from "./CategoryCarousel";

/** "Freshly re-ranked": top subcategories by average AI score, with real product pictures. */
const Ranked = () => <CategoryCarousel level="sub" limit={12} variant="badge" />;

export default Ranked;