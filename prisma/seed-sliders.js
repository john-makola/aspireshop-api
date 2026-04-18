const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main() {
  // Delete existing sliders first
  await p.slider.deleteMany({});

  await p.slider.createMany({
    data: [
      {
        title: "Custom Branded Merchandise",
        subtitle: "Elevate Your Brand",
        description: "Premium promotional items, corporate gifts, and custom-printed products for your business.",
        imageUrl: "/sliders/slider_1.jpg",
        buttonText: "Shop Now",
        buttonLink: "/products",
        overlay: "dark",
        sortOrder: 0,
      },
      {
        title: "Bulk Orders, Better Prices",
        subtitle: "Volume Discounts Available",
        description: "Order in bulk and save up to 40%. Perfect for corporate events, trade shows, and brand campaigns.",
        imageUrl: "/sliders/slider_2.jpg",
        buttonText: "Request a Quote",
        buttonLink: "/quote",
        overlay: "dark",
        sortOrder: 1,
      },
      {
        title: "New Arrivals",
        subtitle: "Fresh Collection 2026",
        description: "Explore our latest range of customizable products — from tech accessories to premium apparel.",
        imageUrl: "/sliders/slider_3.jpg",
        buttonText: "Browse Collection",
        buttonLink: "/products",
        overlay: "dark",
        sortOrder: 2,
      },
    ],
  });
  console.log("Sliders seeded!");
  await p.$disconnect();
}

main();
