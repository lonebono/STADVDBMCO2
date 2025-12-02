// webapp/app/api/records/route.ts

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { NODES } from "@/lib/nodes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const server = searchParams.get("server") || "server0";
  const query = searchParams.get("q") || "";

  // @ts-ignore
  const config = NODES[server];
  if (!config)
    return NextResponse.json({ error: "Invalid server" }, { status: 400 });

  try {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    let sql = "SELECT * FROM title_basics";
    const params = [];

    // search filter
    if (query) {
      sql += ` WHERE 
            tconst LIKE ? OR 
            primaryTitle LIKE ? OR 
            titleType LIKE ? OR 
            CAST(startYear AS CHAR) LIKE ? OR 
            CAST(runtimeMinutes AS CHAR) LIKE ?`;
      const wild = `%${query}%`;
      params.push(wild, wild, wild, wild, wild);
    }

    sql += " ORDER BY startYear DESC LIMIT 50";

    const [rows] = await conn.execute(sql, params);
    await conn.end();

    return NextResponse.json({ records: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
