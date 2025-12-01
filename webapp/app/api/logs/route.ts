// webapp/app/api/logs/route.ts

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { NODES } from "@/lib/nodes";

const CURRENT_NODE = process.env.NEXT_PUBLIC_SERVER_ID || "server0";

export async function GET() {
  // @ts-ignore
  const localConfig = NODES[CURRENT_NODE];

  try {
    const conn = await mysql.createConnection({
      host: localConfig.host,
      port: localConfig.port,
      user: localConfig.user,
      password: localConfig.password,
      database: localConfig.database,
    });

    // Get the latest 50 logs
    const [rows] = await conn.execute(
      "SELECT * FROM recovery_log ORDER BY timestamp DESC LIMIT 50"
    );
    await conn.end();

    return NextResponse.json({ logs: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
