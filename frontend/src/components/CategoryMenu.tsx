import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaAngleDown, FaAngleRight } from "react-icons/fa6";
import { getCategories } from "../api/catalog";
import type { Category } from "../types/catalog";
import { formatCount } from "../utils/format";

/**
 * "Categories" nav item + mega-menu.
 * Desktop: left list of main categories, right panel of subcategory columns.
 * Mobile: click-to-expand accordion (no hover-only behaviour).
 */
const CategoryMenu = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load lazily the first time the menu opens (shared, cached request).
  useEffect(() => {
    if (!open || categories) return;
    let cancelled = false;
    getCategories()
      .then((c) => !cancelled && (setCategories(c), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, categories, attempt]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const current = categories?.find((c) => c.slug === selected) ?? categories?.[0] ?? null;

  return (
    <div ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-white hover:text-gray-300 cursor-pointer transition"
      >
        Categories <FaAngleDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 bg-white text-black border-t border-gray-200 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="w-[92%] md:w-[80%] mx-auto py-4">
            {failed && (
              <p className="py-6 text-sm text-gray-600" role="alert">
                Couldn’t load categories.{" "}
                <button type="button" className="underline font-semibold cursor-pointer" onClick={() => { setFailed(false); setAttempt((a) => a + 1); }}>Retry</button>
              </p>
            )}
            {!failed && !categories && <p className="py-6 text-sm text-gray-500" role="status">Loading categories…</p>}
            {categories && categories.length === 0 && (
              <p className="py-6 text-sm text-gray-600">No categories yet. Run the CSV import first.</p>
            )}

            {categories && current && (
              <>
                {/* Desktop: two panels */}
                <div className="hidden md:flex min-h-[320px]">
                  <ul className="w-72 shrink-0 border-r border-gray-200 pr-2">
                    {categories.map((c) => (
                      <li key={c.slug}>
                        <button
                          type="button"
                          onMouseEnter={() => setSelected(c.slug)}
                          onFocus={() => setSelected(c.slug)}
                          onClick={() => setSelected(c.slug)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left cursor-pointer ${current.slug === c.slug ? "bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600" : "hover:bg-gray-50 border-l-4 border-transparent"}`}
                        >
                          {c.name}
                          <FaAngleRight className="text-xs text-gray-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex-1 pl-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold">{current.name}</h3>
                      <Link to={`/categories/${current.slug}`} onClick={close} className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:underline">
                        Open Category →
                      </Link>
                    </div>
                    <ul className="columns-2 lg:columns-3 gap-6">
                      {(current.subcategories ?? []).map((s) => (
                        <li key={s.slug} className="break-inside-avoid mb-1.5">
                          <Link to={`/categories/${current.slug}/${s.slug}`} onClick={close} className="text-sm text-gray-700 hover:text-emerald-700 hover:underline">
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link to={`/categories/${current.slug}`} onClick={close} className="inline-block mt-4 text-sm font-semibold underline">
                      View All {formatCount(current.productCount)} products
                    </Link>
                  </div>
                </div>

                {/* Mobile: accordion */}
                <ul className="md:hidden">
                  {categories.map((c) => (
                    <li key={c.slug} className="border-b border-gray-100">
                      <button
                        type="button"
                        aria-expanded={expanded === c.slug}
                        onClick={() => setExpanded((e) => (e === c.slug ? null : c.slug))}
                        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-left cursor-pointer"
                      >
                        {c.name}
                        <FaAngleDown className={`text-xs transition-transform ${expanded === c.slug ? "rotate-180" : ""}`} />
                      </button>
                      {expanded === c.slug && (
                        <ul className="pb-3 pl-3 grid grid-cols-1 gap-1.5">
                          <li>
                            <Link to={`/categories/${c.slug}`} onClick={close} className="text-sm font-semibold text-emerald-700">View All</Link>
                          </li>
                          {(c.subcategories ?? []).map((s) => (
                            <li key={s.slug}>
                              <Link to={`/categories/${c.slug}/${s.slug}`} onClick={close} className="text-sm text-gray-700">{s.name}</Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryMenu;
