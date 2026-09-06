/**
 * Search data layer.
 *
 * The project does not yet have a backend Product Search API (see
 * services.drawio / Schema.drawio for the planned architecture), so this
 * file provides an isolated MOCK implementation of:
 *   - popular / default-recent search terms
 *   - search suggestions ("did you mean" style autocomplete)
 *   - product search results
 *
 * Everything a component needs from "search" is exposed through the
 * functions below (`getSuggestions`, `searchProducts`). When a real
 * backend endpoint such as `GET /products/search?q=` becomes available,
 * only this file needs to change — no component should need to be
 * touched.
 */

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  rating: number;
  reviewCount?: number;
  image: string;
  category: string;
}

// Shown under the "POPULAR" heading when the search box is empty.
export const POPULAR_SEARCHES: string[] = [
  "Sunscreen Without White Cast",
  "Hair Oil for Frizzy Hair",
  "Shampoo for Hair Fall",
  "Best Phone for Gaming",
];

// Seed value used only the first time the page loads and there is no
// recent-search history yet in localStorage.
export const DEFAULT_RECENT_SEARCHES: string[] = ["Face Wash for Oily Skin"];

// Mock product catalogue used to power search results until a real
// Product Search API is wired up.
const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Oil-Control Face Wash for Oily Skin",
    brand: "Cetaphil",
    price: 349,
    rating: 4.4,
    reviewCount: 2100,
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    category: "Skincare",
  },
  {
    id: "p2",
    name: "Oil Free Face Wash for Oily Skin",
    brand: "Neutrogena",
    price: 279,
    rating: 4.5,
    reviewCount: 3900,
    image:
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80",
    category: "Skincare",
  },
  {
    id: "p3",
    name: "Matte Sunscreen SPF 50 - No White Cast",
    brand: "Minimalist",
    price: 549,
    rating: 4.6,
    reviewCount: 3400,
    image:
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80",
    category: "Skincare",
  },
  {
    id: "p4",
    name: "Redensyl Hair Growth Oil",
    brand: "WOW Life Science",
    price: 399,
    rating: 4.2,
    reviewCount: 1500,
    image:
      "https://images.unsplash.com/photo-1608248597359-2ffb233a7587?w=400&auto=format&fit=crop&q=80",
    category: "Haircare",
  },
  {
    id: "p5",
    name: "Non-Sticky Hair Oil for Frizzy Hair",
    brand: "Dabur",
    price: 189,
    rating: 4.0,
    reviewCount: 2600,
    image:
      "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80",
    category: "Haircare",
  },
  {
    id: "p6",
    name: "Anti Hair Fall Shampoo",
    brand: "Mamaearth",
    price: 299,
    rating: 4.1,
    reviewCount: 5200,
    image:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&auto=format&fit=crop&q=80",
    category: "Haircare",
  },
  {
    id: "p7",
    name: "Frizz-Free Argan Hair Serum",
    brand: "L'Oreal Paris",
    price: 499,
    rating: 4.3,
    reviewCount: 980,
    image:
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80",
    category: "Haircare",
  },
  {
    id: "p8",
    name: "Gaming Phone X Pro 5G (12GB/256GB)",
    brand: "iQOO",
    price: 29999,
    rating: 4.5,
    reviewCount: 8700,
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&auto=format&fit=crop&q=80",
    category: "Phones",
  },
  {
    id: "p9",
    name: "Gaming Phone Ultra 5G (16GB/512GB)",
    brand: "Poco",
    price: 32999,
    rating: 4.4,
    reviewCount: 6100,
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=80",
    category: "Phones",
  },
  {
    id: "p10",
    name: "Long Battery Gaming Smartphone",
    brand: "Realme",
    price: 27999,
    rating: 4.3,
    reviewCount: 4300,
    image:
      "https://images.unsplash.com/photo-1520923642038-b4259acecbd7?w=400&auto=format&fit=crop&q=80",
    category: "Phones",
  },
];

// A bank of canned phrases used to build lightweight autocomplete
// suggestions while the user is typing. Mixed with product names so
// suggestions feel relevant to the mock catalogue above.
const SUGGESTION_BANK: string[] = [
  ...POPULAR_SEARCHES,
  ...DEFAULT_RECENT_SEARCHES,
  ...MOCK_PRODUCTS.map((product) => product.name),
  "Best Sunscreen for Oily Skin",
  "Vitamin C Serum for Glowing Skin",
  "Best Phone Under ₹20000",
  "Gaming Phone Under ₹30000",
  "Best Gaming Phone Battery",
  "Oil Free Moisturizer",
];

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Returns a small list of suggested search phrases for the given query.
 * Pure + synchronous so it is cheap to call on every keystroke. Replace
 * the body with a real autocomplete API call when one exists — the
 * function signature can stay the same.
 */
export function getSuggestions(query: string, limit = 6): string[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const matches = SUGGESTION_BANK.filter((phrase) =>
    normalize(phrase).includes(normalizedQuery),
  );

  const deduped = Array.from(new Set(matches));

  if (deduped.length >= limit) {
    return deduped.slice(0, limit);
  }

  // Fall back to a couple of templated suggestions so the list never
  // feels empty while still clearly being "based on" what was typed.
  const templated = [
    query,
    `Best ${query}`,
    `${query} price`,
  ].filter((phrase) => !deduped.some((d) => normalize(d) === normalize(phrase)));

  return [...deduped, ...templated].slice(0, limit);
}

/**
 * Mock product search. Simulates network latency so loading states can
 * be exercised, then filters/ranks the local catalogue by simple token
 * matching against name, brand and category.
 *
 * To connect a real backend later, replace the implementation with a
 * fetch to something like:
 *   GET /products/search?q=${encodeURIComponent(query)}
 * and keep the same return type (Promise<Product[]>).
 */
export function searchProducts(query: string): Promise<Product[]> {
  const normalizedQuery = normalize(query);

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!normalizedQuery) {
        resolve([]);
        return;
      }

      const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

      const scored = MOCK_PRODUCTS.map((product) => {
        const haystack = normalize(
          `${product.name} ${product.brand} ${product.category}`,
        );
        const score = tokens.reduce(
          (count, token) => (haystack.includes(token) ? count + 1 : count),
          0,
        );
        return { product, score };
      }).filter((entry) => entry.score > 0);

      scored.sort(
        (a, b) => b.score - a.score || b.product.rating - a.product.rating,
      );

      resolve(scored.map((entry) => entry.product));
    }, 400);
  });
}
