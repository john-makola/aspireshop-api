import dns from "dns";

/**
 * Railway's internal hostnames (*.railway.internal) resolve via their
 * custom DNS.  Prisma's Rust query-engine binary uses its own resolver
 * which can't reach Railway's DNS.  We resolve the hostname to an IPv4
 * address BEFORE importing the app so PrismaClient gets a numeric IP.
 */
async function resolveAndStart() {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.endsWith(".railway.internal")) {
        const { address } = await dns.promises.lookup(parsed.hostname, { family: 4 });
        parsed.hostname = address;
        process.env.DATABASE_URL = parsed.toString();
        console.log(`Resolved DB host → ${address}`);
      }
    } catch (e) {
      console.warn("DNS resolution failed, using original DATABASE_URL", e);
    }
  }

  // Now import server — prisma.ts will read the updated env var
  await import("./server");
}

resolveAndStart();
