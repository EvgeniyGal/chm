import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { normalizeDatabaseUrlForPg } from "./normalize-database-url";

const pool = new Pool({
  connectionString: normalizeDatabaseUrlForPg(process.env.DATABASE_URL),
});

export const db = drizzle(pool, { schema });

