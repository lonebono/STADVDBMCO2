// webapp/app/api/db/route.ts
import { NextRequest, NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

type Server = "server0" | "server1" | "server2";

const DB_USER = process.env.DB_USER!;
const DB_PASS = process.env.DB_PASS!;
const DB_NAME = process.env.DB_NAME!;
const DB_HOST = process.env.DB_HOST!;

// Ports here are mostly for informational purposes
const VM_PORTS: Record<Server, number> = {
  server0: Number(process.env.SERVER0_PORT),
  server1: Number(process.env.SERVER1_PORT),
  server2: Number(process.env.SERVER2_PORT),
};

// URL for central node API (adjust external IP/port if needed)
const CENTRAL_NODE_URL =
  "http://ccscloud.dlsu.edu.ph:60205/api/db?server=server0";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const server = (searchParams.get("server") || "server0") as Server;

  if (!(server in VM_PORTS)) {
    return NextResponse.json({ error: "Invalid server" }, { status: 400 });
  }

  try {
    // Connect to LOCAL MySQL on this VM
    const conn = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      port: 3306,
    });

    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM title_basics"
    );
    const localCount = rows[0]["count"];

    await conn.end();

    // Fetch central node count only if we're NOT the central node
    let centralCount = localCount;
    if (server !== "server0") {
      try {
        const res = await fetch(CENTRAL_NODE_URL);
        const data = await res.json();
        if (data.rowCount) centralCount = data.rowCount;
      } catch (err) {
        console.warn("Failed to fetch central node count:", err);
      }
    }

    const partitionPercent = Math.round((localCount / centralCount) * 100);

    return NextResponse.json({
      server,
      rowCount: localCount,
      online: true,
      partitionPercent,
      centralCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "DB connection failed", details: err.message, online: false },
      { status: 500 }
    );
  }
}
