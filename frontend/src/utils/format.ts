// The dataset's prices are GBP (amazon.co.uk). They are converted to rupees
// for display using VITE_GBP_TO_INR (1 GBP = N INR). Update it in .env when
// you want a fresher rate; restart `npm run dev` after changing it.
const DEFAULT_GBP_TO_INR = 126.7;
const envRate = Number(import.meta.env.VITE_GBP_TO_INR);
export const GBP_TO_INR = Number.isFinite(envRate) && envRate > 0 ? envRate : DEFAULT_GBP_TO_INR;

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const countFormatter = new Intl.NumberFormat("en-GB");

/** Returns null (never a fake "£0.00") when the price is missing. */
export function formatPrice(price: number | null | undefined): string | null {
  return typeof price === "number" && Number.isFinite(price) && price > 0
    ? priceFormatter.format(price * GBP_TO_INR)
    : null;
}

export function formatCount(n: number | null | undefined): string | null {
  return typeof n === "number" && Number.isFinite(n) && n > 0
    ? countFormatter.format(n)
    : null;
}

export function formatRating(stars: number | null | undefined): string | null {
  return typeof stars === "number" && Number.isFinite(stars) && stars > 0
    ? stars.toFixed(1)
    : null;
}

/** Only allow http(s) links to be rendered as external hrefs. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}