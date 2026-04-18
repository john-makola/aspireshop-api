import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ─── Category → folder mapping ──────────────────────────────────────
const CATEGORY_FOLDER_MAP: Record<string, string> = {
  paper: "Paper Products",
  textile: "Textiles",
  "corporate-gifts": "Corporate Gifts",
  "office-stationery": "Office Stationery",
  "home-items": "Home Items",
  "personal-gifts": "Personal Gifts",
  events: "Events",
  signage: "signage",
  branding: "branding",
  general: "general",
  sports: "sports",
};

const CATEGORIES_DIR = path.resolve(__dirname, "../public/categories");

// ─── Image scanning + grouping ──────────────────────────────────────

interface ProductImageGroup {
  baseName: string;
  files: string[]; // relative paths from /categories/
}

function scanAndGroupImages(folder: string, categoryFolder: string): ProductImageGroup[] {
  const fullPath = path.join(CATEGORIES_DIR, categoryFolder);
  if (!fs.existsSync(fullPath)) return [];

  const files = fs.readdirSync(fullPath).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
  });

  if (files.length === 0) return [];

  // Group by base name: strip trailing digits and known suffixes
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const baseName = extractBaseName(file);
    if (!groups.has(baseName)) {
      groups.set(baseName, []);
    }
    groups.get(baseName)!.push(file);
  }

  return Array.from(groups.entries()).map(([baseName, groupFiles]) => ({
    baseName,
    files: groupFiles.sort(),
  }));
}

function extractBaseName(filename: string): string {
  // Remove extension
  let name = filename.replace(/\.[^.]+$/, "");
  // Handle double extensions like "brochure design.jpg2.jpg" -> "brochure design"
  name = name.replace(/\.jpg\d*$/, "");
  // Remove trailing numeric suffixes: "businessCards3" -> "businessCards"
  // But preserve numbers that are part of the name like "500ml" or "2026"
  name = name.replace(/\d+$/, "");
  // Clean up trailing whitespace and underscores
  name = name.replace(/[_\s]+$/, "");
  return name.trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-+/g, "-");
}

// SKU counter per category
const skuCounters: Record<string, number> = {};
function generateSku(categorySlug: string): string {
  const prefix: Record<string, string> = {
    paper: "PAP",
    textile: "TXT",
    "corporate-gifts": "CGF",
    "office-stationery": "OFS",
    "home-items": "HOM",
    "personal-gifts": "PGF",
    events: "EVT",
    signage: "SGN",
    branding: "BRD",
    general: "GEN",
    sports: "SPT",
  };
  const pfx = prefix[categorySlug] || "PRD";
  skuCounters[categorySlug] = (skuCounters[categorySlug] || 0) + 1;
  return `${pfx}-${String(skuCounters[categorySlug]).padStart(3, "0")}`;
}

// ─── Product metadata by name ────────────────────────────────────────
// Rich descriptions, pricing, tags, customizations per product group

interface ProductMeta {
  description: string;
  shortDescription: string;
  basePrice: number;
  compareAtPrice?: number;
  stock: number;
  isFeatured?: boolean;
  isCustomizable?: boolean;
  minOrderQty: number;
  availability?: string;
  tags: string[];
  tiers: { minQty: number; maxQty: number | null; price: number }[];
  customizations: { name: string; type: string; options?: string; required: boolean }[];
}

