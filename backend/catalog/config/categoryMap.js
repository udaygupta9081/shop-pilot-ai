/**
 * EDITABLE category mapping.
 *
 * Predictions.csv only has one flat label per product (`categoryName`, 277
 * distinct values) — there is no hierarchy in the data. This file groups
 * those labels into main categories for navigation. Nothing here invents a
 * label: every subcategory name is either a source label or a merge of
 * near-duplicate source labels.
 *
 * Format:  MAIN_CATEGORIES = [{ name, subs: [ "Source Label", ["Merged Name", "Label A", "Label B"] ] }]
 *  - a plain string  -> subcategory with the same name as the source label
 *  - an array        -> [displayName, ...sourceLabels] merged into one subcategory
 *
 * Source labels that are not listed anywhere are NOT dropped: the importer
 * stores them with mainCategory "Other" and lists them in the import report.
 * Run `npm run check:categories` to see which labels are mapped/unmapped.
 */
export const UNMAPPED_MAIN = "Other";

export const MAIN_CATEGORIES = [
  {
    name: "Electronics & Computers",
    subs: [
      "Cables & Accessories", "Data Storage", "Keyboards, Mice & Input Devices",
      "Networking Devices", ["Printers & Accessories", "Printers & Accessories", "Computer Printers"],
      "PC Gaming Accessories", "Monitors", "Monitor Accessories",
      "Computer Audio & Video Accessories", "Office Electronics", "Computer Memory",
      "Computer Memory Card Accessories", "CPUs", "Motherboards", "Graphics Cards",
      "Power Supplies", "Computer Cases", "Network Cards", "USB Hubs", "KVM Switches",
      "Laptops", "Laptop Accessories", "Tablets", "Tablet Accessories", "Desktop PCs",
      "Barebone PCs", "External Optical Drives", "Internal Optical Drives",
      "Hard Drive Accessories", "Adapters", "Scanners & Accessories", "Computer Screws",
      "Computer & Server Racks", "I/O Port Cards", "External Sound Cards",
      "External TV Tuners & Video Capture Cards", "Internal TV Tuner & Video Capture Cards",
      "3D Printing & Scanning", "3D Printers", "USB Gadgets", "eBook Readers & Accessories",
      "Computers, Components & Accessories", "Blank Media Cases & Wallets",
      "Household Batteries, Chargers & Accessories",
      "Uninterruptible Power Supply Units & Accessories", "Remote & App-Controlled Devices",
    ],
  },
  {
    name: "Phones & Wearables",
    subs: [
      "Mobile Phones & Communication", "Mobile Phones & Smartphones", "Mobile Phone Accessories",
      "Wearable Technology", "Smartwatches", "Telephones, VoIP & Accessories", "SIM Cards",
      "GPS, Finders & Accessories", "Radio Communication",
    ],
  },
  {
    name: "Audio, TV & Cameras",
    subs: [
      ["Headphones & Earphones", "Headphones & Earphones", "Headphones, Earphones & Accessories"],
      "Portable Sound & Video Products", "Home Cinema, TV & Video", "Hi-Fi & Home Audio Accessories",
      "Hi-Fi Speakers", "Hi-Fi Receivers & Separates", "Home Audio Record Players", "Microphones",
      "Radios & Boomboxes", "Smart Speakers", "Alexa Built-In Devices", "Streaming Clients",
      "Media Streaming Devices", "Home Entertainment", "Projectors", "CD, Disc & Tape Players",
      "Camera & Photo Accessories", "Lenses", "Tripods & Monopods", "Film Cameras",
      "Digital Cameras", "Action Cameras", "Camcorders", "Cameras", "Flashes",
      "Binoculars, Telescopes & Optics", "Surveillance Cameras",
    ],
  },
  {
    name: "Home & Kitchen",
    subs: [
      ["Storage & Organisation", "Storage & Organisation", "Storage & Home Organisation"],
      "Kitchen Storage & Organisation", "Boxes & Organisers", "Small Kitchen Appliances",
      "Coffee, Tea & Espresso", "Coffee & Espresso Machines", "Large Appliances",
      "Vacuums & Floorcare", "Ironing & Steamers", "Heating, Cooling & Air Quality", "Cookware",
      "Bakeware", "Tableware", "Kitchen Tools & Gadgets", "Kitchen Linen", "Kitchen & Bath Fixtures",
      "Furniture & Lighting", "Home Entertainment Furniture", "Living Room Furniture",
      "Bedroom Furniture", "Hallway Furniture", "Bathroom Furniture", "Home Office Furniture",
      "Home Bar Furniture", "Dining Room Furniture", "Cushions & Accessories",
      "Rugs, Pads & Protectors", "Bedding & Linen", "Bedding Collections", "Bedding Accessories",
      "Children's Bedding", "Mattress Pads & Toppers", "Bathroom Linen", "Window Treatments",
      "Curtain & Blind Accessories", "Doormats", "Slipcovers", "Mirrors", "Clocks",
      "Signs & Plaques", "Vases", "Candles & Holders", "Home Fragrance",
      "Decorative Artificial Flora", "Decorative Home Accessories", "Photo Frames", "Digital Frames",
      "Fireplaces, Stoves & Accessories", "Water Coolers, Filters & Cartridges",
      "Handmade Home & Kitchen Products", "Indoor Lighting", "Light Bulbs", "String Lights",
      "Lighting", "Lights and switches", "Bathroom Lighting", "Smart Home Security & Lighting",
      "Safety & Security",
    ],
  },
  {
    name: "Beauty & Personal Care",
    subs: ["Skin Care", "Make-up", "Beauty", "Hair Care", "Manicure & Pedicure Products", "Bath & Body", "Fragrances"],
  },
  {
    name: "Health & Wellness",
    subs: ["Health & Personal Care", "Sports Supplements", "Professional Medical Supplies"],
  },
  {
    name: "Fashion & Luggage",
    subs: [
      "Men", "Women", "Boys", "Girls", "Luggage and travel gear",
      "Handmade Clothing, Shoes & Accessories", "Handmade Jewellery",
    ],
  },
  {
    name: "Sports & Outdoors",
    subs: [
      "Sports & Outdoors", "Men's Sports & Outdoor Shoes", "Women's Sports & Outdoor Shoes",
      "Table Tennis", "Basketball Footwear", "Tennis Shoes", "Golf Shoes", "Boxing Shoes",
      "Climbing Footwear", "Equestrian Sports Boots", "Hockey Shoes", "Cycling Shoes",
      "Ballet & Dancing Footwear", "Ski Clothing", "Ski Goggles", "Ski Helmets", "Skiing Poles",
      "Downhill Skis", "Snowboards", "Snowboard Bindings", "Snow Sledding Equipment",
      "Hiking Hand & Foot Warmers", "Darts & Dartboards", "Bowling", "Billiard, Snooker & Pool",
      "Trampolines & Accessories", "Inflatable Beds, Pillows & Accessories",
    ],
  },
  {
    name: "Toys, Games & Baby",
    subs: [
      "Baby", "Baby & Toddler Toys", "Kids' Play Figures", "Kids' Play Vehicles",
      "Kids' Dress Up & Pretend Play", "Dolls & Accessories", "Building & Construction Toys",
      "Learning & Education Toys", "Soft Toys", "Electronic Toys", "Jigsaws & Puzzles",
      "Games & Game Accessories", "PC & Video Games", "Toy Advent Calendars", "Sports Toys & Outdoor",
      "Hobbies", "Handmade Gifts", "Birthday Gifts",
    ],
  },
  {
    name: "Garden & Outdoor Living",
    subs: [
      "Gardening", "Garden Furniture & Accessories", "Garden Décor", "Garden Tools & Watering Equipment",
      "Garden Storage & Housing", "Plants, Seeds & Bulbs", "Mowers & Outdoor Power Tools",
      "Outdoor Lighting", "Outdoor Rope Lights", "Outdoor Cooking", "Outdoor Heaters & Fire Pits",
      "Pools, Hot Tubs & Supplies", "Bird & Wildlife Care", "Decking & Fencing",
    ],
  },
  {
    name: "Tools, DIY & Auto",
    subs: [
      "Hardware", "Power & Hand Tools", "Electrical", "Electrical Power Accessories", "Plugs",
      "Industrial Electrical", "Building Supplies", "Painting Supplies, Tools & Wall Treatments",
      "Rough Plumbing", "Abrasive & Finishing Products", "Cutting Tools", "Material Handling Products",
      "Construction Machinery", "Test & Measurement", "Lab & Scientific Products",
      "Packaging & Shipping Supplies", "Agricultural Equipment & Supplies",
      "Thermometers & Meteorological Instruments", "Torches", "Car & Motorbike", "Car & Vehicle Electronics",
      "Motorbike Clothing", "Motorbike Accessories", "Motorbike Lighting", "Motorbike Batteries",
      "Motorbike Boots & Luggage", "Motorbike Seat Covers", "Motorbike Electrical & Batteries",
      "Motorbike Handlebars, Controls & Grips", "Motorbike Instruments",
    ],
  },
  {
    name: "Office, School & Crafts",
    subs: [
      "Pens, Pencils & Writing Supplies", "Office Supplies", "Office Paper Products",
      ["Arts & Crafts", "Arts & Crafts", "Art & Craft Supplies"], "Kids' Art & Craft Supplies",
      "School & Educational Supplies", "Professional Education Supplies", "Calendars & Personal Organisers",
    ],
  },
  {
    name: "Grocery & Pets",
    subs: [
      "Grocery", "Pet Supplies", "Beer, Wine & Spirits", "Luxury Food & Drink", "Home Brewing & Wine Making",
    ],
  },
  {
    name: "Music & Instruments",
    subs: [
      "Guitars & Gear", "Bass Guitars & Gear", "Piano & Keyboard", "String Instruments", "Wind Instruments",
      "Drums & Percussion", "Synthesisers, Samplers & Digital Instruments", "General Music-Making Accessories",
      "DJ & VJ Equipment", "PA & Stage", "Recording & Computer", "Karaoke Equipment",
    ],
  },
  {
    // "Customers' Most Loved" is a marketing label in the source data, not a product type.
    name: "Customers' Most Loved",
    subs: ["Customers' Most Loved"],
  },
];

