const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main() {
  const newCats = [
    {
      name: "Office Stationery",
      slug: "office-stationery",
      description: "Letterheads, envelopes, notepads and office essentials",
      image: "/categories/office-stationery.jpg",
    },
    {
      name: "Home Items",
      slug: "home-items",
      description: "Branded mugs, cushions, wall art and home decor",
      image: "/categories/home-items.jpg",
    },
    {
      name: "Personal Gifts",
      slug: "personal-gifts",
      description: "Customized keychains, wallets, jewelry and accessories",
      image: "/categories/personal-gifts.jpg",
    },
    {
      name: "Events",
      slug: "events",
      description: "Banners, lanyards, badges and event merchandise",
      image: "/categories/events.jpg",
    },
    {
      name: "Branding",
      slug: "branding",
      description: "Logo design, brand identity and creative design services",
      image: "/categories/branding.jpg",
    },
    {
      name: "Signage",
      slug: "signage",
      description:
        "Indoor and outdoor signs, banners, roll-ups and display systems",
      image: "/categories/signage.jpg",
    },
  ];

  for (const cat of newCats) {
    const exists = await p.category.findUnique({ where: { slug: cat.slug } });
    if (!exists) {
      await p.category.create({ data: cat });
      console.log("Created: " + cat.name);
    } else {
      console.log("Exists: " + cat.name);
    }
  }

  // Update existing categories to use local images
  await p.category.updateMany({
    where: { slug: "paper" },
    data: { image: "/categories/paper-products.jpg" },
  });
  await p.category.updateMany({
    where: { slug: "electronics" },
    data: { image: "/categories/electronics.jpg" },
  });
  await p.category.updateMany({
    where: { slug: "textile" },
    data: { image: "/categories/textiles.jpg" },
  });
  await p.category.updateMany({
    where: { slug: "corporate-gifts" },
    data: { image: "/categories/corporate-gifts.jpg" },
  });
  console.log("Updated existing category images");

  const all = await p.category.findMany({ orderBy: { name: "asc" } });
  console.log("\nAll categories (" + all.length + "):");
  all.forEach((c) => console.log("  - " + c.name + " (" + c.slug + ")"));

  await p.$disconnect();
}

main();
