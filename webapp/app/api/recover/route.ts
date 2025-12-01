// webapp/app/api/recover/route.ts

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { NODES } from "../../../lib/nodes";

const CURRENT_NODE = process.env.NEXT_PUBLIC_SERVER_ID || "server0";

export async function POST() {
  // @ts-ignore
  const localConfig = NODES[CURRENT_NODE];
  let conn;

  try {
    // connect to LOCAL DB to fetch pending recovery logs
    conn = await mysql.createConnection({
      host: localConfig.host,
      port: localConfig.port,
      user: localConfig.user,
      password: localConfig.password,
      database: localConfig.database,
    });

    const [rows] = await conn.execute(
      "SELECT * FROM recovery_log WHERE status = 'PENDING'"
    );
    const logs = rows as any[];

    if (logs.length === 0) {
      await conn.end();
      return NextResponse.json({ message: "No pending recovery tasks." });
    }

    let recoveredCount = 0;

    // go through each log and attempt recovery
    for (const log of logs) {
      const targetNodeKey = log.failed_node as keyof typeof NODES;
      // @ts-ignore
      const targetConfig = NODES[targetNodeKey];

      try {
        console.log(
          `[Recovery] Replaying Log ID ${log.id} to ${targetNodeKey}...`
        );

        // connect to target node
        const targetConn = await mysql.createConnection({
          host: targetConfig.host,
          port: targetConfig.port,
          user: targetConfig.user,
          password: targetConfig.password,
          database: targetConfig.database,
        });

        const data =
          typeof log.transaction_data === "string"
            ? JSON.parse(log.transaction_data)
            : log.transaction_data;

        await targetConn.beginTransaction();
        const query = `
                INSERT INTO title_basics (tconst, titleType, primaryTitle, startYear, runtimeMinutes)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                titleType = VALUES(titleType),
                primaryTitle = VALUES(primaryTitle),
                startYear = VALUES(startYear),
                runtimeMinutes = VALUES(runtimeMinutes)
            `;
        await targetConn.execute(query, [
          data.tconst,
          data.titleType,
          data.primaryTitle,
          data.startYear,
          data.runtimeMinutes,
        ]);
        await targetConn.commit();
        await targetConn.end();

        // mark log as resolved
        await conn.execute(
          "UPDATE recovery_log SET status = 'RESOLVED' WHERE id = ?",
          [log.id]
        );
        recoveredCount++;
      } catch (err: any) {
        console.warn(
          `[Recovery] Target ${targetNodeKey} is still unreachable.`
        );
      }
    }

    await conn.end();

    return NextResponse.json({
      success: true,
      recovered: recoveredCount,
      message: `Recovered ${recoveredCount} transactions.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Recovery process failed", details: err.message },
      { status: 500 }
    );
  }
}
