import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
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
  await prisma.user.deleteMany();

  // ─── Users ───────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const userPassword = await bcrypt.hash("user123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@aspireshop.com",
      passwordHash: adminPassword,
      role: "admin",
      phone: "+254700000000",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john@example.com",
      passwordHash: userPassword,
      role: "customer",
      phone: "+254712345678",
    },
  });

  console.log("✅ Users created");

  // ─── Categories ────────────────────────────────────────────────
  const paper = await prisma.category.create({
    data: {
      name: "Paper Products",
      slug: "paper",
      description: "Business cards, brochures, custom packaging, and printed materials",
      image: "/categories/paper-products.jpg",
    },
  });

  const electronics = await prisma.category.create({
    data: {
      name: "Electronics",
      slug: "electronics",
      description: "Branded USB drives, gadgets, tech accessories, and electronic gifts",
      image: "/categories/electronics.jpg",
    },
  });

  const textile = await prisma.category.create({
    data: {
      name: "Textiles",
      slug: "textile",
      description: "Custom t-shirts, hoodies, caps, polo shirts, and branded apparel",
      image: "/categories/textiles.jpg",
    },
  });

  const gifts = await prisma.category.create({
    data: {
      name: "Corporate Gifts",
      slug: "corporate-gifts",
      description: "Premium corporate gifts, executive sets, awards, and special occasion items",
      image: "/categories/corporate-gifts.jpg",
    },
  });

  const stationery = await prisma.category.create({
    data: {
      name: "Office Stationery",
      slug: "office-stationery",
      description: "Letterheads, envelopes, notepads and office essentials",
      image: "/categories/office-stationery.jpg",
    },
  });

  const homeItems = await prisma.category.create({
    data: {
      name: "Home Items",
      slug: "home-items",
      description: "Branded mugs, cushions, wall art and home décor",
      image: "/categories/home-items.jpg",
    },
  });

  const personalGifts = await prisma.category.create({
    data: {
      name: "Personal Gifts",
      slug: "personal-gifts",
      description: "Customized keychains, wallets, jewelry and accessories",
      image: "/categories/personal-gifts.jpg",
    },
  });

  const events = await prisma.category.create({
    data: {
      name: "Events",
      slug: "events",
      description: "Banners, lanyards, badges and event merchandise",
      image: "/categories/events.jpg",
    },
  });

  const branding = await prisma.category.create({
    data: {
      name: "Branding",
      slug: "branding",
      description: "Logo design, brand identity and creative design services",
      image: "/categories/branding.jpg",
    },
  });

  const signage = await prisma.category.create({
    data: {
      name: "Signage",
      slug: "signage",
      description: "Indoor and outdoor signs, banners, roll-ups and display systems",
      image: "/categories/signage.jpg",
    },
  });

  console.log("✅ Categories created");

  // ─── Products ──────────────────────────────────────────────────

  // Paper Products
  const products = [
    {
      name: "Premium Business Cards",
      slug: "premium-business-cards",
      description: "Double-sided full-color premium business cards on 350gsm card stock. Perfect for making a lasting first impression with premium matte or glossy finish. Includes custom design assistance.",
      shortDescription: "350gsm premium business cards with custom design",
      basePrice: 2500,
      compareAtPrice: 3500,
      sku: "PAP-BC-001",
      stock: 500,
      categoryId: paper.id,
      isFeatured: true,
      isCustomizable: true,
      minOrderQty: 100,
      images: [
        { url: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1572502742888-c7ad80e8fc46?w=600" },
        { url: "https://images.unsplash.com/photo-1616628188540-925618b4c0f7?w=600" },
        { url: "https://images.unsplash.com/photo-1589041127168-9b1915731dc3?w=600" },
      ],
      tags: ["on-sale", "featured"],
      tiers: [
        { minQty: 100, maxQty: 499, price: 2500 },
        { minQty: 500, maxQty: 999, price: 2000 },
        { minQty: 1000, maxQty: null, price: 1500 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Custom Text", type: "text", required: false },
        { name: "Finish", type: "select", options: '["Matte","Glossy","Silk"]', required: true },
      ],
    },
    {
      name: "Custom Brochures (A4 Tri-fold)",
      slug: "custom-brochures-a4",
      description: "Professional A4 tri-fold brochures printed on high-quality 170gsm art paper. Full-color printing on both sides. Perfect for marketing campaigns and product catalogs.",
      shortDescription: "A4 tri-fold brochures on 170gsm art paper",
      basePrice: 4500,
      sku: "PAP-BR-001",
      stock: 300,
      categoryId: paper.id,
      isCustomizable: true,
      minOrderQty: 50,
      images: [
        { url: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600" },
        { url: "https://images.unsplash.com/photo-1531538606174-e480d56dc6f2?w=600" },
        { url: "https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=600" },
      ],
      tags: ["new-arrival"],
      tiers: [
        { minQty: 50, maxQty: 199, price: 4500 },
        { minQty: 200, maxQty: 499, price: 3800 },
        { minQty: 500, maxQty: null, price: 3000 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Content Text", type: "text", required: false },
      ],
    },
    {
      name: "Branded Packaging Boxes",
      slug: "branded-packaging-boxes",
      description: "Custom-printed packaging boxes with your brand logo and design. Available in various sizes. Made from durable corrugated cardboard with full-color printing.",
      shortDescription: "Custom branded packaging boxes",
      basePrice: 15000,
      compareAtPrice: 18000,
      sku: "PAP-PK-001",
      stock: 200,
      categoryId: paper.id,
      isCustomizable: true,
      isFeatured: true,
      minOrderQty: 50,
      images: [
        { url: "https://images.unsplash.com/photo-1607166452427-7e4477c5e768?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=600" },
        { url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600" },
        { url: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600" },
      ],
      tags: ["on-sale", "featured"],
      tiers: [
        { minQty: 50, maxQty: 199, price: 15000 },
        { minQty: 200, maxQty: null, price: 12000 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Box Size", type: "select", options: '["Small","Medium","Large","Custom"]', required: true },
      ],
    },

    // Electronics
    {
      name: "Branded USB Flash Drive 32GB",
      slug: "branded-usb-32gb",
      description: "Custom-branded 32GB USB 3.0 flash drives with your company logo. Available in multiple colors. Perfect for corporate giveaways, conferences, and promotional events.",
      shortDescription: "32GB USB 3.0 with custom branding",
      basePrice: 800,
      sku: "ELC-USB-001",
      stock: 1000,
      categoryId: electronics.id,
      isCustomizable: true,
      isFeatured: true,
      minOrderQty: 25,
      images: [
        { url: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1618410320928-25228d811631?w=600" },
        { url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600" },
        { url: "https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=600" },
      ],
      tags: ["featured", "new-arrival"],
      tiers: [
        { minQty: 25, maxQty: 99, price: 800 },
        { minQty: 100, maxQty: 499, price: 650 },
        { minQty: 500, maxQty: null, price: 500 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","White","Blue","Red","Silver"]', required: true },
      ],
    },
    {
      name: "Branded Power Bank 10000mAh",
      slug: "branded-power-bank-10000",
      description: "Slim 10000mAh portable power bank with LED indicator and dual USB ports. Full-color logo printing on the surface. Comes in premium packaging.",
      shortDescription: "10000mAh power bank with custom logo",
      basePrice: 2200,
      compareAtPrice: 2800,
      sku: "ELC-PB-001",
      stock: 400,
      categoryId: electronics.id,
      isCustomizable: true,
      minOrderQty: 10,
      images: [
        { url: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600" },
        { url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600" },
        { url: "https://images.unsplash.com/photo-1610552050890-244adc7df8a6?w=600" },
      ],
      tags: ["on-sale"],
      tiers: [
        { minQty: 10, maxQty: 49, price: 2200 },
        { minQty: 50, maxQty: 199, price: 1900 },
        { minQty: 200, maxQty: null, price: 1600 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","White","Navy"]', required: true },
      ],
    },
    {
      name: "Wireless Bluetooth Speaker (Branded)",
      slug: "branded-bluetooth-speaker",
      description: "Portable wireless Bluetooth speaker with custom branding. Premium sound quality, 8-hour battery life, water-resistant design. Perfect for corporate gifts.",
      shortDescription: "Bluetooth speaker with custom branding",
      basePrice: 3500,
      sku: "ELC-SP-001",
      stock: 150,
      categoryId: electronics.id,
      isCustomizable: true,
      minOrderQty: 5,
      images: [
        { url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600" },
        { url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600" },
      ],
      tags: ["new-arrival"],
      tiers: [
        { minQty: 5, maxQty: 24, price: 3500 },
        { minQty: 25, maxQty: 99, price: 3000 },
        { minQty: 100, maxQty: null, price: 2500 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
      ],
    },

    // Textiles
    {
      name: "Custom Branded T-Shirt",
      slug: "custom-branded-tshirt",
      description: "Premium cotton custom-branded t-shirts. Available in all sizes (S-3XL). Full-color screen printing or embroidery of your logo. Perfect for events, uniforms, and merchandise.",
      shortDescription: "Premium cotton t-shirt with custom branding",
      basePrice: 1200,
      compareAtPrice: 1800,
      sku: "TXT-TS-001",
      stock: 2000,
      categoryId: textile.id,
      isFeatured: true,
      isCustomizable: true,
      minOrderQty: 10,
      images: [
        { url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600" },
        { url: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600" },
        { url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600" },
      ],
      tags: ["on-sale", "featured"],
      tiers: [
        { minQty: 10, maxQty: 49, price: 1200 },
        { minQty: 50, maxQty: 199, price: 950 },
        { minQty: 200, maxQty: null, price: 750 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["S","M","L","XL","2XL","3XL"]', required: true },
        { name: "Color", type: "select", options: '["White","Black","Navy","Red","Grey"]', required: true },
        { name: "Print Location", type: "select", options: '["Front","Back","Both Sides"]', required: true },
      ],
    },
    {
      name: "Custom Embroidered Polo Shirt",
      slug: "custom-polo-shirt",
      description: "High-quality polo shirts with custom embroidered logo. Made from cotton-polyester blend for durability and comfort. Ideal for corporate uniforms.",
      shortDescription: "Polo shirt with embroidered custom logo",
      basePrice: 2500,
      sku: "TXT-PL-001",
      stock: 800,
      categoryId: textile.id,
      isCustomizable: true,
      minOrderQty: 10,
      images: [
        { url: "https://images.unsplash.com/photo-1625910513413-5fc5e37a88bf?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600" },
        { url: "https://images.unsplash.com/photo-1564412811189-bae71678b5a0?w=600" },
        { url: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=600" },
      ],
      tags: ["new-arrival"],
      tiers: [
        { minQty: 10, maxQty: 49, price: 2500 },
        { minQty: 50, maxQty: 199, price: 2100 },
        { minQty: 200, maxQty: null, price: 1800 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["S","M","L","XL","2XL"]', required: true },
        { name: "Color", type: "select", options: '["White","Black","Navy","Royal Blue"]', required: true },
      ],
    },
    {
      name: "Branded Hoodie",
      slug: "branded-hoodie",
      description: "Premium fleece-lined hoodies with screen-printed or embroidered logos. Warm, comfortable, and stylish. Available in multiple colors and all standard sizes.",
      shortDescription: "Premium hoodie with custom branding",
      basePrice: 3800,
      compareAtPrice: 4500,
      sku: "TXT-HD-001",
      stock: 500,
      categoryId: textile.id,
      isCustomizable: true,
      minOrderQty: 5,
      images: [
        { url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=600" },
        { url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600" },
        { url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600" },
      ],
      tags: ["on-sale"],
      tiers: [
        { minQty: 5, maxQty: 24, price: 3800 },
        { minQty: 25, maxQty: 99, price: 3200 },
        { minQty: 100, maxQty: null, price: 2800 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Size", type: "select", options: '["S","M","L","XL","2XL"]', required: true },
        { name: "Color", type: "select", options: '["Black","Grey","Navy","Maroon"]', required: true },
      ],
    },
    {
      name: "Custom Baseball Cap",
      slug: "custom-baseball-cap",
      description: "Structured 6-panel baseball caps with custom embroidered or printed logos. Adjustable strap for perfect fit. Great for outdoor events and brand visibility.",
      shortDescription: "Baseball cap with custom embroidery",
      basePrice: 900,
      sku: "TXT-CP-001",
      stock: 1500,
      categoryId: textile.id,
      isCustomizable: true,
      minOrderQty: 20,
      images: [
        { url: "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600" },
        { url: "https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=600" },
      ],
      tags: ["featured"],
      tiers: [
        { minQty: 20, maxQty: 99, price: 900 },
        { minQty: 100, maxQty: 499, price: 700 },
        { minQty: 500, maxQty: null, price: 550 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","White","Navy","Red","Khaki"]', required: true },
      ],
    },

    // Corporate Gifts
    {
      name: "Executive Pen Gift Set",
      slug: "executive-pen-gift-set",
      description: "Premium executive pen set with custom engraving. Includes ballpoint and rollerball pens in a luxurious gift box. Perfect for corporate gifts and executive perks.",
      shortDescription: "Executive pen set with custom engraving",
      basePrice: 4500,
      compareAtPrice: 5500,
      sku: "GFT-PN-001",
      stock: 200,
      categoryId: gifts.id,
      isFeatured: true,
      isCustomizable: true,
      minOrderQty: 5,
      images: [
        { url: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600" },
        { url: "https://images.unsplash.com/photo-1528190336454-13cd56b45b5a?w=600" },
        { url: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600" },
      ],
      tags: ["on-sale", "featured"],
      tiers: [
        { minQty: 5, maxQty: 24, price: 4500 },
        { minQty: 25, maxQty: 99, price: 3800 },
        { minQty: 100, maxQty: null, price: 3200 },
      ],
      customizations: [
        { name: "Engraving Text", type: "text", required: true },
        { name: "Logo Upload", type: "file", required: false },
      ],
    },
    {
      name: "Branded Ceramic Mug",
      slug: "branded-ceramic-mug",
      description: "High-quality 11oz ceramic mugs with full-color sublimation printing. Dishwasher and microwave safe. Choose from white, black, or color-changing options.",
      shortDescription: "11oz ceramic mug with custom design",
      basePrice: 650,
      sku: "GFT-MG-001",
      stock: 3000,
      categoryId: gifts.id,
      isCustomizable: true,
      minOrderQty: 12,
      images: [
        { url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600" },
        { url: "https://images.unsplash.com/photo-1572119865084-43c285814d63?w=600" },
        { url: "https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=600" },
      ],
      tags: ["new-arrival"],
      tiers: [
        { minQty: 12, maxQty: 49, price: 650 },
        { minQty: 50, maxQty: 199, price: 500 },
        { minQty: 200, maxQty: null, price: 380 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Mug Type", type: "select", options: '["White","Black","Magic (Color Changing)"]', required: true },
      ],
    },
    {
      name: "Corporate Notebook & Pen Set",
      slug: "corporate-notebook-pen-set",
      description: "Premium A5 leatherette notebook with branded pen. Features lined pages, ribbon bookmark, and pen loop. Custom debossed or printed logo on cover.",
      shortDescription: "A5 notebook with branded pen set",
      basePrice: 1800,
      sku: "GFT-NB-001",
      stock: 600,
      categoryId: gifts.id,
      isCustomizable: true,
      isFeatured: true,
      minOrderQty: 10,
      images: [
        { url: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600" },
        { url: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=600" },
        { url: "https://images.unsplash.com/photo-1528938102132-4a9276b8e320?w=600" },
      ],
      tags: ["featured"],
      tiers: [
        { minQty: 10, maxQty: 49, price: 1800 },
        { minQty: 50, maxQty: 199, price: 1500 },
        { minQty: 200, maxQty: null, price: 1200 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Black","Brown","Navy","Burgundy"]', required: true },
      ],
    },
    {
      name: "Branded Tote Bag",
      slug: "branded-tote-bag",
      description: "Eco-friendly cotton canvas tote bags with custom screen printing. Sturdy construction with reinforced handles. Great for events, conferences, and daily use.",
      shortDescription: "Cotton canvas tote bag with custom print",
      basePrice: 500,
      sku: "GFT-TB-001",
      stock: 2000,
      categoryId: gifts.id,
      isCustomizable: true,
      minOrderQty: 25,
      images: [
        { url: "https://images.unsplash.com/photo-1597484661643-2f5fef26aa19?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600" },
        { url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600" },
      ],
      tags: ["new-arrival"],
      tiers: [
        { minQty: 25, maxQty: 99, price: 500 },
        { minQty: 100, maxQty: 499, price: 400 },
        { minQty: 500, maxQty: null, price: 300 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Bag Color", type: "select", options: '["Natural","Black","Navy"]', required: true },
      ],
    },
    {
      name: "Branded Water Bottle (Stainless Steel)",
      slug: "branded-water-bottle",
      description: "Double-walled vacuum insulated stainless steel water bottle (500ml). Keeps drinks hot for 12 hours or cold for 24 hours. Custom laser-engraved or printed logo.",
      shortDescription: "500ml insulated water bottle with custom logo",
      basePrice: 1500,
      compareAtPrice: 2000,
      sku: "GFT-WB-001",
      stock: 800,
      categoryId: gifts.id,
      isCustomizable: true,
      minOrderQty: 10,
      images: [
        { url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600", isPrimary: true },
        { url: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600" },
        { url: "https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=600" },
        { url: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600" },
      ],
      tags: ["on-sale"],
      tiers: [
        { minQty: 10, maxQty: 49, price: 1500 },
        { minQty: 50, maxQty: 199, price: 1200 },
        { minQty: 200, maxQty: null, price: 950 },
      ],
      customizations: [
        { name: "Logo Upload", type: "file", required: true },
        { name: "Color", type: "select", options: '["Silver","Black","White","Blue","Red"]', required: true },
      ],
    },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        sku: p.sku,
        stock: p.stock,
        categoryId: p.categoryId,
        isFeatured: p.isFeatured,
        isCustomizable: p.isCustomizable,
        minOrderQty: p.minOrderQty,
      },
    });

    // Images
    for (let i = 0; i < p.images.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: p.images[i].url,
          isPrimary: p.images[i].isPrimary || false,
          sortOrder: i,
        },
      });
    }

    // Tags
    for (const tag of p.tags) {
      await prisma.productTag.create({
        data: { productId: product.id, tag },
      });
    }

    // Pricing Tiers
    if (p.tiers) {
      for (const tier of p.tiers) {
        await prisma.pricingTier.create({
          data: {
            productId: product.id,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            price: tier.price,
          },
        });
      }
    }

    // Customization Options
    if (p.customizations) {
      for (const cust of p.customizations) {
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
    }
  }

  console.log(`✅ ${products.length} Products created`);

  // ─── Coupons ───────────────────────────────────────────────────
  await prisma.coupon.createMany({
    data: [
      {
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        minOrderValue: 5000,
        maxUses: 100,
        isActive: true,
        expiresAt: new Date("2026-12-31"),
      },
      {
        code: "BULK20",
        type: "percentage",
        value: 20,
        minOrderValue: 50000,
        isActive: true,
        expiresAt: new Date("2026-12-31"),
      },
      {
        code: "SAVE500",
        type: "fixed",
        value: 500,
        minOrderValue: 3000,
        maxUses: 200,
        isActive: true,
        expiresAt: new Date("2026-06-30"),
      },
      {
        code: "FREEDELIVERY",
        type: "fixed",
        value: 200,
        isActive: true,
      },
    ],
  });

  console.log("✅ Coupons created");

  // ─── Banners ───────────────────────────────────────────────────
  await prisma.banner.createMany({
    data: [
      {
        title: "20% Off First Order",
        subtitle: "Use code WELCOME10 at checkout",
        imageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200",
        linkUrl: "/products",
        isActive: true,
        sortOrder: 0,
      },
      {
        title: "Corporate Gift Solutions",
        subtitle: "Premium branded items for your team and clients",
        imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238f786?w=1200",
        linkUrl: "/products?category=corporate-gifts",
        isActive: true,
        sortOrder: 1,
      },
    ],
  });

  console.log("✅ Banners created");

  // ─── Sample Address ────────────────────────────────────────────
  await prisma.address.create({
    data: {
      userId: customer.id,
      label: "Office",
      street: "123 Moi Avenue",
      city: "Nairobi",
      state: "Nairobi County",
      zipCode: "00100",
      country: "Kenya",
      isDefault: true,
    },
  });

  console.log("✅ Sample address created");

  console.log("\n🎉 Seed complete!");
  console.log("\n📧 Admin login: admin@aspireshop.com / admin123");
  console.log("📧 Customer login: john@example.com / user123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
