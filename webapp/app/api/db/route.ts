// webapp/app/api/db/route.ts
import { NextRequest, NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

type Server = "server0" | "server1" | "server2";

const DB_USER = process.env.DB_USER!;
const DB_PASS = process.env.DB_PASS!;
const DB_NAME = process.env.DB_NAME!;
const DB_HOST = process.env.DB_HOST!;
const server: Server = process.env.SERVER_ID as Server;

const VM_PORTS: Record<Server, number> = {
  server0: Number(process.env.SERVER0_PORT),
  server1: Number(process.env.SERVER1_PORT),
  server2: Number(process.env.SERVER2_PORT),
};

export async function GET(req: NextRequest) {
  try {
    // Always connect to LOCAL MySQL on this VM
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

    await conn.end();

    // Calculate partition percent relative to server0 (central node)
    const centralCount = server === "server0" ? rows[0]["count"] : null;

    return NextResponse.json({
      server,
      rowCount: rows[0]["count"],
      online: true,
      partitionPort: VM_PORTS[server],
      centralCount, // optional, can use for dashboard percentage calculation
    });
  } catch (err: any) {
    return NextResponse.json({ error: "DB connection failed", details: err.message }, { status: 500 });
  }
}
