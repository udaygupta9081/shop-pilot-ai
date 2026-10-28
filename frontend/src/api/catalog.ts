import { apiGet } from "./client";
import type {
  Category,
  CategoryProductsResponse,
  ProductDetails,
  RankedCategory,
  SearchResponse,
  SortKey,
} from "../types/catalog";

let categoriesPromise: Promise<Category[]> | null = null;

/** Category tree, fetched once and shared (navbar menu + homepage + index page). */
export function getCategories(): Promise<Category[]> {
  if (!categoriesPromise) {
    categoriesPromise = apiGet<Category[]>("/categories").catch((err) => {
      categoriesPromise = null; // allow a retry after a failure
      throw err;
    });
  }
  return categoriesPromise;
}

/** Categories ordered by average AI product score (highest first). */
export const getRankedCategories = (level: "main" | "sub", limit: number, signal?: AbortSignal) =>
  apiGet<RankedCategory[]>("/categories/ranked", { level, limit }, signal);

export const getCategory = (slug: string, signal?: AbortSignal) =>
  apiGet<Category>(`/categories/${encodeURIComponent(slug)}`, undefined, signal);

export const getCategoryProducts = (
  slug: string,
  opts: { page?: number; limit?: number; sort?: SortKey; q?: string },
  signal?: AbortSignal,
) =>
  apiGet<CategoryProductsResponse>(
    `/categories/${encodeURIComponent(slug)}/products`,
    opts,
    signal,
  );

export const searchProducts = (
  q: string,
  opts: { page?: number; limit?: number; sort?: SortKey; withTotal?: boolean },
  signal?: AbortSignal,
) =>
  apiGet<SearchResponse>(
    "/products/search",
    { q, ...opts, withTotal: opts.withTotal === false ? "false" : undefined },
    signal,
  );

export const getProduct = (asin: string, signal?: AbortSignal) =>
  apiGet<ProductDetails>(`/products/${encodeURIComponent(asin)}`, undefined, signal);