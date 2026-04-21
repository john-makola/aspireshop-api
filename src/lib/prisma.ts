import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prefer internal Railway URL (same network, no proxy) over external proxy URL
const connectionString =
  process.env.DATABASE_PRIVATE_URL ||
  process.env.DATABASE_URL ||
  "";

const isInternal = connectionString.includes(".railway.internal");

const pool = new Pool({
  connectionString,
  ssl: isInternal ? false : { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
