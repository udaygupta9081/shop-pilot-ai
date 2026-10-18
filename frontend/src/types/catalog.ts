export interface ProductSummary {
  asin: string;
  title: string;
  imgUrl: string | null;
  price: number | null;
  stars: number | null;
  reviews: number | null;
  isBestSeller: boolean;
  mainCategory: string;
  mainSlug: string;
  subcategory: string;
  subSlug: string;
}

export interface ProductDetails extends ProductSummary {
  productURL: string | null;
  boughtInLastMonth: number;
  sourceCategory: string;
  // Model output, kept separate from the real `isBestSeller` flag.
  bestsellerProbabilityPercent: number | null;
  predictedBestseller: boolean;
  predictionLabel: string | null;
  aiProductScore: number | null;
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  /** null when the request asked to skip the (more expensive) count */
  total: number | null;
  totalPages: number | null;
}

export interface SearchResponse extends Paged<ProductSummary> {
  query: string;
}

export interface Category {
  name: string;
  slug: string;
  type: "main" | "sub";
  mainCategory: string;
  mainSlug: string;
  parentSlug: string | null;
  productCount: number;
  order: number;
  thumbnail: string | null;
  subcategories?: Category[];
  parent?: { name: string; slug: string } | null;
}

export interface CategoryProductsResponse extends Paged<ProductSummary> {
  category: Category;
}

export type SortKey = "rating" | "popular" | "price_asc" | "price_desc";
