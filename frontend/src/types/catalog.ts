export interface ProductSummary {
  asin: string;
  title: string;
  imgUrl: string | null;
  price: number | null;
  stars: number | null;
  reviews: number | null;
  isBestSeller: boolean;
  /** AI product score, 0-100 (null when the product has none) */
  aiProductScore: number | null;
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

export type SortKey = "rating" | "popular" | "price_asc" | "price_desc" | "ai";

/** A category ranked by its average AI product score, with its best product's picture. */
export interface RankedCategory {
  slug: string;
  name: string;
  type: "main" | "sub";
  mainSlug: string;
  mainName: string;
  productCount: number;
  /** average AI product score of every product in the category (0-100) */
  avgAiScore: number;
  /** how many products score 95 or more */
  highScoreCount: number;
  topProduct: { asin: string; title: string; imgUrl: string; aiProductScore: number };
}