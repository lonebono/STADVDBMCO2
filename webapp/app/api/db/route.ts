// webapp/app/api/db/route.ts
import { NextRequest, NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";

const VM_PORTS = {
  server0: Number(process.env.SERVER0_PORT),
  server1: Number(process.env.SERVER1_PORT),
  server2: Number(process.env.SERVER2_PORT),
};

const DB_USER = process.env.DB_USER!;
const DB_PASS = process.env.DB_PASS!;
const DB_NAME = process.env.DB_NAME!;
const DB_HOST = process.env.DB_HOST!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const server = (searchParams.get("server") ||
    "server0") as keyof typeof VM_PORTS;
  const port = VM_PORTS[server];

  if (!port)
    return NextResponse.json({ error: "Invalid server" }, { status: 400 });

  try {
    const conn = await mysql.createConnection({
      host: DB_HOST,
      port,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });

    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM title_basics"
    );

    await conn.end();

    return NextResponse.json({
      server,
      rowCount: rows[0]["count"],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "DB connection failed", details: err.message },
      { status: 500 }
    );
  }
}
