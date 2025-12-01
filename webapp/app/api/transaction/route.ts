// webapp/app/api/transaction/route.ts

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { NODES } from "../../../lib/nodes";

const FRAGMENTATION_YEAR = 1919;

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

  // determine target node based on startYear
  const centralNode = "server0";
  const fragmentNode = startYear < FRAGMENTATION_YEAR ? "server1" : "server2";
  const targetNodes = [centralNode, fragmentNode];
  const results: Record<string, string> = {};

  for (const nodeKey of targetNodes) {
    // @ts-ignore
    const config = NODES[nodeKey];

    try {
      console.log(
        `Connecting to ${nodeKey} at ${config.host}:${config.port}...`
      );

      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
      });

      // Step 3 Spec: Concurrency Control
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

      // Simulate concurrency delay if requested
      if (sleepTime > 0) {
        await new Promise((r) => setTimeout(r, sleepTime));
      }

      await conn.commit();
      await conn.end();
      results[nodeKey] = "SUCCESS";
    } catch (err: any) {
      console.error(
        `Failed to write to ${nodeKey} (${config.host}):`,
        err.message
      );
      results[nodeKey] = "FAILED";

      // Step 4 Spec: Failure Recovery Logging
      // If a node is down, log it to the Central Node's recovery table
      await logForRecovery(nodeKey, body);
    }
  }

  // Response: success only if Central succeeded (Step 4 Requirement: Shield users from node failure)
  const status =
    results["server0"] === "SUCCESS" ? "success" : "partial_failure";

  return NextResponse.json({
    status,
    primary: fragmentNode,
    results,
  });
}

// Helper to log missed transactions to MySQL (Step 4)
async function logForRecovery(failedNode: string, data: any) {
  try {
    // We always try to log failures to the Central Node (Server 0).
    const centralConfig = NODES.server0;

    const conn = await mysql.createConnection({
      host: centralConfig.host,
      port: centralConfig.port,
      user: centralConfig.user,
      password: centralConfig.password,
      database: centralConfig.database,
    });

    // Ensure you have a 'recovery_log' table created in your DB!
    await conn.execute(
      `INSERT INTO recovery_log (failed_node, transaction_data, status, timestamp) 
             VALUES (?, ?, 'PENDING', NOW())`,
      [failedNode, JSON.stringify(data)]
    );
    await conn.end();
    console.log(`Logged recovery data for ${failedNode}`);
  } catch (e) {
    // If Central is also down, then we have a catastrophic failure (File system fallback optional)
    console.error("CRITICAL: Central node is down, cannot log recovery.", e);
  }
}
