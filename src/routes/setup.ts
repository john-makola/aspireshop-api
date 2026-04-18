import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const router = Router();
const prisma = new PrismaClient();

// ============================================================
// TEMPORARY SETUP ROUTE — DELETE AFTER SEEDING
// Visit: https://shop.aspiregraphics.co.ke/api/setup/seed
// ============================================================

// Step 1: Create tables via Prisma's raw SQL
router.get("/tables", async (_req, res) => {
  try {
    // Create all tables using raw SQL (equivalent to prisma db push)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT,
        "role" TEXT NOT NULL DEFAULT 'customer',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

      CREATE TABLE IF NOT EXISTS "Address" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "label" TEXT NOT NULL DEFAULT 'Home',
        "street" TEXT NOT NULL,
        "city" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "zipCode" TEXT NOT NULL,
        "country" TEXT NOT NULL DEFAULT 'Kenya',
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "image" TEXT,
        "parentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
      CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "shortDescription" TEXT,
        "basePrice" DOUBLE PRECISION NOT NULL,
        "compareAtPrice" DOUBLE PRECISION,
        "sku" TEXT NOT NULL,
        "stock" INTEGER NOT NULL DEFAULT 0,
        "categoryId" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "isCustomizable" BOOLEAN NOT NULL DEFAULT false,
        "minOrderQty" INTEGER NOT NULL DEFAULT 1,
        "availability" TEXT NOT NULL DEFAULT 'in-stock',
        "discountType" TEXT,
        "discountValue" DOUBLE PRECISION,
        "promotionLabel" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
      CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");

      CREATE TABLE IF NOT EXISTS "ProductImage" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "productId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "alt" TEXT,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "ProductTag" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "productId" TEXT NOT NULL,
        "tag" TEXT NOT NULL,
        CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "ProductTag_productId_tag_key" ON "ProductTag"("productId", "tag");

      CREATE TABLE IF NOT EXISTS "PricingTier" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "productId" TEXT NOT NULL,
        "minQty" INTEGER NOT NULL,
        "maxQty" INTEGER,
        "price" DOUBLE PRECISION NOT NULL,
        CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PricingTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "CustomizationOption" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "productId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "options" TEXT,
        "required" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "CustomizationOption_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CustomizationOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "CartItem" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "customizations" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "orderNumber" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "addressId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "deliveryMethod" TEXT NOT NULL DEFAULT 'standard',
        "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "subtotal" DOUBLE PRECISION NOT NULL,
        "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "total" DOUBLE PRECISION NOT NULL,
        "couponCode" TEXT,
        "paymentMethod" TEXT,
        "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");

      CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "orderId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "totalPrice" DOUBLE PRECISION NOT NULL,
        "customizations" TEXT,
        CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "QuoteRequest" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "message" TEXT,
        "adminReply" TEXT,
        "totalEstimate" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "QuoteRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "QuoteItem" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "quoteRequestId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "customizations" TEXT,
        CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "QuoteItem_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "SavedDesign" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "imageUrl" TEXT,
        "designData" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SavedDesign_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "SavedDesign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "Coupon" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "code" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "value" DOUBLE PRECISION NOT NULL,
        "minOrderValue" DOUBLE PRECISION,
        "maxUses" INTEGER,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

      CREATE TABLE IF NOT EXISTS "Banner" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "imageUrl" TEXT,
        "linkUrl" TEXT,
        "buttonText" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "displayType" TEXT NOT NULL DEFAULT 'popup',
        "bgColor" TEXT,
        "textColor" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "Slider" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "description" TEXT,
        "imageUrl" TEXT,
        "buttonText" TEXT,
        "buttonLink" TEXT,
        "overlay" TEXT NOT NULL DEFAULT 'dark',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Slider_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'system',
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    res.json({ success: true, message: "All 16 tables created successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Step 2: Seed data
router.get("/seed", async (_req, res) => {
  try {
    const log: string[] = [];

    // Clean existing data (order matters for foreign keys)
    await prisma.notification.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quoteRequest.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.savedDesign.deleteMany();
    await prisma.address.deleteMany();
    await prisma.productTag.deleteMany();
    await prisma.pricingTier.deleteMany();
    await prisma.customizationOption.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.banner.deleteMany();
    await prisma.slider.deleteMany();
    await prisma.user.deleteMany();
    log.push("Cleaned existing data");

    // ─── Users ─────────────────────────────────────────
    const adminPassword = await bcrypt.hash("admin123", 12);
    const userPassword = await bcrypt.hash("user123", 12);

    const admin = await prisma.user.create({
      data: { name: "Admin User", email: "admin@aspireshop.com", passwordHash: adminPassword, role: "admin", phone: "+254700000000" },
    });
    const customer = await prisma.user.create({
      data: { name: "John Doe", email: "john@example.com", passwordHash: userPassword, role: "customer", phone: "+254712345678" },
    });
    log.push("Users created (admin + customer)");

    // ─── Categories ────────────────────────────────────
    const categories = [
      { name: "Paper Products", slug: "paper", description: "Business cards, brochures, custom packaging, and printed materials", image: "/categories/paper-products.jpg" },
      { name: "Electronics", slug: "electronics", description: "Branded USB drives, gadgets, tech accessories, and electronic gifts", image: "/categories/electronics.jpg" },
      { name: "Textiles", slug: "textile", description: "Custom t-shirts, hoodies, caps, polo shirts, and branded apparel", image: "/categories/textiles.jpg" },
      { name: "Corporate Gifts", slug: "corporate-gifts", description: "Premium corporate gifts, executive sets, awards, and special occasion items", image: "/categories/corporate-gifts.jpg" },
      { name: "Office Stationery", slug: "office-stationery", description: "Letterheads, envelopes, notepads and office essentials", image: "/categories/office-stationery.jpg" },
      { name: "Home Items", slug: "home-items", description: "Branded mugs, cushions, wall art and home decor", image: "/categories/home-items.jpg" },
      { name: "Personal Gifts", slug: "personal-gifts", description: "Customized keychains, wallets, jewelry and accessories", image: "/categories/personal-gifts.jpg" },
      { name: "Events", slug: "events", description: "Banners, lanyards, badges and event merchandise", image: "/categories/events.jpg" },
      { name: "Branding", slug: "branding", description: "Logo design, brand identity and creative design services", image: "/categories/branding.jpg" },
      { name: "Signage", slug: "signage", description: "Indoor and outdoor signs, banners, roll-ups and display systems", image: "/categories/signage.jpg" },
    ];

    const catMap: Record<string, string> = {};
    for (const cat of categories) {
      const created = await prisma.category.create({ data: cat });
      catMap[cat.slug] = created.id;
    }
    log.push(`${categories.length} categories created`);

    // ─── Products ──────────────────────────────────────
    const products = [
      {
        name: "Premium Business Cards", slug: "premium-business-cards",
        description: "Double-sided full-color premium business cards on 350gsm card stock. Perfect for making a lasting first impression with premium matte or glossy finish.",
        shortDescription: "350gsm premium business cards with custom design",
        basePrice: 2500, compareAtPrice: 3500, sku: "PAP-BC-001", stock: 500,
        categorySlug: "paper", isFeatured: true, isCustomizable: true, minOrderQty: 100,
        images: [
          { url: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600", isPrimary: true },
          { url: "https://images.unsplash.com/photo-1572502742888-c7ad80e8fc46?w=600", isPrimary: false },
        ],
        tags: ["on-sale", "featured"],
        tiers: [{ minQty: 100, maxQty: 499, price: 2500 }, { minQty: 500, maxQty: 999, price: 2000 }, { minQty: 1000, maxQty: null, price: 1500 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Finish", type: "select", options: '["Matte","Glossy","Silk"]', required: true },
        ],
      },
      {
        name: "Custom Brochures (A4 Tri-fold)", slug: "custom-brochures-a4",
        description: "Professional A4 tri-fold brochures printed on high-quality 170gsm art paper. Full-color printing on both sides.",
        shortDescription: "A4 tri-fold brochures on 170gsm art paper",
        basePrice: 4500, sku: "PAP-BR-001", stock: 300,
        categorySlug: "paper", isCustomizable: true, minOrderQty: 50,
        images: [{ url: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600", isPrimary: true }],
        tags: ["new-arrival"],
        tiers: [{ minQty: 50, maxQty: 199, price: 4500 }, { minQty: 200, maxQty: 499, price: 3800 }, { minQty: 500, maxQty: null, price: 3000 }],
        customizations: [{ name: "Logo Upload", type: "file", required: true }],
      },
      {
        name: "Branded Packaging Boxes", slug: "branded-packaging-boxes",
        description: "Custom-printed packaging boxes with your brand logo and design. Made from durable corrugated cardboard with full-color printing.",
        shortDescription: "Custom branded packaging boxes",
        basePrice: 15000, compareAtPrice: 18000, sku: "PAP-PK-001", stock: 200,
        categorySlug: "paper", isCustomizable: true, isFeatured: true, minOrderQty: 50,
        images: [{ url: "https://images.unsplash.com/photo-1607166452427-7e4477c5e768?w=600", isPrimary: true }],
        tags: ["on-sale", "featured"],
        tiers: [{ minQty: 50, maxQty: 199, price: 15000 }, { minQty: 200, maxQty: null, price: 12000 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Box Size", type: "select", options: '["Small","Medium","Large","Custom"]', required: true },
        ],
      },
      {
        name: "Branded USB Flash Drive 32GB", slug: "branded-usb-32gb",
        description: "Custom-branded 32GB USB 3.0 flash drives with your company logo. Perfect for corporate giveaways and conferences.",
        shortDescription: "32GB USB 3.0 with custom branding",
        basePrice: 800, sku: "ELC-USB-001", stock: 1000,
        categorySlug: "electronics", isCustomizable: true, isFeatured: true, minOrderQty: 25,
        images: [{ url: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600", isPrimary: true }],
        tags: ["featured", "new-arrival"],
        tiers: [{ minQty: 25, maxQty: 99, price: 800 }, { minQty: 100, maxQty: 499, price: 650 }, { minQty: 500, maxQty: null, price: 500 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Color", type: "select", options: '["Black","White","Blue","Red","Silver"]', required: true },
        ],
      },
      {
        name: "Branded Power Bank 10000mAh", slug: "branded-power-bank-10000",
        description: "Slim 10000mAh portable power bank with LED indicator and dual USB ports. Full-color logo printing.",
        shortDescription: "10000mAh power bank with custom logo",
        basePrice: 2200, compareAtPrice: 2800, sku: "ELC-PB-001", stock: 400,
        categorySlug: "electronics", isCustomizable: true, minOrderQty: 10,
        images: [{ url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600", isPrimary: true }],
        tags: ["on-sale"],
        tiers: [{ minQty: 10, maxQty: 49, price: 2200 }, { minQty: 50, maxQty: 199, price: 1900 }, { minQty: 200, maxQty: null, price: 1600 }],
        customizations: [{ name: "Logo Upload", type: "file", required: true }],
      },
      {
        name: "Wireless Bluetooth Speaker", slug: "branded-bluetooth-speaker",
        description: "Portable wireless Bluetooth speaker with custom branding. Premium sound, 8-hour battery, water-resistant.",
        shortDescription: "Bluetooth speaker with custom branding",
        basePrice: 3500, sku: "ELC-SP-001", stock: 150,
        categorySlug: "electronics", isCustomizable: true, minOrderQty: 5,
        images: [{ url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600", isPrimary: true }],
        tags: ["new-arrival"],
        tiers: [{ minQty: 5, maxQty: 24, price: 3500 }, { minQty: 25, maxQty: 99, price: 3000 }, { minQty: 100, maxQty: null, price: 2500 }],
        customizations: [{ name: "Logo Upload", type: "file", required: true }],
      },
      {
        name: "Custom Branded T-Shirt", slug: "custom-branded-tshirt",
        description: "Premium cotton custom-branded t-shirts. Available in all sizes (S-3XL). Full-color screen printing or embroidery.",
        shortDescription: "Premium cotton t-shirt with custom branding",
        basePrice: 1200, compareAtPrice: 1800, sku: "TXT-TS-001", stock: 2000,
        categorySlug: "textile", isFeatured: true, isCustomizable: true, minOrderQty: 10,
        images: [{ url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600", isPrimary: true }],
        tags: ["on-sale", "featured"],
        tiers: [{ minQty: 10, maxQty: 49, price: 1200 }, { minQty: 50, maxQty: 199, price: 950 }, { minQty: 200, maxQty: null, price: 750 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Size", type: "select", options: '["S","M","L","XL","2XL","3XL"]', required: true },
          { name: "Color", type: "select", options: '["White","Black","Navy","Red","Grey"]', required: true },
        ],
      },
      {
        name: "Custom Embroidered Polo Shirt", slug: "custom-polo-shirt",
        description: "High-quality polo shirts with custom embroidered logo. Cotton-polyester blend for durability and comfort.",
        shortDescription: "Polo shirt with embroidered custom logo",
        basePrice: 2500, sku: "TXT-PL-001", stock: 800,
        categorySlug: "textile", isCustomizable: true, minOrderQty: 10,
        images: [{ url: "https://images.unsplash.com/photo-1625910513413-5fc5e37a88bf?w=600", isPrimary: true }],
        tags: ["new-arrival"],
        tiers: [{ minQty: 10, maxQty: 49, price: 2500 }, { minQty: 50, maxQty: 199, price: 2100 }, { minQty: 200, maxQty: null, price: 1800 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Size", type: "select", options: '["S","M","L","XL","2XL"]', required: true },
        ],
      },
      {
        name: "Branded Hoodie", slug: "branded-hoodie",
        description: "Premium fleece-lined hoodies with screen-printed or embroidered logos. Warm, comfortable, and stylish.",
        shortDescription: "Premium hoodie with custom branding",
        basePrice: 3800, compareAtPrice: 4500, sku: "TXT-HD-001", stock: 500,
        categorySlug: "textile", isCustomizable: true, minOrderQty: 5,
        images: [{ url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600", isPrimary: true }],
        tags: ["on-sale"],
        tiers: [{ minQty: 5, maxQty: 24, price: 3800 }, { minQty: 25, maxQty: 99, price: 3200 }, { minQty: 100, maxQty: null, price: 2800 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Size", type: "select", options: '["S","M","L","XL","2XL"]', required: true },
        ],
      },
      {
        name: "Custom Baseball Cap", slug: "custom-baseball-cap",
        description: "Structured 6-panel baseball caps with custom embroidered or printed logos. Adjustable strap.",
        shortDescription: "Baseball cap with custom embroidery",
        basePrice: 900, sku: "TXT-CP-001", stock: 1500,
        categorySlug: "textile", isCustomizable: true, minOrderQty: 20,
        images: [{ url: "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600", isPrimary: true }],
        tags: ["featured"],
        tiers: [{ minQty: 20, maxQty: 99, price: 900 }, { minQty: 100, maxQty: 499, price: 700 }, { minQty: 500, maxQty: null, price: 550 }],
        customizations: [{ name: "Logo Upload", type: "file", required: true }],
      },
      {
        name: "Executive Pen Gift Set", slug: "executive-pen-gift-set",
        description: "Premium executive pen set with custom engraving. Includes ballpoint and rollerball pens in a luxurious gift box.",
        shortDescription: "Executive pen set with custom engraving",
        basePrice: 4500, compareAtPrice: 5500, sku: "GFT-PN-001", stock: 200,
        categorySlug: "corporate-gifts", isFeatured: true, isCustomizable: true, minOrderQty: 5,
        images: [{ url: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=600", isPrimary: true }],
        tags: ["on-sale", "featured"],
        tiers: [{ minQty: 5, maxQty: 24, price: 4500 }, { minQty: 25, maxQty: 99, price: 3800 }, { minQty: 100, maxQty: null, price: 3200 }],
        customizations: [{ name: "Engraving Text", type: "text", required: true }],
      },
      {
        name: "Branded Ceramic Mug", slug: "branded-ceramic-mug",
        description: "High-quality 11oz ceramic mugs with full-color sublimation printing. Dishwasher and microwave safe.",
        shortDescription: "11oz ceramic mug with custom design",
        basePrice: 650, sku: "GFT-MG-001", stock: 3000,
        categorySlug: "corporate-gifts", isCustomizable: true, minOrderQty: 12,
        images: [{ url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600", isPrimary: true }],
        tags: ["new-arrival"],
        tiers: [{ minQty: 12, maxQty: 49, price: 650 }, { minQty: 50, maxQty: 199, price: 500 }, { minQty: 200, maxQty: null, price: 380 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Mug Type", type: "select", options: '["White","Black","Magic (Color Changing)"]', required: true },
        ],
      },
      {
        name: "Corporate Notebook & Pen Set", slug: "corporate-notebook-pen-set",
        description: "Premium A5 leatherette notebook with branded pen. Custom debossed or printed logo on cover.",
        shortDescription: "A5 notebook with branded pen set",
        basePrice: 1800, sku: "GFT-NB-001", stock: 600,
        categorySlug: "corporate-gifts", isCustomizable: true, isFeatured: true, minOrderQty: 10,
        images: [{ url: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600", isPrimary: true }],
        tags: ["featured"],
        tiers: [{ minQty: 10, maxQty: 49, price: 1800 }, { minQty: 50, maxQty: 199, price: 1500 }, { minQty: 200, maxQty: null, price: 1200 }],
        customizations: [{ name: "Logo Upload", type: "file", required: true }],
      },
      {
        name: "Branded Tote Bag", slug: "branded-tote-bag",
        description: "Eco-friendly cotton canvas tote bags with custom screen printing. Sturdy construction with reinforced handles.",
        shortDescription: "Cotton canvas tote bag with custom print",
        basePrice: 500, sku: "GFT-TB-001", stock: 2000,
        categorySlug: "corporate-gifts", isCustomizable: true, minOrderQty: 25,
        images: [{ url: "https://images.unsplash.com/photo-1597484661643-2f5fef26aa19?w=600", isPrimary: true }],
        tags: ["new-arrival"],
        tiers: [{ minQty: 25, maxQty: 99, price: 500 }, { minQty: 100, maxQty: 499, price: 400 }, { minQty: 500, maxQty: null, price: 300 }],
        customizations: [{ name: "Logo Upload", type: "file", required: true }],
      },
      {
        name: "Branded Water Bottle (Stainless Steel)", slug: "branded-water-bottle",
        description: "Double-walled vacuum insulated stainless steel water bottle (500ml). Custom laser-engraved or printed logo.",
        shortDescription: "500ml insulated water bottle with custom logo",
        basePrice: 1500, compareAtPrice: 2000, sku: "GFT-WB-001", stock: 800,
        categorySlug: "corporate-gifts", isCustomizable: true, minOrderQty: 10,
        images: [{ url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600", isPrimary: true }],
        tags: ["on-sale"],
        tiers: [{ minQty: 10, maxQty: 49, price: 1500 }, { minQty: 50, maxQty: 199, price: 1200 }, { minQty: 200, maxQty: null, price: 950 }],
        customizations: [
          { name: "Logo Upload", type: "file", required: true },
          { name: "Color", type: "select", options: '["Silver","Black","White","Blue","Red"]', required: true },
        ],
      },
    ];

    for (const p of products) {
      const product = await prisma.product.create({
        data: {
          name: p.name, slug: p.slug, description: p.description, shortDescription: p.shortDescription,
          basePrice: p.basePrice, compareAtPrice: p.compareAtPrice, sku: p.sku, stock: p.stock,
          categoryId: catMap[p.categorySlug], isFeatured: p.isFeatured, isCustomizable: p.isCustomizable, minOrderQty: p.minOrderQty,
        },
      });
      for (let i = 0; i < p.images.length; i++) {
        await prisma.productImage.create({ data: { productId: product.id, url: p.images[i].url, isPrimary: p.images[i].isPrimary || false, sortOrder: i } });
      }
      for (const tag of p.tags) {
        await prisma.productTag.create({ data: { productId: product.id, tag } });
      }
      if (p.tiers) {
        for (const tier of p.tiers) {
          await prisma.pricingTier.create({ data: { productId: product.id, minQty: tier.minQty, maxQty: tier.maxQty, price: tier.price } });
        }
      }
      if (p.customizations) {
        for (const c of p.customizations) {
          await prisma.customizationOption.create({ data: { productId: product.id, name: c.name, type: c.type, options: c.options, required: c.required } });
        }
      }
    }
    log.push(`${products.length} products created with images, tags, tiers, customizations`);

    // ─── Coupons ───────────────────────────────────────
    await prisma.coupon.createMany({
      data: [
        { code: "WELCOME10", type: "percentage", value: 10, minOrderValue: 5000, maxUses: 100, isActive: true, expiresAt: new Date("2026-12-31") },
        { code: "BULK20", type: "percentage", value: 20, minOrderValue: 50000, isActive: true, expiresAt: new Date("2026-12-31") },
        { code: "SAVE500", type: "fixed", value: 500, minOrderValue: 3000, maxUses: 200, isActive: true, expiresAt: new Date("2026-06-30") },
        { code: "FREEDELIVERY", type: "fixed", value: 200, isActive: true },
      ],
    });
    log.push("4 coupons created");

    // ─── Banners ───────────────────────────────────────
    await prisma.banner.createMany({
      data: [
        { title: "20% Off First Order", subtitle: "Use code WELCOME10 at checkout", imageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200", linkUrl: "/products", isActive: true, sortOrder: 0 },
        { title: "Corporate Gift Solutions", subtitle: "Premium branded items for your team and clients", imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238f786?w=1200", linkUrl: "/products?category=corporate-gifts", isActive: true, sortOrder: 1 },
      ],
    });
    log.push("2 banners created");

    // ─── Sliders ───────────────────────────────────────
    await prisma.slider.createMany({
      data: [
        { title: "Custom Branded Merchandise", subtitle: "Elevate Your Brand", description: "Premium promotional items, corporate gifts, and custom-printed products for your business.", imageUrl: "/sliders/slider_1.jpg", buttonText: "Shop Now", buttonLink: "/products", overlay: "dark", sortOrder: 0 },
        { title: "Bulk Orders, Better Prices", subtitle: "Volume Discounts Available", description: "Order in bulk and save up to 40%. Perfect for corporate events, trade shows, and brand campaigns.", imageUrl: "/sliders/slider_2.jpg", buttonText: "Request a Quote", buttonLink: "/quote", overlay: "dark", sortOrder: 1 },
        { title: "New Arrivals", subtitle: "Fresh Collection 2026", description: "Explore our latest range of customizable products — from tech accessories to premium apparel.", imageUrl: "/sliders/slider_3.jpg", buttonText: "Browse Collection", buttonLink: "/products", overlay: "dark", sortOrder: 2 },
      ],
    });
    log.push("3 sliders created");

    // ─── Sample Address ────────────────────────────────
    await prisma.address.create({
      data: { userId: customer.id, label: "Office", street: "123 Moi Avenue", city: "Nairobi", state: "Nairobi County", zipCode: "00100", country: "Kenya", isDefault: true },
    });
    log.push("Sample address created");

    res.json({
      success: true,
      message: "Database seeded successfully!",
      log,
      testAccounts: {
        admin: { email: "admin@aspireshop.com", password: "admin123" },
        customer: { email: "john@example.com", password: "user123" },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

export default router;
