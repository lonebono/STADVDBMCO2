// webapp/app/api/transaction/route.ts

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { NODES } from "../../../lib/nodes";

const FRAGMENTATION_YEAR = 1919;

const CURRENT_NODE = process.env.NEXT_PUBLIC_SERVER_ID || "server0";

//main post handler
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    tconst,
    titleType,
    primaryTitle,
    startYear,
    runtimeMinutes,
    isolationLevel = "READ COMMITTED",
    sleepTime = 0,
  } = body;

  // connect to target nodes based on fragmentation
  const centralNode = "server0";
  const fragmentNode = startYear < FRAGMENTATION_YEAR ? "server1" : "server2";
  const targetNodes = [centralNode, fragmentNode];
  const results: Record<string, string> = {};

  // execute writes on target nodes
  for (const targetNodeKey of targetNodes) {
    // @ts-ignore
    const config = NODES[targetNodeKey];

    try {
      console.log(`[${CURRENT_NODE}] connecting to ${targetNodeKey}...`);

      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
      });

      await conn.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      await conn.beginTransaction();

      const query = `
        INSERT INTO title_basics (tconst, titleType, primaryTitle, startYear, runtimeMinutes)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        titleType = VALUES(titleType),
        primaryTitle = VALUES(primaryTitle),
        startYear = VALUES(startYear),
        runtimeMinutes = VALUES(runtimeMinutes)
      `;

      await conn.execute(query, [
        tconst,
        titleType,
        primaryTitle,
        startYear,
        runtimeMinutes,
      ]);

      if (sleepTime > 0) await new Promise((r) => setTimeout(r, sleepTime));

      await conn.commit();
      await conn.end();
      results[targetNodeKey] = "SUCCESS";
    } catch (err: any) {
      console.error(`Write failed to ${targetNodeKey}: ${err.message}`);
      results[targetNodeKey] = "FAILED";

      //  failure logging step
      // if the target is not self, must log that they missed this.
      if (targetNodeKey !== CURRENT_NODE) {
        await logFailureLocally(targetNodeKey, body);
      }
    }
  }

  // Shield users: Return success if at least one node accepted the data
  const status = Object.values(results).includes("SUCCESS")
    ? "success"
    : "failure";

  return NextResponse.json({
    status,
    results,
    message:
      status === "success"
        ? "Transaction processed (potentially queued)."
        : "System failure.",
  });
}

// Helper to log missed transactions to MySQL (Step 4)
async function logFailureLocally(failedNode: string, data: any) {
  try {
    // @ts-ignore
    const localConfig = NODES[CURRENT_NODE]; // Connect to Myself

    const conn = await mysql.createConnection({
      host: localConfig.host,
      port: localConfig.port,
      user: localConfig.user,
      password: localConfig.password,
      database: localConfig.database,
    });

    await conn.execute(
      `INSERT INTO recovery_log (failed_node, transaction_data, status) VALUES (?, ?, 'PENDING')`,
      [failedNode, JSON.stringify(data)]
    );
    await conn.end();
    console.log(
      `[Recovery] Logged missed transaction for ${failedNode} into local DB.`
    );
  } catch (e) {
    console.error("CRITICAL: Local DB is down. Cannot log failure.", e);
  }
}