/** Unique, URL-safe slug. Stable for the same input. */
export function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds lookup tables from MAIN_CATEGORIES.
 * Returns { bySource: Map<sourceLabel, {main, mainSlug, sub, subSlug}>, tree, duplicates }.
 * A source label listed twice keeps its FIRST mapping and is reported in `duplicates`.
 */
export function buildCategoryIndex(mainCategories = MAIN_CATEGORIES) {
  const bySource = new Map();
  const duplicates = [];
  const usedSubSlugs = new Map(); // subSlug -> "main::sub" owner, to keep sub slugs globally unique
  const tree = [];

  mainCategories.forEach((m, mi) => {
    const mainSlug = slugify(m.name);
    const node = { name: m.name, slug: mainSlug, order: mi, subs: [] };
    m.subs.forEach((entry, si) => {
      const [subName, ...labels] = Array.isArray(entry) ? entry : [entry, entry];
      let subSlug = slugify(subName);
      const owner = `${m.name}::${subName}`;
      if (usedSubSlugs.has(subSlug) && usedSubSlugs.get(subSlug) !== owner) {
        subSlug = `${subSlug}-${mainSlug}`; // collision across mains
      }
      usedSubSlugs.set(subSlug, owner);
      node.subs.push({ name: subName, slug: subSlug, order: si, sources: labels });
      for (const label of labels) {
        if (bySource.has(label)) duplicates.push(label);
        else bySource.set(label, { main: m.name, mainSlug, sub: subName, subSlug });
      }
    });
    tree.push(node);
  });

  return { bySource, tree, duplicates };
}

const INDEX = buildCategoryIndex();
export const CATEGORY_TREE = INDEX.tree;
export const CATEGORY_DUPLICATES = INDEX.duplicates;

/**
 * Maps a raw source label to its categories. Unknown/empty labels are
 * returned under mainCategory "Other" with `mapped: false` so the caller can
 * report them instead of silently losing the product.
 */
export function mapCategory(sourceLabel) {
  const label = String(sourceLabel ?? "").trim();
  const hit = INDEX.bySource.get(label);
  if (hit) return { ...hit, mapped: true };
  const sub = label || "Uncategorised";
  return {
    main: UNMAPPED_MAIN,
    mainSlug: slugify(UNMAPPED_MAIN),
    sub,
    subSlug: `${slugify(sub)}-${slugify(UNMAPPED_MAIN)}`,
    mapped: false,
  };
}
