// webapp/app/api/db/route.ts
import { NextRequest, NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import { NODES } from "../../../lib/nodes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // get server identifier from query params
  const serverParam = searchParams.get("server") || "server0";

  // Validate server param
  if (!(serverParam in NODES)) {
    return NextResponse.json(
      { error: "Invalid server identifier" },
      { status: 400 }
    );
  }

  const nodeKey = serverParam as keyof typeof NODES;
  // @ts-ignore
  const config = NODES[nodeKey];

  try {
    // connect to target node using internal IP
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      // fail fast if cannot connect
      connectTimeout: 2000,
    });

    // get row count from title_basics
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM title_basics"
    );

    const rowCount = rows[0].count;
    await conn.end();

    return NextResponse.json({
      server: nodeKey,
      rowCount: rowCount,
      online: true,
    });
  } catch (err: any) {
    console.error(
      `[Dashboard] Check failed for ${nodeKey} (${config.host}):`,
      err.message
    );

    // Return a 500 error so the frontend knows it's offline
    return NextResponse.json(
      { error: "DB connection failed", details: err.message, online: false },
      { status: 500 }
    );
  }
}