function getProductMeta(baseName: string, categorySlug: string): ProductMeta {
  const key = baseName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // ─── Paper Products ────────────────────────────────
  if (categorySlug === "paper") {
    if (key.includes("businesscard")) return {
      description: "Premium double-sided full-color business cards printed on 350gsm card stock. Available in matte, glossy, or silk lamination finishes. Rounded or square corners. Custom design assistance included.",
      shortDescription: "350gsm premium business cards with full-color printing",
      basePrice: 2500, compareAtPrice: 3500, stock: 500, isFeatured: true, isCustomizable: true, minOrderQty: 100,
      tags: ["featured", "on-sale"],
      tiers: [{ minQty: 100, maxQty: 499, price: 2500 }, { minQty: 500, maxQty: 999, price: 2000 }, { minQty: 1000, maxQty: null, price: 1500 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Custom Text", type: "text", required: false },
        { name: "Finish", type: "select", options: '["Matte","Glossy","Silk","Spot UV"]', required: true },
      ],
    };
    if (key.includes("brochure")) return {
      description: "Professional A4 tri-fold brochures printed on 170gsm art paper with full-color printing on both sides. Perfect for marketing campaigns, product catalogs, and company profiles. Includes folding and trimming.",
      shortDescription: "A4 tri-fold brochures on 170gsm art paper",
      basePrice: 4500, stock: 300, isCustomizable: true, minOrderQty: 50,
      tags: ["new-arrival"],
      tiers: [{ minQty: 50, maxQty: 199, price: 4500 }, { minQty: 200, maxQty: 499, price: 3800 }, { minQty: 500, maxQty: null, price: 3000 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Content Text", type: "text", required: false },
        { name: "Paper Weight", type: "select", options: '["150gsm","170gsm","200gsm","250gsm"]', required: true },
      ],
    };
    if (key.includes("flyer") || key.includes("flier")) return {
      description: "Eye-catching promotional flyers printed on quality art paper. Available in A4, A5, and DL sizes. Full-color front and back printing. Ideal for events, promotions, and marketing campaigns.",
      shortDescription: "Full-color promotional flyers on art paper",
      basePrice: 3000, compareAtPrice: 4000, stock: 500, isCustomizable: true, minOrderQty: 100,
      tags: ["on-sale"],
      tiers: [{ minQty: 100, maxQty: 499, price: 3000 }, { minQty: 500, maxQty: 999, price: 2200 }, { minQty: 1000, maxQty: null, price: 1500 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["A4","A5","DL"]', required: true },
        { name: "Paper Weight", type: "select", options: '["130gsm","150gsm","170gsm"]', required: true },
      ],
    };
    if (key.includes("invoice")) return {
      description: "Custom-printed invoice books with your business details and logo. Available in duplicate (NCR) and triplicate formats with sequential numbering. Perforated for easy tearing.",
      shortDescription: "Custom invoice books with NCR/sequential numbering",
      basePrice: 3500, stock: 300, isCustomizable: true, minOrderQty: 5,
      tags: [],
      tiers: [{ minQty: 5, maxQty: 19, price: 3500 }, { minQty: 20, maxQty: 49, price: 3000 }, { minQty: 50, maxQty: null, price: 2500 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Format", type: "select", options: '["Duplicate","Triplicate"]', required: true },
        { name: "Company Details", type: "text", required: true },
      ],
    };
    if (key.includes("deliverynote")) return {
      description: "Professional delivery note books with custom company branding. Duplicate NCR paper with sequential numbering. Essential for logistics tracking and proof of delivery.",
      shortDescription: "Custom delivery note books with NCR paper",
      basePrice: 3000, stock: 300, isCustomizable: true, minOrderQty: 5,
      tags: [],
      tiers: [{ minQty: 5, maxQty: 19, price: 3000 }, { minQty: 20, maxQty: 49, price: 2500 }, { minQty: 50, maxQty: null, price: 2000 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Company Details", type: "text", required: true },
      ],
    };
    if (key.includes("receipt")) return {
      description: "Custom receipt books printed on NCR (no carbon required) paper. Available in duplicate and triplicate with sequential numbering and perforation. Your business details and logo pre-printed.",
      shortDescription: "Custom NCR receipt books with numbering",
      basePrice: 2800, stock: 400, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 2800 }, { minQty: 50, maxQty: null, price: 2200 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Format", type: "select", options: '["Duplicate","Triplicate"]', required: true },
      ],
    };
    if (key.includes("report")) return {
      description: "Professional corporate report printing and binding. High-quality color printing on premium paper with choice of binding styles. Perfect for annual reports, company profiles, and proposals.",
      shortDescription: "Professional report printing and binding",
      basePrice: 5000, stock: 200, isCustomizable: true, minOrderQty: 10,
      tags: ["new-arrival"],
      tiers: [{ minQty: 10, maxQty: 49, price: 5000 }, { minQty: 50, maxQty: 99, price: 4200 }, { minQty: 100, maxQty: null, price: 3500 }],
      customizations: [
        { name: "Content Upload", type: "file", required: true },
        { name: "Binding", type: "select", options: '["Perfect Binding","Wire-O","Saddle Stitch","Hardcover"]', required: true },
      ],
    };
    if (key.includes("jobcard")) return {
      description: "Custom job card pads for workshops, service centers, and maintenance teams. Printed with your company branding, structured fields for job details, and sequential numbering.",
      shortDescription: "Custom job card pads with branding",
      basePrice: 2500, stock: 300, isCustomizable: true, minOrderQty: 5,
      tags: [],
      tiers: [{ minQty: 5, maxQty: 19, price: 2500 }, { minQty: 20, maxQty: null, price: 2000 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Company Details", type: "text", required: true },
      ],
    };
  }

  // ─── Textiles ──────────────────────────────────────
  if (categorySlug === "textile") {
    if (key.includes("tshirt") || key === "berealthirt" || key === "berealtshirt") return {
      description: "Premium cotton custom-branded t-shirts available in all sizes (S-3XL). Full-color screen printing, DTF transfer, or embroidery of your logo. Ring-spun cotton for superior comfort and durability.",
      shortDescription: "Premium cotton t-shirt with custom branding",
      basePrice: 1200, compareAtPrice: 1800, stock: 2000, isFeatured: true, isCustomizable: true, minOrderQty: 10,
      tags: ["on-sale", "featured"],
      tiers: [{ minQty: 10, maxQty: 49, price: 1200 }, { minQty: 50, maxQty: 199, price: 950 }, { minQty: 200, maxQty: null, price: 750 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["S","M","L","XL","2XL","3XL"]', required: true },
        { name: "Color", type: "select", options: '["White","Black","Navy","Red","Grey","Green","Yellow"]', required: true },
        { name: "Print Location", type: "select", options: '["Front","Back","Both Sides","Left Chest"]', required: true },
      ],
    };
    if (key.includes("cap")) return {
      description: "Structured 6-panel baseball caps with custom embroidered or printed logos. Adjustable buckle strap for perfect fit. Available in cotton twill and polyester. Great for outdoor events and corporate branding.",
      shortDescription: "Custom branded baseball cap with embroidery",
      basePrice: 900, stock: 1500, isCustomizable: true, minOrderQty: 20,
      tags: ["featured"],
      tiers: [{ minQty: 20, maxQty: 99, price: 900 }, { minQty: 100, maxQty: 499, price: 700 }, { minQty: 500, maxQty: null, price: 550 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","White","Navy","Red","Khaki","Grey"]', required: true },
      ],
    };
    if (key.includes("hoodie")) return {
      description: "Premium fleece-lined hoodies with screen-printed or embroidered logos. 80/20 cotton-polyester blend for warmth and durability. Kangaroo pocket and drawstring hood. Available in multiple colors and sizes S-3XL.",
      shortDescription: "Premium hoodie with custom branding",
      basePrice: 3800, compareAtPrice: 4500, stock: 500, isCustomizable: true, minOrderQty: 5,
      tags: ["on-sale"],
      tiers: [{ minQty: 5, maxQty: 24, price: 3800 }, { minQty: 25, maxQty: 99, price: 3200 }, { minQty: 100, maxQty: null, price: 2800 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["S","M","L","XL","2XL","3XL"]', required: true },
        { name: "Color", type: "select", options: '["Black","Grey","Navy","Maroon","Forest Green"]', required: true },
      ],
    };
    if (key.includes("polo")) return {
      description: "High-quality polo shirts with custom embroidered or printed logo. Cotton-polyester blend for comfort and durability. Reinforced collar, 3-button placket. Ideal for corporate uniforms and events.",
      shortDescription: "Polo shirt with custom embroidered logo",
      basePrice: 2500, stock: 800, isCustomizable: true, minOrderQty: 10,
      tags: ["new-arrival"],
      tiers: [{ minQty: 10, maxQty: 49, price: 2500 }, { minQty: 50, maxQty: 199, price: 2100 }, { minQty: 200, maxQty: null, price: 1800 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["S","M","L","XL","2XL"]', required: true },
        { name: "Color", type: "select", options: '["White","Black","Navy","Royal Blue","Red"]', required: true },
      ],
    };
    if (key.includes("officebranding")) return {
      description: "Complete office branding merchandise package including branded workwear, aprons, and uniforms. Custom printed or embroidered with your company logo. Coordinated look for your team.",
      shortDescription: "Custom office branding merchandise package",
      basePrice: 5000, stock: 200, isCustomizable: true, isFeatured: true, minOrderQty: 5,
      tags: ["featured"],
      tiers: [{ minQty: 5, maxQty: 19, price: 5000 }, { minQty: 20, maxQty: 49, price: 4200 }, { minQty: 50, maxQty: null, price: 3500 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Sizes Needed", type: "text", required: true },
      ],
    };
  }

  // ─── Corporate Gifts ───────────────────────────────
  if (categorySlug === "corporate-gifts") {
    if (key.includes("portfoliofolder") || key.includes("executiveportfolio")) return {
      description: "Premium A4 executive portfolio folder in faux leather with multiple compartments, card slots, pen loop, and notepad. Custom debossed or hot-stamped logo. Perfect for conferences and corporate gifting.",
      shortDescription: "A4 executive portfolio folder with custom branding",
      basePrice: 3500, compareAtPrice: 4500, stock: 300, isFeatured: true, isCustomizable: true, minOrderQty: 5,
      tags: ["featured", "on-sale"],
      tiers: [{ minQty: 5, maxQty: 24, price: 3500 }, { minQty: 25, maxQty: 99, price: 3000 }, { minQty: 100, maxQty: null, price: 2500 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy","Burgundy"]', required: true },
      ],
    };
    if (key.includes("diary") || key.includes("diaries")) return {
      description: "B5 executive 2026 diary with premium PU leather cover, daily/weekly planner layouts, ribbon bookmark, and pen loop. Custom debossed, UV printed, or foil-stamped logo on cover.",
      shortDescription: "B5 executive 2026 diary with custom branding",
      basePrice: 2800, compareAtPrice: 3500, stock: 400, isFeatured: true, isCustomizable: true, minOrderQty: 10,
      tags: ["featured", "new-arrival"],
      tiers: [{ minQty: 10, maxQty: 49, price: 2800 }, { minQty: 50, maxQty: 199, price: 2300 }, { minQty: 200, maxQty: null, price: 1900 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy","Burgundy","Red"]', required: true },
      ],
    };
    if (key.includes("notebookwithapengiftset") || key.includes("executivenotebookwithapen")) return {
      description: "B5 executive notebook paired with a branded pen in a premium gift box. PU leather cover with ribbon bookmark, 200 lined pages, and elastic closure. Custom logo on notebook and pen.",
      shortDescription: "B5 notebook & pen gift set with custom branding",
      basePrice: 2200, stock: 500, isFeatured: true, isCustomizable: true, minOrderQty: 10,
      tags: ["featured"],
      tiers: [{ minQty: 10, maxQty: 49, price: 2200 }, { minQty: 50, maxQty: 199, price: 1800 }, { minQty: 200, maxQty: null, price: 1500 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy","Burgundy"]', required: true },
      ],
    };
    if (key.includes("ballpen") && key.includes("stylus")) return {
      description: "Dual-function ballpoint pens with a touchscreen stylus tip. Smooth-writing ink with branded barrel. Elegant metallic finish. Ideal for tech-savvy corporate gifts and conference giveaways.",
      shortDescription: "Branded ballpoint pens with touchscreen stylus",
      basePrice: 350, stock: 2000, isCustomizable: true, minOrderQty: 50,
      tags: ["new-arrival"],
      tiers: [{ minQty: 50, maxQty: 199, price: 350 }, { minQty: 200, maxQty: 499, price: 280 }, { minQty: 500, maxQty: null, price: 220 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Silver","Blue","Red","Gold"]', required: true },
      ],
    };
    if (key.includes("briefcase") || key.includes("giftbox")) return {
      description: "Premium briefcase-style gift boxes with magnetic closure. Ideal for assembling corporate gift sets. Available in various sizes with optional foam inserts. Customizable with logo and brand colors.",
      shortDescription: "Premium briefcase gift boxes with custom branding",
      basePrice: 1800, stock: 400, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 1800 }, { minQty: 50, maxQty: 199, price: 1500 }, { minQty: 200, maxQty: null, price: 1200 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["Small","Medium","Large"]', required: true },
      ],
    };
    if (key.includes("crystalaward") || key.includes("crescentwoodcrystal")) return {
      description: "Elegant Crescent wood and crystal combination award trophy. Laser-engraved with recipient name, event, and organization logo. Premium gift box included. Perfect for corporate awards ceremonies.",
      shortDescription: "Crescent wood & crystal award with laser engraving",
      basePrice: 5500, compareAtPrice: 7000, stock: 100, isFeatured: true, isCustomizable: true, minOrderQty: 1,
      tags: ["featured", "on-sale"],
      tiers: [{ minQty: 1, maxQty: 9, price: 5500 }, { minQty: 10, maxQty: 49, price: 4800 }, { minQty: 50, maxQty: null, price: 4200 }],
      customizations: [
        { name: "Engraving Text", type: "text", required: true },
        { name: "Logo Upload", type: "file", required: false },
      ],
    };
    if (key.includes("canvasbag") || key.includes("executiveacanvas")) return {
      description: "Executive A3 canvas tote bag with reinforced handles and inner pocket. Ideal for conferences, trade shows, and premium giveaways. Custom screen-printed or heat-transferred logo.",
      shortDescription: "Executive A3 canvas bag with custom branding",
      basePrice: 1200, stock: 600, isCustomizable: true, minOrderQty: 20,
      tags: [],
      tiers: [{ minQty: 20, maxQty: 99, price: 1200 }, { minQty: 100, maxQty: 499, price: 950 }, { minQty: 500, maxQty: null, price: 750 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Natural","Black","Navy"]', required: true },
      ],
    };
    if (key.includes("penholder") || key.includes("executivepenholder")) return {
      description: "Executive desk pen holder crafted from premium materials. Features single or double pen slots with custom engraved logo. A refined desktop accessory for corporate offices and executive gifts.",
      shortDescription: "Executive desk pen holder with engraving",
      basePrice: 1500, stock: 300, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 1500 }, { minQty: 50, maxQty: 199, price: 1200 }, { minQty: 200, maxQty: null, price: 950 }],
      customizations: [
        { name: "Engraving Text", type: "text", required: true },
        { name: "Logo Upload", type: "file", required: false },
      ],
    };
    if (key.includes("giftsetwithflask") || key.includes("giftssetfour")) return {
      description: "Premium corporate gift set including a thermal flask, executive pen, and hardcover notebook in a luxurious presentation box. All items can be custom branded with your logo. Perfect for VIP clients.",
      shortDescription: "Flask, pen & notebook corporate gift set",
      basePrice: 4500, compareAtPrice: 5500, stock: 200, isFeatured: true, isCustomizable: true, minOrderQty: 5,
      tags: ["featured", "on-sale"],
      tiers: [{ minQty: 5, maxQty: 24, price: 4500 }, { minQty: 25, maxQty: 99, price: 3800 }, { minQty: 100, maxQty: null, price: 3200 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy"]', required: true },
      ],
    };
    if (key.includes("hipflask") || key.includes("chessset")) return {
      description: "Premium hip flask and chess set combo in a wooden gift box. Stainless steel hip flask with leather wrap and laser engraving. Magnetic travel chess set included. Ultimate executive gift.",
      shortDescription: "Hip flask & chess set in wooden gift box",
      basePrice: 6000, stock: 100, isCustomizable: true, minOrderQty: 1,
      tags: ["new-arrival"],
      tiers: [{ minQty: 1, maxQty: 9, price: 6000 }, { minQty: 10, maxQty: 49, price: 5200 }, { minQty: 50, maxQty: null, price: 4500 }],
      customizations: [
        { name: "Engraving Text", type: "text", required: true },
        { name: "Logo Upload", type: "file", required: false },
      ],
    };
    if (key.includes("sportsmedal")) return {
      description: "Custom sports medals in gold, silver, and bronze finishes. Die-cast zinc alloy with full-color printed or engraved design. Includes ribbon in your choice of color. Perfect for tournaments and corporate sports days.",
      shortDescription: "Custom die-cast sports medals with ribbon",
      basePrice: 800, stock: 1000, isCustomizable: true, minOrderQty: 20,
      tags: [],
      tiers: [{ minQty: 20, maxQty: 99, price: 800 }, { minQty: 100, maxQty: 499, price: 650 }, { minQty: 500, maxQty: null, price: 500 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Finish", type: "select", options: '["Gold","Silver","Bronze"]', required: true },
        { name: "Ribbon Color", type: "select", options: '["Red","Blue","Green","Black","Custom"]', required: true },
      ],
    };
    if (key.includes("winecarrier") || key.includes("jutebag")) return {
      description: "Slim wine carrier jute bags with reinforced handles. Fits standard wine bottles. Eco-friendly and reusable. Custom screen-printed branding. Perfect for corporate wine gifts and events.",
      shortDescription: "Slim jute wine carrier bags with custom branding",
      basePrice: 450, stock: 1000, isCustomizable: true, minOrderQty: 25,
      tags: [],
      tiers: [{ minQty: 25, maxQty: 99, price: 450 }, { minQty: 100, maxQty: 499, price: 350 }, { minQty: 500, maxQty: null, price: 280 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    };
  }

  // ─── Office Stationery ─────────────────────────────
  if (categorySlug === "office-stationery") {
    if (key.includes("diary") || key.includes("a5diary")) return {
      description: "A5 desk diary with premium PU leather cover. Available in daily and weekly planning layouts. Ribbon bookmark, pen loop, and elastic band closure. Custom logo debossing or hot stamping on cover.",
      shortDescription: "A5 desk diary with custom logo debossing",
      basePrice: 1800, compareAtPrice: 2500, stock: 400, isCustomizable: true, minOrderQty: 10,
      tags: ["on-sale"],
      tiers: [{ minQty: 10, maxQty: 49, price: 1800 }, { minQty: 50, maxQty: 199, price: 1500 }, { minQty: 200, maxQty: null, price: 1200 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy","Burgundy","Green"]', required: true },
      ],
    };
    if (key.includes("roundbuckle")) return {
      description: "A5 round buckle 2026 diary with premium PU leather cover and distinctive round metal buckle closure. Lined pages, ribbon bookmark, and pen loop. Custom logo debossing available.",
      shortDescription: "A5 round buckle diary with leather cover",
      basePrice: 2000, stock: 300, isCustomizable: true, minOrderQty: 10,
      tags: ["new-arrival"],
      tiers: [{ minQty: 10, maxQty: 49, price: 2000 }, { minQty: 50, maxQty: 199, price: 1700 }, { minQty: 200, maxQty: null, price: 1400 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy","Red"]', required: true },
      ],
    };
    if (key.includes("leatherflapnotebook")) return {
      description: "A5 leather flap notebooks with magnetic snap closure. Premium PU leather cover with inner pockets and pen loop. 200 lined pages on 80gsm paper. Custom logo embossing on front flap.",
      shortDescription: "A5 leather flap notebook with magnetic closure",
      basePrice: 1500, stock: 500, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 1500 }, { minQty: 50, maxQty: 199, price: 1200 }, { minQty: 200, maxQty: null, price: 950 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy","Red","Green"]', required: true },
      ],
    };
    if (key.includes("bic")) return {
      description: "Classic BIC ballpoint pens with custom printed branding. Reliable, smooth-writing, and affordable. Available in multiple ink colors. Perfect for bulk giveaways and office use.",
      shortDescription: "BIC branded ballpoint pens",
      basePrice: 120, stock: 5000, isCustomizable: true, minOrderQty: 100,
      tags: [],
      tiers: [{ minQty: 100, maxQty: 499, price: 120 }, { minQty: 500, maxQty: 999, price: 95 }, { minQty: 1000, maxQty: null, price: 75 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Ink Color", type: "select", options: '["Blue","Black","Red"]', required: true },
      ],
    };
    if (key.includes("bicsharp")) return {
      description: "BIC mechanical pencils with custom branded barrel. 0.5mm or 0.7mm lead options. Ergonomic grip and built-in eraser. Professional quality for offices, schools, and promotional use.",
      shortDescription: "BIC mechanical pencils with custom branding",
      basePrice: 150, stock: 3000, isCustomizable: true, minOrderQty: 100,
      tags: [],
      tiers: [{ minQty: 100, maxQty: 499, price: 150 }, { minQty: 500, maxQty: 999, price: 120 }, { minQty: 1000, maxQty: null, price: 90 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Lead Size", type: "select", options: '["0.5mm","0.7mm"]', required: true },
      ],
    };
    if (key.includes("collapsiblebackdrop")) return {
      description: "Portable collapsible backdrop stand with custom-printed fabric banner. Easy pop-up assembly in seconds. Includes carry bag for transport. Ideal for photo booths, trade shows, and media events.",
      shortDescription: "Collapsible backdrop stand with custom print",
      basePrice: 15000, stock: 50, isCustomizable: true, isFeatured: true, minOrderQty: 1,
      tags: ["featured"],
      tiers: [{ minQty: 1, maxQty: 4, price: 15000 }, { minQty: 5, maxQty: 19, price: 13000 }, { minQty: 20, maxQty: null, price: 11000 }],
      customizations: [
        { name: "Artwork Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["2m x 2m","2.4m x 2.4m","3m x 2.4m"]', required: true },
      ],
    };
    if (key.includes("executivenotebook")) return {
      description: "Premium executive A5 notebook with PU leather cover, 240 lined pages on 100gsm paper. Features ribbon bookmark, elastic band, and expandable inner pocket. Custom debossed logo.",
      shortDescription: "Executive A5 leather notebook",
      basePrice: 1200, stock: 600, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 1200 }, { minQty: 50, maxQty: 199, price: 950 }, { minQty: 200, maxQty: null, price: 780 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy"]', required: true },
      ],
    };
    if (key.includes("keyholder")) return {
      description: "Premium metal and leather keyholders with custom laser engraving. Sturdy ring mechanism with split rings for multiple keys. Elegant packaging included. Great corporate giveaway item.",
      shortDescription: "Metal & leather keyholder with laser engraving",
      basePrice: 500, stock: 1000, isCustomizable: true, minOrderQty: 20,
      tags: [],
      tiers: [{ minQty: 20, maxQty: 99, price: 500 }, { minQty: 100, maxQty: 499, price: 380 }, { minQty: 500, maxQty: null, price: 300 }],
      customizations: [
        { name: "Engraving Text", type: "text", required: true },
        { name: "Logo Upload", type: "file", required: false },
      ],
    };
    if (key.includes("cardholder") || key.includes("landscapesliding")) return {
      description: "Landscape sliding card holders in premium plastic. Features horizontal orientation with slide-in design. Custom printed insert with employee name, photo, title, and company logo.",
      shortDescription: "Landscape sliding staff card holders",
      basePrice: 200, stock: 2000, isCustomizable: true, minOrderQty: 50,
      tags: [],
      tiers: [{ minQty: 50, maxQty: 199, price: 200 }, { minQty: 200, maxQty: 499, price: 160 }, { minQty: 500, maxQty: null, price: 120 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Employee Details", type: "text", required: false },
      ],
    };
    if (key.includes("lanyard")) return {
      description: "Branded polyester lanyards with your company logo. Full-color sublimation printing on 20mm or 25mm width. Includes safety breakaway and choice of attachment: J-hook, bulldog clip, or ID holder.",
      shortDescription: "Custom branded polyester lanyards",
      basePrice: 150, stock: 3000, isCustomizable: true, minOrderQty: 50,
      tags: ["new-arrival"],
      tiers: [{ minQty: 50, maxQty: 199, price: 150 }, { minQty: 200, maxQty: 499, price: 120 }, { minQty: 500, maxQty: null, price: 85 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Width", type: "select", options: '["15mm","20mm","25mm"]', required: true },
        { name: "Attachment", type: "select", options: '["J-Hook","Bulldog Clip","ID Card Holder"]', required: true },
      ],
    };
    if (key.includes("plasticdottedpen")) return {
      description: "Colorful plastic ballpoint pens with dotted grip pattern. Lightweight and comfortable for extended writing. Custom pad-printed logo on barrel. Budget-friendly bulk giveaway pen.",
      shortDescription: "Dotted grip plastic pen with custom printing",
      basePrice: 80, stock: 5000, isCustomizable: true, minOrderQty: 200,
      tags: [],
      tiers: [{ minQty: 200, maxQty: 499, price: 80 }, { minQty: 500, maxQty: 999, price: 60 }, { minQty: 1000, maxQty: null, price: 45 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Blue","Red","Green","Black","Orange"]', required: true },
      ],
    };
    if (key.includes("plastickeyhold")) return {
      description: "Durable plastic keyholders with custom full-color printing. Available in various shapes and colors. Lightweight and affordable. Ideal for mass promotional events and brand visibility.",
      shortDescription: "Custom printed plastic keyholders",
      basePrice: 100, stock: 5000, isCustomizable: true, minOrderQty: 100,
      tags: [],
      tiers: [{ minQty: 100, maxQty: 499, price: 100 }, { minQty: 500, maxQty: 999, price: 75 }, { minQty: 1000, maxQty: null, price: 55 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    };
    if (key.includes("presspen")) return {
      description: "Click-action retractable ballpoint pens with custom branding. Comfortable rubberized grip. Available in multiple barrel colors. Reliable ink quality. Perfect for everyday office use and giveaways.",
      shortDescription: "Click-action branded ballpoint pen",
      basePrice: 100, stock: 5000, isCustomizable: true, minOrderQty: 100,
      tags: [],
      tiers: [{ minQty: 100, maxQty: 499, price: 100 }, { minQty: 500, maxQty: 999, price: 80 }, { minQty: 1000, maxQty: null, price: 60 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Blue","Black","Red","Green","White"]', required: true },
      ],
    };
    if (key.includes("retractable")) return {
      description: "Retractable badge reels with custom printed logo. Heavy-duty spring mechanism with 60cm retractable cord. Includes belt clip and ID strap. Essential for staff identification in offices and events.",
      shortDescription: "Retractable badge reel with custom branding",
      basePrice: 250, stock: 2000, isCustomizable: true, minOrderQty: 50,
      tags: [],
      tiers: [{ minQty: 50, maxQty: 199, price: 250 }, { minQty: 200, maxQty: 499, price: 200 }, { minQty: 500, maxQty: null, price: 150 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    };
    if (key.includes("rollupbanner") || key.includes("roll_up")) return {
      description: "Premium roll-up banner stands with custom full-color printed graphic. Aluminum retractable mechanism with carrying bag. Quick setup for trade shows, events, and office branding.",
      shortDescription: "Roll-up banner stand with custom graphic",
      basePrice: 6500, stock: 100, isCustomizable: true, isFeatured: true, minOrderQty: 1,
      tags: ["featured"],
      tiers: [{ minQty: 1, maxQty: 4, price: 6500 }, { minQty: 5, maxQty: 19, price: 5500 }, { minQty: 20, maxQty: null, price: 4800 }],
      customizations: [
        { name: "Artwork Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["80cm x 200cm","85cm x 200cm","100cm x 200cm","120cm x 200cm"]', required: true },
      ],
    };
    if (key.includes("staffid")) return {
      description: "Professional PVC staff ID cards with full-color printing on both sides. Features employee photo, name, title, department, and barcode/QR code. Available with or without lanyards.",
      shortDescription: "PVC staff ID cards with full-color printing",
      basePrice: 300, stock: 2000, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 300 }, { minQty: 50, maxQty: 199, price: 250 }, { minQty: 200, maxQty: null, price: 180 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Employee Details", type: "text", required: true },
        { name: "Card Type", type: "select", options: '["PVC Card","PVC + Lanyard","PVC + Retractable Reel"]', required: true },
      ],
    };
    if (key.includes("tablewritting") || key.includes("tablewriting")) return {
      description: "Elegant table writing pens with weighted base and chain. Non-removable design for reception desks, banks, and customer service counters. Smooth-writing ballpoint with replaceable refill.",
      shortDescription: "Table writing pen with weighted base",
      basePrice: 800, stock: 500, isCustomizable: true, minOrderQty: 5,
      tags: [],
      tiers: [{ minQty: 5, maxQty: 24, price: 800 }, { minQty: 25, maxQty: null, price: 650 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    };
    if (key.includes("twistpen")) return {
      description: "Elegant twist-action ballpoint pens with metallic barrel. Smooth twist mechanism with branded clip. Available in chrome, gold, and matte finishes. Premium corporate gift pen.",
      shortDescription: "Twist-action metallic ballpoint pen",
      basePrice: 350, stock: 2000, isCustomizable: true, minOrderQty: 25,
      tags: [],
      tiers: [{ minQty: 25, maxQty: 99, price: 350 }, { minQty: 100, maxQty: 499, price: 280 }, { minQty: 500, maxQty: null, price: 220 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Finish", type: "select", options: '["Chrome","Gold","Matte Black","Matte Navy"]', required: true },
      ],
    };
    if (key.includes("mousepad") || key.includes("whiterectangularmousepad")) return {
      description: "Custom printed rectangular mousepads with non-slip rubber base. Full-color dye-sublimation printing on smooth fabric surface. Standard 250x210mm or extended sizes available.",
      shortDescription: "Custom printed mousepad with non-slip base",
      basePrice: 500, stock: 1000, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 500 }, { minQty: 50, maxQty: 199, price: 400 }, { minQty: 200, maxQty: null, price: 300 }],
      customizations: [
        { name: "Design Upload", type: "file", required: true },
      ],
    };
    if (key.includes("whitepen")) return {
      description: "Clean white plastic pens with custom printed logo. Minimalist design with reliable ink. Budget-friendly option for bulk marketing giveaways and events.",
      shortDescription: "White branded plastic pens for bulk giveaways",
      basePrice: 70, stock: 10000, isCustomizable: true, minOrderQty: 200,
      tags: [],
      tiers: [{ minQty: 200, maxQty: 499, price: 70 }, { minQty: 500, maxQty: 999, price: 55 }, { minQty: 1000, maxQty: null, price: 40 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    };
  }

  // ─── Home Items ────────────────────────────────────
  if (categorySlug === "home-items") {
    if (key.includes("jutebag") || key.includes("plainjute")) return {
      description: "Eco-friendly B5 plain jute bags with cotton rope handles. Durable, reusable, and sustainable. Custom screen-printed logo. Perfect for retail packaging, gifting, and shopping bags.",
      shortDescription: "B5 eco-friendly jute bags with custom branding",
      basePrice: 350, stock: 1000, isCustomizable: true, minOrderQty: 50,
      tags: [],
      tiers: [{ minQty: 50, maxQty: 199, price: 350 }, { minQty: 200, maxQty: 499, price: 280 }, { minQty: 500, maxQty: null, price: 220 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    };
    if (key.includes("coaster") || key.includes("coffeecoaster")) return {
      description: "Custom branded coffee coasters in premium materials. Available in cork, leather, MDF, and acrylic. Full-color printing or laser engraving. Perfect for offices, restaurants, and corporate gifts.",
      shortDescription: "Custom branded coffee coasters",
      basePrice: 300, stock: 2000, isCustomizable: true, minOrderQty: 20,
      tags: ["new-arrival"],
      tiers: [{ minQty: 20, maxQty: 99, price: 300 }, { minQty: 100, maxQty: 499, price: 220 }, { minQty: 500, maxQty: null, price: 160 }],
      customizations: [
        { name: "Design Upload", type: "file", required: true },
        { name: "Material", type: "select", options: '["Cork","Leather","MDF","Acrylic"]', required: true },
      ],
    };
    if (key.includes("rotatingkeyholder") || key.includes("crescentblackrotating")) return {
      description: "Crescent design rotating keyholder in premium black metal. 360-degree rotation mechanism with multiple key rings. Custom laser-engraved logo. Elegant desktop or wall-mounted accessory.",
      shortDescription: "Crescent rotating metal keyholder",
      basePrice: 650, stock: 500, isCustomizable: true, minOrderQty: 10,
      tags: [],
      tiers: [{ minQty: 10, maxQty: 49, price: 650 }, { minQty: 50, maxQty: 199, price: 520 }, { minQty: 200, maxQty: null, price: 420 }],
      customizations: [
        { name: "Engraving Text", type: "text", required: true },
        { name: "Logo Upload", type: "file", required: false },
      ],
    };
    if (key.includes("wallclock") || key.includes("decowallclock")) return {
      description: "Custom branded deco wall clock with your company logo. High-quality quartz movement. Available in round and square shapes. Full-color dial printing. Great for offices and corporate gifts.",
      shortDescription: "Custom branded wall clock with logo",
      basePrice: 2500, stock: 200, isCustomizable: true, isFeatured: true, minOrderQty: 5,
      tags: ["featured"],
      tiers: [{ minQty: 5, maxQty: 19, price: 2500 }, { minQty: 20, maxQty: 49, price: 2100 }, { minQty: 50, maxQty: null, price: 1800 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Shape", type: "select", options: '["Round","Square"]', required: true },
      ],
    };
    if (key.includes("doublesidedkeyholder")) return {
      description: "Premium double-sided metal keyholder with custom printing or engraving on both faces. Chrome plated with split ring. Ideal for branding with different designs on each side.",
      shortDescription: "Double-sided custom branded metal keyholder",
      basePrice: 400, stock: 1000, isCustomizable: true, minOrderQty: 25,
      tags: [],
      tiers: [{ minQty: 25, maxQty: 99, price: 400 }, { minQty: 100, maxQty: 499, price: 320 }, { minQty: 500, maxQty: null, price: 250 }],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    };
    if (key.includes("fridgemagnet")) return {
      description: "Custom fridge magnets with full-color printing. Available in standard shapes (circle, square, rectangle) and custom die-cut shapes. Made from flexible magnetic material with glossy surface.",
      shortDescription: "Custom printed fridge magnets",
      basePrice: 150, stock: 3000, isCustomizable: true, minOrderQty: 50,
      tags: [],
      tiers: [{ minQty: 50, maxQty: 199, price: 150 }, { minQty: 200, maxQty: 499, price: 110 }, { minQty: 500, maxQty: null, price: 80 }],
      customizations: [
        { name: "Design Upload", type: "file", required: true },
        { name: "Shape", type: "select", options: '["Circle","Square","Rectangle","Custom Die-Cut"]', required: true },
      ],
    };
    if (key.includes("magicmug")) return {
      description: "Heat-sensitive magic mugs that reveal your custom design when filled with hot liquid. 11oz black ceramic mug with full-color sublimation image hidden until heated. Amazing corporate gift idea.",
      shortDescription: "Heat-reveal magic mug with custom design",
      basePrice: 850, stock: 500, isCustomizable: true, isFeatured: true, minOrderQty: 6,
      tags: ["featured", "new-arrival"],
      tiers: [{ minQty: 6, maxQty: 24, price: 850 }, { minQty: 25, maxQty: 99, price: 700 }, { minQty: 100, maxQty: null, price: 550 }],
      customizations: [
        { name: "Design Upload", type: "file", required: true },
      ],
    };
    if (key.includes("shieldfridge")) return {
      description: "Shield-shaped fridge magnets with custom full-color printing. Premium quality with glossy finish. Great for brand awareness gifts, sports clubs, and commemorative items.",
      shortDescription: "Shield-shaped custom fridge magnets",
      basePrice: 200, stock: 2000, isCustomizable: true, minOrderQty: 50,
      tags: [],
      tiers: [{ minQty: 50, maxQty: 199, price: 200 }, { minQty: 200, maxQty: 499, price: 150 }, { minQty: 500, maxQty: null, price: 100 }],
      customizations: [
        { name: "Design Upload", type: "file", required: true },
      ],
    };
    if (key.includes("wallhanging")) return {
      description: "Custom printed wall hangings on canvas or fabric. Full-color printing with vibrant, fade-resistant inks. Available in multiple sizes. Wooden hanging rod and cord included. Perfect for décor and branding.",
      shortDescription: "Custom printed canvas wall hangings",
      basePrice: 3500, stock: 200, isCustomizable: true, minOrderQty: 5,
      tags: [],
      tiers: [{ minQty: 5, maxQty: 19, price: 3500 }, { minQty: 20, maxQty: 49, price: 2800 }, { minQty: 50, maxQty: null, price: 2300 }],
      customizations: [
        { name: "Artwork Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["30x40cm","50x70cm","60x90cm","Custom"]', required: true },
      ],
    };
  }

  // ─── Events ────────────────────────────────────────
  if (categorySlug === "events") {
    if (key.includes("corporateevent")) return {
      description: "Full corporate event branding package including stage backdrop, pull-up banners, table runners, name badges, and branded stationery. Custom designed to match your event theme and brand colors.",
      shortDescription: "Complete corporate event branding package",
      basePrice: 35000, stock: 50, isCustomizable: true, isFeatured: true, minOrderQty: 1,
      tags: ["featured"],
      tiers: [{ minQty: 1, maxQty: 4, price: 35000 }, { minQty: 5, maxQty: null, price: 30000 }],
      customizations: [
        { name: "Brand Assets Upload", type: "file", required: true },
        { name: "Event Details", type: "text", required: true },
      ],
    };
    if (key.includes("eventidcard") || key.includes("eventcard")) return {
      description: "Custom event ID cards and badges with full-color printing. Includes attendee name, photo, QR code, and event branding. Available in PVC, paper, or eco-friendly card stock. Lanyards available separately.",
      shortDescription: "Custom event ID badges with full-color printing",
      basePrice: 250, stock: 5000, isCustomizable: true, minOrderQty: 20,
      tags: [],
      tiers: [{ minQty: 20, maxQty: 99, price: 250 }, { minQty: 100, maxQty: 499, price: 180 }, { minQty: 500, maxQty: null, price: 120 }],
      customizations: [
        { name: "Event Logo Upload", type: "file", required: true },
        { name: "Card Material", type: "select", options: '["PVC","Paper Card","Eco-Friendly"]', required: true },
      ],
    };
    if (key.includes("eventflier") || key.includes("eventposter")) return {
      description: "Professional event flyers and posters with eye-catching designs. Full-color digital printing on premium paper. Available in A3, A4, A5, and custom sizes. Fast turnaround for urgent events.",
      shortDescription: "Custom event flyers and posters",
      basePrice: 4000, stock: 300, isCustomizable: true, minOrderQty: 50,
      tags: ["new-arrival"],
      tiers: [{ minQty: 50, maxQty: 199, price: 4000 }, { minQty: 200, maxQty: 499, price: 3200 }, { minQty: 500, maxQty: null, price: 2500 }],
      customizations: [
        { name: "Event Details Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["A3","A4","A5","Custom"]', required: true },
      ],
    };
    if (key.includes("weddingcard")) return {
      description: "Elegant custom wedding invitation cards with premium printing finishes. Available in matte, glossy, metallic foil, embossed, and letterpress options. Matching RSVP cards and envelopes available.",
      shortDescription: "Custom wedding invitation cards with premium finishes",
      basePrice: 150, stock: 2000, isCustomizable: true, minOrderQty: 50,
      tags: ["new-arrival"],
      tiers: [{ minQty: 50, maxQty: 149, price: 150 }, { minQty: 150, maxQty: 299, price: 120 }, { minQty: 300, maxQty: null, price: 90 }],
      customizations: [
        { name: "Design Upload", type: "file", required: false },
        { name: "Couple Names", type: "text", required: true },
        { name: "Finish", type: "select", options: '["Matte","Glossy","Metallic Foil","Embossed","Letterpress"]', required: true },
      ],
    };
  }

  // ─── Signage ───────────────────────────────────────
  if (categorySlug === "signage") {
    if (key.includes("featherbanner")) return {
      description: "Custom feather flag banners with full-color dye-sublimation printing. Includes aluminum pole, ground spike, and cross base. Single or double-sided printing. Great for outdoor marketing and events.",
      shortDescription: "Custom feather flag banners with hardware",
      basePrice: 8500, stock: 100, isCustomizable: true, isFeatured: true, minOrderQty: 1,
      tags: ["featured"],
      tiers: [{ minQty: 1, maxQty: 4, price: 8500 }, { minQty: 5, maxQty: 19, price: 7200 }, { minQty: 20, maxQty: null, price: 6000 }],
      customizations: [
        { name: "Artwork Upload", type: "file", required: true },
        { name: "Height", type: "select", options: '["2.8m","3.4m","4.5m","5.5m"]', required: true },
        { name: "Sides", type: "select", options: '["Single","Double"]', required: true },
      ],
    };
    if (key.includes("largeformat")) return {
      description: "Large format digital printing on vinyl, canvas, fabric, and rigid substrates. High-resolution 1440dpi output with UV-resistant inks. Perfect for billboards, wall wraps, window graphics, and exhibition displays.",
      shortDescription: "Large format digital printing (vinyl, canvas, fabric)",
      basePrice: 2500, stock: 200, isCustomizable: true, minOrderQty: 1,
      tags: [],
      tiers: [{ minQty: 1, maxQty: 9, price: 2500 }, { minQty: 10, maxQty: 49, price: 2000 }, { minQty: 50, maxQty: null, price: 1600 }],
      customizations: [
        { name: "Artwork Upload", type: "file", required: true },
        { name: "Material", type: "select", options: '["Vinyl","Canvas","Fabric","Foam Board","Acrylic"]', required: true },
        { name: "Size (sqm)", type: "text", required: true },
      ],
    };
    if (key.includes("popup") || key.includes("popupbanner")) return {
      description: "Portable pop-up display banners with custom graphic panels. Magnetic frame with full-color printed fabric graphic. Includes LED lights and carry case. Ideal for exhibitions and trade shows.",
      shortDescription: "Pop-up display banners with carry case",
      basePrice: 25000, stock: 30, isCustomizable: true, isFeatured: true, minOrderQty: 1,
      tags: ["featured"],
      tiers: [{ minQty: 1, maxQty: 2, price: 25000 }, { minQty: 3, maxQty: null, price: 22000 }],
      customizations: [
        { name: "Artwork Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["3x3 (Straight)","3x3 (Curved)","4x3","5x3"]', required: true },
      ],
    };
    if (key.includes("teardrop")) return {
      description: "Eye-catching teardrop flag banners with full-color dye-sublimation printing. Includes aluminum pole, ground spike, and water base. Rotates 360° in the wind for maximum visibility.",
      shortDescription: "Teardrop flag banners with base and pole",
      basePrice: 7500, stock: 100, isCustomizable: true, minOrderQty: 1,
      tags: [],
      tiers: [{ minQty: 1, maxQty: 4, price: 7500 }, { minQty: 5, maxQty: 19, price: 6500 }, { minQty: 20, maxQty: null, price: 5500 }],
      customizations: [
        { name: "Artwork Upload", type: "file", required: true },
        { name: "Height", type: "select", options: '["2.3m","3.0m","4.0m","5.0m"]', required: true },
      ],
    };
  }

  // ─── Personal Gifts (general folder) ─────────────────
  // ─── Branding ──────────────────────────────────────
  // ─── Sports ────────────────────────────────────────

  // ─── Fallback for unmatched products ───────────────
  return {
    description: `High-quality ${formatProductName(baseName)} with custom branding options. Professional finish with your company logo and design. Available in multiple colors and configurations. Ideal for corporate gifts, promotional giveaways, and brand merchandising.`,
    shortDescription: `Custom branded ${formatProductName(baseName).toLowerCase()}`,
    basePrice: 1500,
    stock: 300,
    isCustomizable: true,
    minOrderQty: 10,
    tags: [],
    tiers: [
      { minQty: 10, maxQty: 49, price: 1500 },
      { minQty: 50, maxQty: 199, price: 1200 },
      { minQty: 200, maxQty: null, price: 950 },
    ],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
    ],
  };
}

function formatProductName(baseName: string): string {
  // Convert camelCase, snake_case, and filename conventions to readable name
  let name = baseName
    // Insert spaces before uppercase letters (camelCase)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Replace underscores with spaces
    .replace(/_/g, " ")
    // Clean up multiple spaces
    .replace(/\s+/g, " ")
    .trim();

  // Title case
  name = name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return name;
}

// ─── ADDITIONAL PRODUCT DATA for Personal Gifts folder ──────────────
function getPersonalGiftsMeta(baseName: string): ProductMeta {
  const key = baseName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (key.includes("totebag") || key.includes("widestrapjute") || key.includes("canvasbag") || key.includes("leopardprint") || key.includes("buttonjutebag") || key.includes("buttonblackjute") || key.includes("potraitjute") || key.includes("potraitwide")) return {
    description: "Stylish jute and canvas combination bags with custom branding. Eco-friendly, durable, and reusable. Available in multiple sizes with inner and outer pockets. Perfect for retail and corporate use.",
    shortDescription: "Custom branded jute & canvas bags",
    basePrice: 800, stock: 800, isCustomizable: true, minOrderQty: 20,
    tags: [],
    tiers: [{ minQty: 20, maxQty: 99, price: 800 }, { minQty: 100, maxQty: 499, price: 650 }, { minQty: 500, maxQty: null, price: 500 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
    ],
  };
  if (key.includes("notebook") || key.includes("trifoldnotebook") || key.includes("ubuckle")) return {
    description: "Premium A5 notebooks with PU leather cover. Features include U-buckle or tri-fold closure, ribbon bookmark, pen loop, and inner pockets. 200 lined pages. Custom logo embossing available.",
    shortDescription: "A5 PU leather notebook with custom branding",
    basePrice: 1200, stock: 600, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 1200 }, { minQty: 50, maxQty: 199, price: 950 }, { minQty: 200, maxQty: null, price: 780 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","Brown","Navy","Red","Green"]', required: true },
    ],
  };
  if (key.includes("leatherflapnotebook")) return {
    description: "A5 leather flap notebooks with premium magnetic closure. Soft-touch PU leather cover with inner card pocket. 200 lined pages. Custom logo embossing on front flap.",
    shortDescription: "A5 leather flap notebook with magnetic closure",
    basePrice: 1500, stock: 500, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 1500 }, { minQty: 50, maxQty: 199, price: 1200 }, { minQty: 200, maxQty: null, price: 950 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","Brown","Navy","Red"]', required: true },
    ],
  };
  if (key.includes("wristband")) return {
    description: "Custom silicone wristbands with embossed, debossed, or printed design. Available in all colors with color-fill options. Perfect for events, fundraisers, and brand awareness campaigns.",
    shortDescription: "Custom silicone wristbands with branding",
    basePrice: 80, stock: 5000, isCustomizable: true, minOrderQty: 100,
    tags: [],
    tiers: [{ minQty: 100, maxQty: 499, price: 80 }, { minQty: 500, maxQty: 999, price: 60 }, { minQty: 1000, maxQty: null, price: 40 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","White","Red","Blue","Green","Yellow","Custom"]', required: true },
    ],
  };
  if (key.includes("frostbeermug") || key.includes("frostmug")) return {
    description: "Frosted beer mugs with custom sublimation printing. Dishwasher safe with premium frosted glass finish. 500ml capacity. Perfect for bars, restaurants, and promotional gifts.",
    shortDescription: "Frosted beer mug with custom printing",
    basePrice: 900, stock: 500, isCustomizable: true, minOrderQty: 12,
    tags: [],
    tiers: [{ minQty: 12, maxQty: 49, price: 900 }, { minQty: 50, maxQty: 199, price: 750 }, { minQty: 200, maxQty: null, price: 600 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("frostwaterbottle")) return {
    description: "Frosted water bottles with custom full-color printing. BPA-free plastic with screw-top lid. Available in 500ml and 750ml sizes. Great for gyms, events, and promotional giveaways.",
    shortDescription: "Frosted water bottles with custom printing",
    basePrice: 600, stock: 1000, isCustomizable: true, minOrderQty: 25,
    tags: [],
    tiers: [{ minQty: 25, maxQty: 99, price: 600 }, { minQty: 100, maxQty: 499, price: 480 }, { minQty: 500, maxQty: null, price: 380 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Size", type: "select", options: '["500ml","750ml"]', required: true },
    ],
  };
  if (key.includes("goldmug")) return {
    description: "Premium gold-finish ceramic mugs with full-color sublimation printing. Metallic gold handle and rim with white printing area. 11oz capacity. Luxurious corporate gift option.",
    shortDescription: "Gold-finish ceramic mug with custom printing",
    basePrice: 1100, stock: 400, isCustomizable: true, minOrderQty: 12,
    tags: ["new-arrival"],
    tiers: [{ minQty: 12, maxQty: 49, price: 1100 }, { minQty: 50, maxQty: 199, price: 900 }, { minQty: 200, maxQty: null, price: 750 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("jumbothermaltumbler") || key.includes("iljumbo")) return {
    description: "IL Jumbo thermal tumblers with double-wall vacuum insulation. 600ml capacity with splash-proof lid. Custom laser-engraved or printed logo. Keeps drinks hot 8hrs or cold 16hrs.",
    shortDescription: "Jumbo thermal tumblers with custom branding",
    basePrice: 2500, stock: 300, isCustomizable: true, isFeatured: true, minOrderQty: 5,
    tags: ["featured"],
    tiers: [{ minQty: 5, maxQty: 24, price: 2500 }, { minQty: 25, maxQty: 99, price: 2100 }, { minQty: 100, maxQty: null, price: 1800 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Stainless","Black","White","Navy"]', required: true },
    ],
  };
  if (key.includes("keyholder")) return {
    description: "Premium keyholders in metal and leather with custom branding. Durable construction with smooth-action key ring. Laser engraving for a permanent, elegant finish.",
    shortDescription: "Custom branded keyholder",
    basePrice: 450, stock: 1000, isCustomizable: true, minOrderQty: 25,
    tags: [],
    tiers: [{ minQty: 25, maxQty: 99, price: 450 }, { minQty: 100, maxQty: 499, price: 350 }, { minQty: 500, maxQty: null, price: 280 }],
    customizations: [
      { name: "Engraving Text", type: "text", required: true },
      { name: "Logo Upload", type: "file", required: false },
    ],
  };
  if (key.includes("mousepad")) return {
    description: "Custom printed round mousepads with white-edge design and non-slip rubber base. Full-color dye-sublimation printing. Smooth tracking surface for all mouse types.",
    shortDescription: "Custom printed round mousepad",
    basePrice: 550, stock: 800, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 550 }, { minQty: 50, maxQty: 199, price: 420 }, { minQty: 200, maxQty: null, price: 320 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("mug") && !key.includes("gold") && !key.includes("frost") && !key.includes("magic") && !key.includes("stanley") && !key.includes("travelling")) return {
    description: "Classic 11oz ceramic mugs with vibrant full-color sublimation printing. Dishwasher and microwave safe. Photos, logos, and text wrap around the entire mug surface. Available in white, inner-color, and two-tone options.",
    shortDescription: "Custom sublimation printed ceramic mug",
    basePrice: 650, stock: 3000, isCustomizable: true, minOrderQty: 12,
    tags: ["featured"],
    tiers: [{ minQty: 12, maxQty: 49, price: 650 }, { minQty: 50, maxQty: 199, price: 500 }, { minQty: 200, maxQty: null, price: 380 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
      { name: "Type", type: "select", options: '["White","Inner Color","Two-Tone"]', required: true },
    ],
  };
  if (key.includes("plasticwaterbottle")) return {
    description: "BPA-free plastic water bottles with custom branding. Available in clear, frosted, and colored options. Flip-top, screw-top, or sports cap. 500ml capacity. Great for gyms, schools, and events.",
    shortDescription: "Custom branded plastic water bottles",
    basePrice: 400, stock: 2000, isCustomizable: true, minOrderQty: 50,
    tags: [],
    tiers: [{ minQty: 50, maxQty: 199, price: 400 }, { minQty: 200, maxQty: 499, price: 320 }, { minQty: 500, maxQty: null, price: 250 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Clear","Red","Blue","Green","Black","White"]', required: true },
    ],
  };
  if (key.includes("stanleymug")) return {
    description: "Branded Stanley-style thermal mugs with vacuum insulation. Rugged stainless steel construction with comfortable handle. 500ml capacity. Custom laser-engraved logo for a premium look.",
    shortDescription: "Stanley-style thermal mug with custom engraving",
    basePrice: 2800, stock: 200, isCustomizable: true, isFeatured: true, minOrderQty: 5,
    tags: ["featured", "new-arrival"],
    tiers: [{ minQty: 5, maxQty: 24, price: 2800 }, { minQty: 25, maxQty: 99, price: 2400 }, { minQty: 100, maxQty: null, price: 2000 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Green","Black","White","Navy","Cream"]', required: true },
    ],
  };
  if (key.includes("strongpolyesterlanyard")) return {
    description: "Heavy-duty polyester lanyards with full-color sublimation printing. Extra-strong stitching for durability. 20mm or 25mm width with safety breakaway and J-hook attachment.",
    shortDescription: "Heavy-duty polyester lanyards with custom printing",
    basePrice: 180, stock: 3000, isCustomizable: true, minOrderQty: 50,
    tags: [],
    tiers: [{ minQty: 50, maxQty: 199, price: 180 }, { minQty: 200, maxQty: 499, price: 140 }, { minQty: 500, maxQty: null, price: 100 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Width", type: "select", options: '["15mm","20mm","25mm"]', required: true },
    ],
  };
  if (key.includes("thermalwaterbottle") && key.includes("500ml")) return {
    description: "500ml thermal water bottles with double-wall vacuum insulation. Stainless steel construction with matte or glossy finish. Custom laser-engraved or UV-printed logo. Keeps drinks hot 12hrs or cold 24hrs.",
    shortDescription: "500ml thermal insulated water bottle",
    basePrice: 1800, stock: 500, isCustomizable: true, minOrderQty: 10,
    tags: ["on-sale"],
    tiers: [{ minQty: 10, maxQty: 49, price: 1800 }, { minQty: 50, maxQty: 199, price: 1500 }, { minQty: 200, maxQty: null, price: 1200 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","White","Silver","Blue","Red","Green"]', required: true },
    ],
  };
  if (key.includes("thermalwaterbottle") && !key.includes("500ml")) return {
    description: "Premium thermal water bottles with double-wall vacuum insulation. Available in 350ml to 750ml sizes. Stainless steel with custom laser engraving. Leak-proof screw cap.",
    shortDescription: "Thermal insulated water bottle with custom branding",
    basePrice: 1500, compareAtPrice: 2000, stock: 600, isCustomizable: true, minOrderQty: 10,
    tags: ["on-sale"],
    tiers: [{ minQty: 10, maxQty: 49, price: 1500 }, { minQty: 50, maxQty: 199, price: 1200 }, { minQty: 200, maxQty: null, price: 950 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Size", type: "select", options: '["350ml","500ml","600ml","750ml"]', required: true },
      { name: "Color", type: "select", options: '["Black","White","Silver","Blue","Red"]', required: true },
    ],
  };
  if (key.includes("thermoflaskled")) return {
    description: "LED temperature-display thermo flask with matte finish. Touch-activated LED lid shows drink temperature in real-time. 500ml capacity with vacuum insulation. Premium corporate gift.",
    shortDescription: "LED temperature thermo flask with matte finish",
    basePrice: 2200, stock: 200, isCustomizable: true, isFeatured: true, minOrderQty: 5,
    tags: ["featured", "new-arrival"],
    tiers: [{ minQty: 5, maxQty: 24, price: 2200 }, { minQty: 25, maxQty: 99, price: 1900 }, { minQty: 100, maxQty: null, price: 1600 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","White","Silver","Rose Gold"]', required: true },
    ],
  };
  if (key.includes("travellingmug")) return {
    description: "Insulated travelling mugs with spill-proof lid and comfortable grip. 450ml capacity with double-wall insulation. Custom printed or engraved logo. Perfect for commuters and travelers.",
    shortDescription: "Insulated travelling mug with custom branding",
    basePrice: 1200, stock: 500, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 1200 }, { minQty: 50, maxQty: 199, price: 950 }, { minQty: 200, maxQty: null, price: 780 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Silver","Black","White","Red"]', required: true },
    ],
  };
  if (key.includes("woodenbasethermal")) return {
    description: "Premium thermal tumblers with elegant wooden base. 450ml capacity with double-wall vacuum insulation. Stainless steel body with natural wooden accent. Custom laser-engraved logo.",
    shortDescription: "Wooden base thermal tumbler with engraving",
    basePrice: 2000, stock: 300, isCustomizable: true, minOrderQty: 10,
    tags: ["new-arrival"],
    tiers: [{ minQty: 10, maxQty: 49, price: 2000 }, { minQty: 50, maxQty: 99, price: 1700 }, { minQty: 100, maxQty: null, price: 1400 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
    ],
  };

  // Fallback
  return getProductMeta(baseName, "personal-gifts");
}

// ─── Branding folder products ────────────────────────
function getBrandingMeta(baseName: string): ProductMeta {
  const key = baseName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (key.includes("stanleythermalmug") || key.includes("1lstanley") || key.includes("12lstanley")) return {
    description: "Premium 1.2L Stanley-style thermal mugs with custom branding. Heavy-duty stainless steel with vacuum insulation. Comfortable handle and wide mouth. Custom laser-engraved logo.",
    shortDescription: "1.2L Stanley thermal mug with custom engraving",
    basePrice: 3500, stock: 200, isFeatured: true, isCustomizable: true, minOrderQty: 5,
    tags: ["featured", "new-arrival"],
    tiers: [{ minQty: 5, maxQty: 24, price: 3500 }, { minQty: 25, maxQty: 99, price: 3000 }, { minQty: 100, maxQty: null, price: 2500 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Green","Black","White","Navy","Cream","Pink"]', required: true },
    ],
  };
  if (key.includes("winethermaltumbler") || key.includes("350mlwine")) return {
    description: "350ml wine-shaped thermal tumblers with double-wall vacuum insulation. Elegant stemless wine glass design. Custom laser-engraved or UV-printed logo. Perfect for wine events and premium gifts.",
    shortDescription: "350ml wine thermal tumbler with custom branding",
    basePrice: 1500, stock: 400, isCustomizable: true, minOrderQty: 10,
    tags: ["new-arrival"],
    tiers: [{ minQty: 10, maxQty: 49, price: 1500 }, { minQty: 50, maxQty: 199, price: 1200 }, { minQty: 200, maxQty: null, price: 950 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Silver","Black","Rose Gold","White","Gold"]', required: true },
    ],
  };
  if (key.includes("javathermaltumbler") || key.includes("500mljava")) return {
    description: "500ml Java-style thermal tumblers with premium matte finish. Double-wall vacuum insulation with splash-proof sliding lid. Custom branded with laser engraving or UV printing.",
    shortDescription: "500ml Java thermal tumbler with custom branding",
    basePrice: 1800, stock: 300, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 1800 }, { minQty: 50, maxQty: 199, price: 1500 }, { minQty: 200, maxQty: null, price: 1200 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Matte Black","Matte White","Silver","Navy"]', required: true },
    ],
  };
  if (key.includes("mattethermalmug") || key.includes("500mlmatte")) return {
    description: "500ml matte-finish thermal mugs with soft-touch coating. Double-wall vacuum insulation. BPA-free flip-top lid. Custom laser-engraved logo for a sleek, modern look.",
    shortDescription: "500ml matte thermal mug with custom branding",
    basePrice: 1600, stock: 400, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 1600 }, { minQty: 50, maxQty: 199, price: 1300 }, { minQty: 200, maxQty: null, price: 1050 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","White","Navy","Green","Burgundy"]', required: true },
    ],
  };
  if (key.includes("plasticwaterbottle") || key.includes("500mlplasticwater")) return {
    description: "500ml BPA-free plastic water bottles in vibrant colors. Custom full-wrap label or screen printing. Leak-proof flip-top lid with carry loop. Ideal for schools, gyms, and outdoor events.",
    shortDescription: "500ml custom branded plastic water bottle",
    basePrice: 450, stock: 2000, isCustomizable: true, minOrderQty: 50,
    tags: [],
    tiers: [{ minQty: 50, maxQty: 199, price: 450 }, { minQty: 200, maxQty: 499, price: 350 }, { minQty: 500, maxQty: null, price: 280 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Clear","Blue","Red","Green","Black","Pink","Orange"]', required: true },
    ],
  };
  if (key.includes("ropethermalbottle") || key.includes("500mlrope")) return {
    description: "500ml thermal bottles with decorative rope accent on lid. Double-wall vacuum insulation in stainless steel. Custom laser-engraved logo. Unique design makes it a standout gift.",
    shortDescription: "500ml rope-accent thermal bottle with engraving",
    basePrice: 1900, stock: 300, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 1900 }, { minQty: 50, maxQty: 99, price: 1600 }, { minQty: 100, maxQty: null, price: 1350 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Silver","Black","White","Rose Gold"]', required: true },
    ],
  };
  if (key.includes("ledthermaltumbler") || key.includes("510mled")) return {
    description: "510ml LED temperature-display thermal tumblers. Touch-activated LED on lid shows real-time drink temperature. Vacuum insulated stainless steel. Custom laser-engraved logo. Tech-forward gift.",
    shortDescription: "510ml LED temperature display thermal tumbler",
    basePrice: 2400, stock: 200, isCustomizable: true, isFeatured: true, minOrderQty: 5,
    tags: ["featured", "new-arrival"],
    tiers: [{ minQty: 5, maxQty: 24, price: 2400 }, { minQty: 25, maxQty: 99, price: 2000 }, { minQty: 100, maxQty: null, price: 1700 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","White","Silver","Rose Gold"]', required: true },
    ],
  };
  if (key.includes("doublelidsublimation") || key.includes("600mldoublelid")) return {
    description: "600ml double-lid sublimation bottles with both narrow and wide mouth lids. Full-color sublimation coating for vibrant all-over printing. Stainless steel with vacuum insulation.",
    shortDescription: "600ml double-lid sublimation bottle",
    basePrice: 1800, stock: 300, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 1800 }, { minQty: 50, maxQty: 199, price: 1500 }, { minQty: 200, maxQty: null, price: 1200 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("750mldoublelid")) return {
    description: "750ml double-lid sublimation bottles with dual-purpose lid system. Full-color sublimation coating for vibrant 360° design printing. Larger capacity for active lifestyles.",
    shortDescription: "750ml double-lid sublimation bottle",
    basePrice: 2000, stock: 250, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 2000 }, { minQty: 50, maxQty: 199, price: 1700 }, { minQty: 200, maxQty: null, price: 1400 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("goldglittercocktail") || key.includes("600mlgoldglitter")) return {
    description: "600ml gold glitter cocktail thermal tumblers with eye-catching sparkle finish. Double-wall insulation with splash-proof sliding lid. Custom logo printing. Perfect for special events.",
    shortDescription: "600ml gold glitter cocktail thermal tumbler",
    basePrice: 2200, stock: 200, isCustomizable: true, minOrderQty: 10,
    tags: ["new-arrival"],
    tiers: [{ minQty: 10, maxQty: 49, price: 2200 }, { minQty: 50, maxQty: 99, price: 1900 }, { minQty: 100, maxQty: null, price: 1600 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
    ],
  };
  if (key.includes("mattecocktailthermal") || key.includes("600mlmattecocktail")) return {
    description: "600ml matte cocktail thermal tumblers with elegant stemless design. Vacuum-insulated stainless steel with soft-touch matte coating. Custom laser engraving for premium finish.",
    shortDescription: "600ml matte cocktail thermal tumbler",
    basePrice: 2000, stock: 200, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 2000 }, { minQty: 50, maxQty: 199, price: 1700 }, { minQty: 200, maxQty: null, price: 1400 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Matte Black","Matte White","Matte Rose Gold","Matte Navy"]', required: true },
    ],
  };
  if (key.includes("duriantumbler") || key.includes("750mldurian")) return {
    description: "750ml Durian-textured thermal tumblers with unique spiky surface design. Double-wall vacuum insulation with splash-proof lid. Custom laser-engraved logo. Trendy and eye-catching.",
    shortDescription: "750ml Durian texture thermal tumbler",
    basePrice: 2200, stock: 200, isCustomizable: true, minOrderQty: 10,
    tags: ["new-arrival"],
    tiers: [{ minQty: 10, maxQty: 49, price: 2200 }, { minQty: 50, maxQty: 199, price: 1900 }, { minQty: 200, maxQty: null, price: 1600 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Color", type: "select", options: '["Black","White","Blue","Pink","Green"]', required: true },
    ],
  };
  if (key.includes("branding") && !key.includes("office")) return {
    description: "Custom product branding services including logo application on merchandise. Screen printing, embroidery, laser engraving, sublimation, and UV printing available for all product categories.",
    shortDescription: "Product branding and logo application service",
    basePrice: 500, stock: 1000, isCustomizable: true, minOrderQty: 1,
    tags: [],
    tiers: [{ minQty: 1, maxQty: 24, price: 500 }, { minQty: 25, maxQty: 99, price: 350 }, { minQty: 100, maxQty: null, price: 200 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Method", type: "select", options: '["Screen Print","Embroidery","Laser Engrave","Sublimation","UV Print"]', required: true },
    ],
  };

  return getProductMeta(baseName, "branding");
}

// ─── General folder products ─────────────────────────
function getGeneralMeta(baseName: string): ProductMeta {
  const key = baseName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (key.includes("totebag") || key.includes("widestrapbag")) return {
    description: "B4 wide strap tote bag with front pocket. Durable cotton canvas construction. Custom screen-printed logo. Wide shoulder straps for comfort. Great for everyday use and brand visibility.",
    shortDescription: "B4 wide strap tote bag with custom branding",
    basePrice: 700, stock: 800, isCustomizable: true, minOrderQty: 25,
    tags: [],
    tiers: [{ minQty: 25, maxQty: 99, price: 700 }, { minQty: 100, maxQty: 499, price: 550 }, { minQty: 500, maxQty: null, price: 420 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
    ],
  };
  if (key.includes("buttonbadge")) return {
    description: "Custom 58mm button badges with full-color printing. Pin-back design for easy attachment to clothing and bags. Perfect for events, campaigns, and promotional giveaways.",
    shortDescription: "58mm custom button badges with pin-back",
    basePrice: 50, stock: 10000, isCustomizable: true, minOrderQty: 100,
    tags: [],
    tiers: [{ minQty: 100, maxQty: 499, price: 50 }, { minQty: 500, maxQty: 999, price: 35 }, { minQty: 1000, maxQty: null, price: 25 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("lapelpin") || key.includes("coatofarms")) return {
    description: "Custom die-cast lapel pins with enamel color fill. Available in soft enamel, hard enamel, and printed options. Butterfly clutch or magnetic attachment. Kenya Coat of Arms and custom designs.",
    shortDescription: "Custom die-cast enamel lapel pins",
    basePrice: 350, stock: 2000, isCustomizable: true, minOrderQty: 50,
    tags: [],
    tiers: [{ minQty: 50, maxQty: 199, price: 350 }, { minQty: 200, maxQty: 499, price: 280 }, { minQty: 500, maxQty: null, price: 200 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
      { name: "Type", type: "select", options: '["Soft Enamel","Hard Enamel","Printed","3D Relief"]', required: true },
    ],
  };
  if (key.includes("metallicmug") || key.includes("coloredmetallic")) return {
    description: "Colored metallic finish ceramic mugs with custom printing. Available in gold, silver, rose gold, and iridescent finishes. 11oz capacity. Premium gift option for executives.",
    shortDescription: "Colored metallic ceramic mugs with custom printing",
    basePrice: 950, stock: 500, isCustomizable: true, minOrderQty: 12,
    tags: [],
    tiers: [{ minQty: 12, maxQty: 49, price: 950 }, { minQty: 50, maxQty: 199, price: 780 }, { minQty: 200, maxQty: null, price: 620 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
      { name: "Finish", type: "select", options: '["Gold","Silver","Rose Gold","Iridescent"]', required: true },
    ],
  };
  if (key.includes("fabricwristband")) return {
    description: "Custom fabric wristbands with woven or sublimated design. Premium satin or polyester material with one-way lock clasp. Full-color branding. Perfect for VIP events, festivals, and access control.",
    shortDescription: "Custom fabric event wristbands",
    basePrice: 100, stock: 5000, isCustomizable: true, minOrderQty: 100,
    tags: [],
    tiers: [{ minQty: 100, maxQty: 499, price: 100 }, { minQty: 500, maxQty: 999, price: 75 }, { minQty: 1000, maxQty: null, price: 55 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("flagpost")) return {
    description: "Custom branded flag posts with full-color printed flags. Available in indoor and outdoor variants with weighted base or ground mount. Telescoping aluminum pole with rotating arm.",
    shortDescription: "Custom branded flag post with printed flag",
    basePrice: 5500, stock: 100, isCustomizable: true, minOrderQty: 1,
    tags: [],
    tiers: [{ minQty: 1, maxQty: 4, price: 5500 }, { minQty: 5, maxQty: 19, price: 4800 }, { minQty: 20, maxQty: null, price: 4200 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
      { name: "Type", type: "select", options: '["Indoor","Outdoor","Telescoping"]', required: true },
    ],
  };
  if (key.includes("giftbag") || key.includes("floralgift")) return {
    description: "Elegant floral printed gift bags in premium quality paper. Various sizes with matching ribbon handles. Perfect for retail packaging, corporate gifts, and special occasions.",
    shortDescription: "Premium floral gift bags with ribbon handles",
    basePrice: 250, stock: 2000, isCustomizable: true, minOrderQty: 50,
    tags: [],
    tiers: [{ minQty: 50, maxQty: 199, price: 250 }, { minQty: 200, maxQty: 499, price: 200 }, { minQty: 500, maxQty: null, price: 150 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Size", type: "select", options: '["Small","Medium","Large"]', required: true },
    ],
  };
  if (key.includes("queuestand") || key.includes("stanchion")) return {
    description: "Premium gold finish queue management stanchions with retractable belt. Heavy weighted base for stability. Custom branded belt with your logo. Professional crowd control for offices and events.",
    shortDescription: "Gold queue stanchions with branded belt",
    basePrice: 8000, stock: 50, isCustomizable: true, minOrderQty: 2,
    tags: [],
    tiers: [{ minQty: 2, maxQty: 9, price: 8000 }, { minQty: 10, maxQty: 24, price: 7000 }, { minQty: 25, maxQty: null, price: 6000 }],
    customizations: [
      { name: "Belt Logo Upload", type: "file", required: false },
      { name: "Belt Color", type: "select", options: '["Red","Black","Blue","Green"]', required: true },
    ],
  };
  if (key.includes("kraftbag")) return {
    description: "Eco-friendly kraft paper bags with twisted rope handles. Available in brown and white kraft options. Custom printed with your logo and brand colors. Ideal for retail packaging and events.",
    shortDescription: "Custom printed kraft paper bags",
    basePrice: 200, stock: 3000, isCustomizable: true, minOrderQty: 100,
    tags: [],
    tiers: [{ minQty: 100, maxQty: 499, price: 200 }, { minQty: 500, maxQty: 999, price: 150 }, { minQty: 1000, maxQty: null, price: 110 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Size", type: "select", options: '["Small","Medium","Large","Extra Large"]', required: true },
    ],
  };
  if (key.includes("menuholder")) return {
    description: "Clear acrylic menu holders and table stands. Available in A4, A5, and tent-card styles. Custom branded with printed inserts. Perfect for restaurants, hotels, and reception desks.",
    shortDescription: "Acrylic menu holders with custom inserts",
    basePrice: 600, stock: 500, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 600 }, { minQty: 50, maxQty: 199, price: 480 }, { minQty: 200, maxQty: null, price: 380 }],
    customizations: [
      { name: "Insert Design Upload", type: "file", required: true },
      { name: "Size", type: "select", options: '["A4","A5","Tent Card","DL"]', required: true },
    ],
  };
  if (key.includes("metallickeyring") || key.includes("metallickeyringky")) return {
    description: "Premium metallic keyring KY5 with leather accent. Zinc alloy with chrome plating. Custom laser-engraved logo on metal surface. Comes in individual packaging. Perfect for executive giveaways.",
    shortDescription: "Metallic keyring with leather and laser engraving",
    basePrice: 550, stock: 1000, isCustomizable: true, minOrderQty: 20,
    tags: [],
    tiers: [{ minQty: 20, maxQty: 99, price: 550 }, { minQty: 100, maxQty: 499, price: 440 }, { minQty: 500, maxQty: null, price: 350 }],
    customizations: [
      { name: "Engraving Text", type: "text", required: true },
      { name: "Logo Upload", type: "file", required: false },
    ],
  };
  if (key.includes("nametag") || key.includes("silvernametag")) return {
    description: "Silver nametags with magnet backing (6.4x2.6cm). Custom printed with employee name, title, and company logo. No pins needed — strong magnetic attachment won't damage clothing.",
    shortDescription: "Magnetic silver nametags with custom printing",
    basePrice: 400, stock: 1000, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 400 }, { minQty: 50, maxQty: 199, price: 320 }, { minQty: 200, maxQty: null, price: 250 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Employee Name", type: "text", required: true },
    ],
  };
  if (key.includes("ribbon") || key.includes("outdoorribbon")) return {
    description: "Custom branded outdoor ribbons for grand openings, ceremonies, and events. High-quality satin or polyester material with full-color printing. Available in standard and custom widths.",
    shortDescription: "Custom branded ceremonial ribbons",
    basePrice: 1200, stock: 300, isCustomizable: true, minOrderQty: 5,
    tags: [],
    tiers: [{ minQty: 5, maxQty: 19, price: 1200 }, { minQty: 20, maxQty: 49, price: 1000 }, { minQty: 50, maxQty: null, price: 800 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Width", type: "select", options: '["50mm","75mm","100mm","150mm"]', required: true },
    ],
  };
  if (key.includes("pencilcase")) return {
    description: "Custom branded pencil cases in various materials. Canvas, PU leather, and nylon options. Screen-printed or embroidered logo. Perfect for school promotions and corporate stationery sets.",
    shortDescription: "Custom branded pencil cases",
    basePrice: 350, stock: 1000, isCustomizable: true, minOrderQty: 25,
    tags: [],
    tiers: [{ minQty: 25, maxQty: 99, price: 350 }, { minQty: 100, maxQty: 499, price: 280 }, { minQty: 500, maxQty: null, price: 220 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Material", type: "select", options: '["Canvas","PU Leather","Nylon"]', required: true },
    ],
  };
  if (key.includes("roundwhiteedgemousepad")) return {
    description: "Round mousepad with white edge stitching and non-slip rubber base. Custom full-color sublimation printing on smooth fabric surface. 200mm diameter. Premium desk accessory.",
    shortDescription: "Round mousepad with white edge and custom printing",
    basePrice: 550, stock: 800, isCustomizable: true, minOrderQty: 10,
    tags: [],
    tiers: [{ minQty: 10, maxQty: 49, price: 550 }, { minQty: 50, maxQty: 199, price: 420 }, { minQty: 200, maxQty: null, price: 320 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("silverlapelpin")) return {
    description: "Premium silver-finish lapel pins with custom die-cast design. Available in polished silver, brushed silver, and antique silver. Butterfly clutch attachment. Ideal for corporate and club branding.",
    shortDescription: "Silver finish custom lapel pins",
    basePrice: 400, stock: 2000, isCustomizable: true, minOrderQty: 50,
    tags: [],
    tiers: [{ minQty: 50, maxQty: 199, price: 400 }, { minQty: 200, maxQty: 499, price: 320 }, { minQty: 500, maxQty: null, price: 250 }],
    customizations: [
      { name: "Design Upload", type: "file", required: true },
    ],
  };
  if (key.includes("stressball")) return {
    description: "Custom branded stress balls in various shapes. Classic round, heart, star, and custom shapes available. PU foam construction with full-color pad printing. Fun and practical promotional item.",
    shortDescription: "Custom branded stress relief balls",
    basePrice: 200, stock: 3000, isCustomizable: true, minOrderQty: 50,
    tags: [],
    tiers: [{ minQty: 50, maxQty: 199, price: 200 }, { minQty: 200, maxQty: 499, price: 150 }, { minQty: 500, maxQty: null, price: 110 }],
    customizations: [
      { name: "Logo Upload", type: "file", required: true },
      { name: "Shape", type: "select", options: '["Round","Heart","Star","Custom"]', required: true },
    ],
  };

  return getProductMeta(baseName, "general");
}

// ─── Sports folder products ──────────────────────────
function getSportsMeta(_baseName: string): ProductMeta {
  return {
    description: "Custom team sports jerseys with full sublimation printing. Moisture-wicking polyester fabric with breathable mesh panels. Unlimited color options with numbers, names, and logos. Available in all sizes.",
    shortDescription: "Custom sublimated team sports jersey",
    basePrice: 2500, compareAtPrice: 3200, stock: 500, isFeatured: true, isCustomizable: true, minOrderQty: 10,
    tags: ["featured", "new-arrival"],
    tiers: [{ minQty: 10, maxQty: 24, price: 2500 }, { minQty: 25, maxQty: 49, price: 2100 }, { minQty: 50, maxQty: null, price: 1800 }],
    customizations: [
      { name: "Team Logo Upload", type: "file", required: true },
      { name: "Player Names & Numbers", type: "text", required: false },
      { name: "Size", type: "select", options: '["S","M","L","XL","2XL","3XL"]', required: true },
    ],
  };
}

// ─── Main seed logic ─────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding products from image directories...\n");

  // First, delete existing products and related data
  console.log("🗑️  Clearing existing product data...");
  await prisma.quoteItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.pricingTier.deleteMany();
  await prisma.customizationOption.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  console.log("✅ Existing product data cleared\n");

  // Fetch existing categories
  const categories = await prisma.category.findMany();
  const catMap = new Map(categories.map((c) => [c.slug, c]));

  // Also ensure we have categories for general, sports
  const additionalCats: { name: string; slug: string; description: string; image: string }[] = [
    { name: "General Merchandise", slug: "general", description: "General promotional merchandise, badges, bags, and miscellaneous branded items", image: "/categories/general/general.jpg" },
    { name: "Sports", slug: "sports", description: "Custom team jerseys, sports equipment, and athletic branding", image: "/categories/sports/sports.jpg" },
  ];
  for (const ac of additionalCats) {
    if (!catMap.has(ac.slug)) {
      const cat = await prisma.category.create({ data: ac });
      catMap.set(cat.slug, cat);
      console.log(`📁 Created category: ${ac.name}`);
    }
  }

  let totalProducts = 0;
  let totalImages = 0;
  const usedSlugs = new Set<string>();

  for (const [catSlug, folder] of Object.entries(CATEGORY_FOLDER_MAP)) {
    const category = catMap.get(catSlug);
    if (!category) {
      console.log(`⚠️  Category "${catSlug}" not found in DB, skipping "${folder}"`);
      continue;
    }

    const groups = scanAndGroupImages(folder, folder);
    if (groups.length === 0) {
      console.log(`📂 ${folder}: No images found`);
      continue;
    }

    console.log(`📂 ${folder}: Found ${groups.length} products`);

    for (const group of groups) {
      const productName = formatProductName(group.baseName);
      let slug = slugify(productName);

      // Ensure unique slug
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${catSlug}`;
      }
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${Date.now()}`;
      }
      usedSlugs.add(slug);

      const sku = generateSku(catSlug);

      // Get metadata based on category
      let meta: ProductMeta;
      if (catSlug === "personal-gifts") {
        meta = getPersonalGiftsMeta(group.baseName);
      } else if (catSlug === "branding") {
        meta = getBrandingMeta(group.baseName);
      } else if (catSlug === "general") {
        meta = getGeneralMeta(group.baseName);
      } else if (catSlug === "sports") {
        meta = getSportsMeta(group.baseName);
      } else {
        meta = getProductMeta(group.baseName, catSlug);
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name: productName,
          slug,
          description: meta.description,
          shortDescription: meta.shortDescription,
          basePrice: meta.basePrice,
          compareAtPrice: meta.compareAtPrice,
          sku,
          stock: meta.stock,
          categoryId: category.id,
          isFeatured: meta.isFeatured || false,
          isCustomizable: meta.isCustomizable || false,
          minOrderQty: meta.minOrderQty,
          availability: meta.availability || "in-stock",
        },
      });

      // Create images
      for (let i = 0; i < group.files.length; i++) {
        const encodedFolder = encodeURIComponent(folder);
        const encodedFile = encodeURIComponent(group.files[i]);
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: `/categories/${encodedFolder}/${encodedFile}`,
            alt: `${productName} - Image ${i + 1}`,
            isPrimary: i === 0,
            sortOrder: i,
          },
        });
        totalImages++;
      }

      // Create tags
      for (const tag of meta.tags) {
        await prisma.productTag.create({
          data: { productId: product.id, tag },
        });
      }

      // Create pricing tiers
      for (const tier of meta.tiers) {
        await prisma.pricingTier.create({
          data: {
            productId: product.id,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            price: tier.price,
          },
        });
      }

      // Create customization options
      for (const cust of meta.customizations) {
        await prisma.customizationOption.create({
          data: {
            productId: product.id,
            name: cust.name,
            type: cust.type,
            options: cust.options,
            required: cust.required,
          },
        });
      }

      totalProducts++;
    }
  }

  console.log(`\n🎉 Seed complete!`);
  console.log(`📦 ${totalProducts} products created`);
  console.log(`🖼️  ${totalImages} product images linked`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
