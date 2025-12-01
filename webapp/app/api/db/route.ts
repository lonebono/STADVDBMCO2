// webapp/app/api/db/route.ts
import { NextRequest, NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

type Server = "server0" | "server1" | "server2";

const DB_USER = process.env.DB_USER!;
const DB_PASS = process.env.DB_PASS!;
const DB_NAME = process.env.DB_NAME!;

const VM_CONFIG: Record<Server, { host: string; port: number }> = {
  server0: { host: process.env.DB0_HOST!, port: Number(process.env.DB0_PORT) },
  server1: { host: process.env.DB1_HOST!, port: Number(process.env.DB1_PORT) },
  server2: { host: process.env.DB2_HOST!, port: Number(process.env.DB2_PORT) },
};

// median for fragmentation
const MEDIAN_YEAR = 1919;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const server = (searchParams.get("server") || "server0") as Server;

  if (!(server in VM_CONFIG)) {
    return NextResponse.json({ error: "Invalid server" }, { status: 400 });
  }

  try {
    const { host, port } = VM_CONFIG[server];

    const conn = await mysql.createConnection({
      host,
      port,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });

    let query = "SELECT COUNT(*) AS count FROM title_basics";
    if (server === "server1") query += ` WHERE startYear < ${MEDIAN_YEAR} OR startYear IS NULL`;
    if (server === "server2") query += ` WHERE startYear >= ${MEDIAN_YEAR}`;
    if (server === "server0") query += " LIMIT 20000";

    const [rows] = await conn.execute<RowDataPacket[]>(query);
    const localCount = rows[0]["count"];

    await conn.end();

    return NextResponse.json({
      server,
      rowCount: localCount,
      online: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "DB connection failed", details: err.message, online: false },
      { status: 500 }
    );
  }
}
