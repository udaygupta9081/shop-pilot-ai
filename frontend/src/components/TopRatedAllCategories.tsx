import CategoryCarousel from "./CategoryCarousel";

/** "Where Most People Start": one card per main aisle, best average AI score first. */
const TopRatedAllCategories = () => <CategoryCarousel level="main" limit={13} variant="plain" />;

export default TopRatedAllCategories;