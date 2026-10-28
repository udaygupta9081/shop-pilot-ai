/**
 * Streams Predictions.csv into MongoDB (database shop_pilot).
 *
 *   node scripts/importCsv.js --dry-run [--file path] [--batch 1000]
 *   node scripts/importCsv.js           [--file path] [--batch 1000]
 *
 * - Streaming parse (constant memory), bulk upserts keyed on asin -> safe to re-run.
 * - Never deletes products. Categories are rebuilt (upsert) after the import.
 * - Dry run: parses + maps + validates everything but does not touch MongoDB.
 * - Writes import-report.json (invalid rows, duplicates, unmapped labels).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { productConnection } from "../utils/db.js";
import { normalizeRow } from "../catalog/utils/normalize.js";
import { CATEGORY_TREE, UNMAPPED_MAIN } from "../catalog/config/categoryMap.js";
import { Product } from "../catalog/models/Product.js";
import { Category } from "../catalog/models/Category.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY_RUN = flag("--dry-run");
const FILE = path.resolve(opt("--file", process.env.CSV_PATH || "./data/Predictions.csv"));
const BATCH = Math.max(100, Number(opt("--batch", 1000)));
const REPORT = path.resolve(opt("--report", "./import-report.json"));
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/shop_pilot";
const SAMPLE_LIMIT = 50;

if (!fs.existsSync(FILE)) {
  console.error(`CSV not found: ${FILE}\nPass --file <path> or set CSV_PATH.`);
  process.exit(1);
}

const stats = {
  mode: DRY_RUN ? "dry-run" : "import",
  file: FILE,
  totalRows: 0,
  validRows: 0,
  invalidRows: 0,
  duplicateAsins: 0,
  upserted: 0,
  modified: 0,
  matchedUnchanged: 0,
  writeErrors: 0,
  rowsWithoutImage: 0,
  rowsWithoutPrice: 0,
  rowsWithoutRating: 0,
  unmappedProducts: 0,
};
const invalidReasons = {};
const invalidSamples = [];
const duplicateSamples = [];
const unmappedLabels = new Map(); // label -> product count
const catCounts = new Map(); // subSlug -> { main, mainSlug, sub, subSlug, count }
const seen = new Set();

function recordInvalid(reason, line, asin) {
  stats.invalidRows++;
  invalidReasons[reason] = (invalidReasons[reason] || 0) + 1;
  if (invalidSamples.length < SAMPLE_LIMIT) invalidSamples.push({ line, reason, asin: asin ?? null });
}

async function flush(ops) {
  if (!ops.length || DRY_RUN) return;
  try {
    const r = await Product.bulkWrite(ops, { ordered: false });
    stats.upserted += r.upsertedCount;
    stats.modified += r.modifiedCount;
    stats.matchedUnchanged += r.matchedCount - r.modifiedCount;
  } catch (err) {
    // Partial failures: count what succeeded and surface the rest (never silent).
    const r = err.result ?? {};
    stats.upserted += r.upsertedCount ?? 0;
    stats.modified += r.modifiedCount ?? 0;
    const errs = err.writeErrors ?? [];
    stats.writeErrors += errs.length || ops.length;
    console.error(`bulkWrite error: ${err.message} (${errs.length} write errors in this batch)`);
    errs.slice(0, 3).forEach((e) => invalidSamples.length < SAMPLE_LIMIT && invalidSamples.push({ reason: `write_error: ${e.errmsg ?? e.message}` }));
  }
}

async function rebuildCategories() {
  // Thumbnails: the most-reviewed product with a valid image in each subcategory.
  const thumbs = new Map(
    (
      await Product.aggregate([
        { $match: { imgUrl: { $ne: null } } },
        { $sort: { reviews: -1, asin: 1 } },
        { $group: { _id: "$subSlug", imgUrl: { $first: "$imgUrl" } } },
      ]).allowDiskUse(true)
    ).map((t) => [t._id, t.imgUrl]),
  );
  const groups = await Product.aggregate([
    { $group: { _id: { mainSlug: "$mainSlug", main: "$mainCategory", subSlug: "$subSlug", sub: "$subcategory" }, count: { $sum: 1 } } },
  ]);

  const orderMain = new Map(CATEGORY_TREE.map((m) => [m.slug, m.order]));
  const orderSub = new Map(CATEGORY_TREE.flatMap((m) => m.subs.map((s) => [s.slug, s.order])));
  const mainTotals = new Map();
  const ops = [];
  for (const g of groups) {
    const { mainSlug, main, subSlug, sub } = g._id;
    mainTotals.set(mainSlug, { name: main, count: (mainTotals.get(mainSlug)?.count ?? 0) + g.count });
    ops.push({
      updateOne: {
        filter: { slug: subSlug },
        update: { $set: { name: sub, slug: subSlug, type: "sub", mainCategory: main, mainSlug, parentSlug: mainSlug, productCount: g.count, order: orderSub.get(subSlug) ?? 1000, thumbnail: thumbs.get(subSlug) ?? null } },
        upsert: true,
      },
    });
  }
  for (const [slug, m] of mainTotals) {
    ops.push({
      updateOne: {
        filter: { slug },
        update: { $set: { name: m.name, slug, type: "main", mainCategory: m.name, mainSlug: slug, parentSlug: null, productCount: m.count, order: orderMain.get(slug) ?? 1000, thumbnail: null } },
        upsert: true,
      },
    });
  }
  if (ops.length) await Category.bulkWrite(ops, { ordered: false });
  // Categories that no longer have products stay in the collection with productCount 0 (hidden by the API).
  const live = ops.map((o) => o.updateOne.filter.slug);
  await Category.updateMany({ slug: { $nin: live } }, { $set: { productCount: 0 } });
  return { categories: ops.length };
}

async function main() {
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Reading ${FILE}`);
  if (!DRY_RUN) {
    await productConnection.openUri(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`Connected to MongoDB database "${productConnection.name}"`);
    await Product.init(); // make sure indexes (incl. unique asin) exist before upserting
  }

  const parser = fs.createReadStream(FILE, { encoding: "utf8" }).pipe(
    parse({
      columns: true,
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      skip_records_with_error: true, // malformed CSV records are counted + reported, not fatal
      on_skip: (err) => {
        stats.totalRows++;
        recordInvalid(`csv_parse_error: ${err.code ?? err.message}`, err.lines);
      },
    }),
  );

  let ops = [];
  for await (const row of parser) {
    stats.totalRows++;
    const line = stats.totalRows + 1; // +1 for header
    const { doc, error, mapped, asin } = normalizeRow(row);
    if (error) {
      recordInvalid(error, line, asin ?? row.asin);
      continue;
    }
    if (seen.has(doc.asin)) {
      // Policy: the FIRST occurrence wins; later duplicates are skipped and reported.
      stats.duplicateAsins++;
      if (duplicateSamples.length < SAMPLE_LIMIT) duplicateSamples.push({ line, asin: doc.asin });
      continue;
    }
    seen.add(doc.asin);
    stats.validRows++;
    if (!doc.imgUrl) stats.rowsWithoutImage++;
    if (doc.price === null) stats.rowsWithoutPrice++;
    if (doc.stars === null) stats.rowsWithoutRating++;
    if (!mapped) {
      stats.unmappedProducts++;
      unmappedLabels.set(doc.sourceCategory || "(empty)", (unmappedLabels.get(doc.sourceCategory || "(empty)") ?? 0) + 1);
    }
    const c = catCounts.get(doc.subSlug) ?? { main: doc.mainCategory, sub: doc.subcategory, count: 0 };
    c.count++;
    catCounts.set(doc.subSlug, c);

    ops.push({ updateOne: { filter: { asin: doc.asin }, update: { $set: doc }, upsert: true } });
    if (ops.length >= BATCH) {
      await flush(ops);
      ops = [];
      if (stats.validRows % 10000 < BATCH) console.log(`  ...${stats.validRows.toLocaleString()} valid rows processed`);
    }
  }
  await flush(ops);

  let categoryResult = null;
  if (!DRY_RUN) {
    categoryResult = await rebuildCategories();
    console.log(`Rebuilt ${categoryResult.categories} category documents`);
  }

  const report = {
    ...stats,
    invalidReasons,
    invalidSamples,
    duplicateSamples,
    unmappedSourceCategories: [...unmappedLabels].map(([label, products]) => ({ label, products })),
    unmappedMainCategory: UNMAPPED_MAIN,
    subcategoryCount: catCounts.size,
    categoryCounts: [...catCounts].map(([subSlug, v]) => ({ subSlug, ...v })).sort((a, b) => b.count - a.count),
    categoriesRebuilt: categoryResult?.categories ?? null,
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  console.log("\n=== Import summary ===");
  console.log(`Mode:                     ${stats.mode}`);
  console.log(`Total rows read:          ${stats.totalRows.toLocaleString()}`);
  console.log(`Valid (unique) rows:      ${stats.validRows.toLocaleString()}`);
  console.log(`Invalid rows:             ${stats.invalidRows}  ${JSON.stringify(invalidReasons)}`);
  console.log(`Duplicate ASINs skipped:  ${stats.duplicateAsins}`);
  if (!DRY_RUN) console.log(`Upserted (new):           ${stats.upserted.toLocaleString()}\nUpdated (changed):        ${stats.modified.toLocaleString()}\nUnchanged:                ${stats.matchedUnchanged.toLocaleString()}\nWrite errors:             ${stats.writeErrors}`);
  console.log(`Without image/price/rating: ${stats.rowsWithoutImage} / ${stats.rowsWithoutPrice} / ${stats.rowsWithoutRating}`);
  console.log(`Subcategories:            ${catCounts.size}`);
  console.log(`Unmapped source labels:   ${unmappedLabels.size} (${stats.unmappedProducts} products, stored under "${UNMAPPED_MAIN}")`);
  unmappedLabels.forEach((n, l) => console.log(`   - "${l}": ${n}`));
  console.log(`Full report: ${REPORT}`);

  if (!DRY_RUN) await productConnection.close();
  process.exitCode = stats.writeErrors ? 2 : 0;
}

main().catch(async (err) => {
  console.error("Import failed:", err.message);
  try { await productConnection.close(); } catch { /* ignore */ }
  process.exit(1);
});
