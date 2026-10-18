/**
 * Reads the CSV's categoryName column and reports which labels are mapped by
 * src/config/categoryMap.js. No database needed.
 *   node scripts/checkCategoryMap.js [path/to/Predictions.csv]
 */
import fs from "node:fs";
import { parse } from "csv-parse";
import { mapCategory, CATEGORY_DUPLICATES } from "../catalog/config/categoryMap.js";

const file = process.argv[2] || process.env.CSV_PATH || "./data/Predictions.csv";
const counts = new Map();
const parser = fs.createReadStream(file).pipe(parse({ columns: true, bom: true, skip_empty_lines: true }));
for await (const row of parser) counts.set(row.categoryName, (counts.get(row.categoryName) || 0) + 1);

const unmapped = [...counts].filter(([l]) => !mapCategory(l).mapped);
console.log(`Distinct source labels: ${counts.size}`);
console.log(`Unmapped labels: ${unmapped.length}`);
unmapped.forEach(([l, n]) => console.log(`  - "${l}" (${n} products)`));
if (CATEGORY_DUPLICATES.length) console.log("Labels listed more than once in categoryMap.js:", CATEGORY_DUPLICATES);
