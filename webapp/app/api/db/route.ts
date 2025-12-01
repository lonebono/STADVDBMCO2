// webapp/app/api/db/route.ts
import { NextRequest, NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

type Server = "server0" | "server1" | "server2";

const DB_SERVERS: Record<Server, { host: string; user: string; password: string; database: string }> = {
  server0: {
    host: process.env.DB0_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
  },
  server1: {
    host: process.env.DB1_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
  },
  server2: {
    host: process.env.DB2_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
  },
};

async function fetchServerData(server: Server) {
  const conn = await mysql.createConnection({
    ...DB_SERVERS[server],
    port: 3306,
  });

  // Count total rows
  const [countRows] = await conn.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM title_basics"
  );
  const rowCount = countRows[0]["count"];

  // Fetch sample rows (limit 5)
  const [sampleRows] = await conn.execute<RowDataPacket[]>(
    "SELECT tconst, titleType, primaryTitle, startYear, runtimeMinutes FROM title_basics LIMIT 5"
  );

  await conn.end();

  return { rowCount, sampleRows };
}

export async function GET(req: NextRequest) {
  try {
    const serverQuery = req.nextUrl.searchParams.get("server") as Server | null;

    if (serverQuery && !["server0", "server1", "server2"].includes(serverQuery)) {
      return NextResponse.json({ error: "Invalid server" }, { status: 400 });
    }

    // Fetch all servers if no specific server requested
    const serversToFetch: Server[] = serverQuery ? [serverQuery] : ["server0", "server1", "server2"];

    const data: Record<Server, any> = {} as any;

    for (const srv of serversToFetch) {
      data[srv] = await fetchServerData(srv);
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: "DB connection failed", details: err.message }, { status: 500 });
  }
}
