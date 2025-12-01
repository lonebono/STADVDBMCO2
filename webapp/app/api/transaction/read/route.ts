// webapp/app/api/transaction/read/route.ts

import { NextRequest, NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import { NODES } from "@/lib/nodes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tconst = searchParams.get("tconst") || "tt0000001";
  const targetNodeParam = searchParams.get("targetNode") || "central";
  const isolationLevel = searchParams.get("isolationLevel") || "READ COMMITTED";

  // Map the frontend param (central/server1/server2) to our NODES config keys
  let nodeKey: keyof typeof NODES = "server0"; // Default to central

  if (targetNodeParam === "central") nodeKey = "server0";
  else if (targetNodeParam === "server1") nodeKey = "server1";
  else if (targetNodeParam === "server2") nodeKey = "server2";

  // @ts-ignore
  const config = NODES[nodeKey];

  if (!config) {
    return NextResponse.json(
      { error: `Invalid target node: ${targetNodeParam}` },
      { status: 400 }
    );
  }

  let conn;
  try {
    // Connect to the specific node (Internal IP)
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    // Step 3 Spec: Concurrency Control (Isolation Level)
    await conn.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    await conn.beginTransaction();

    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT tconst, primaryTitle, startYear, runtimeMinutes FROM title_basics WHERE tconst = ?",
      [tconst]
    );

    await conn.commit();

    return NextResponse.json({
      status: "success",
      node: nodeKey,
      data: rows[0] || null,
      isolationLevel,
    });
  } catch (err: any) {
    if (conn) await conn.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
