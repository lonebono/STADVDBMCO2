// webapp/app/api/transaction/route.ts

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { NODES } from "@/lib/nodes";

const FRAGMENTATION_YEAR = 1919;
const CURRENT_NODE = process.env.NEXT_PUBLIC_SERVER_ID || "server0";

// Handle INSERT/UPDATE transaction
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

  const centralNode = "server0";
  const fragmentNode = startYear < FRAGMENTATION_YEAR ? "server1" : "server2";
  const targetNodes = [centralNode, fragmentNode];

  const results: Record<string, string> = {};

  for (const targetNodeKey of targetNodes) {
    // @ts-ignore
    const config = NODES[targetNodeKey];
    try {
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
        titleType = VALUES(titleType), primaryTitle = VALUES(primaryTitle), startYear = VALUES(startYear), runtimeMinutes = VALUES(runtimeMinutes)
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
      if (targetNodeKey !== CURRENT_NODE)
        await logFailureLocally(targetNodeKey, body, "INSERT");
    }
  }

  const status = Object.values(results).includes("SUCCESS")
    ? "success"
    : "failure";
  return NextResponse.json({ status, results });
}

// Handle DELETE transaction
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { tconst, isolationLevel = "READ COMMITTED", sleepTime = 0 } = body;

  // Broadcast DELETE to all nodes
  const targetNodes = ["server0", "server1", "server2"];
  const results: Record<string, string> = {};

  for (const targetNodeKey of targetNodes) {
    // @ts-ignore
    const config = NODES[targetNodeKey];
    try {
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
      });

      await conn.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      await conn.beginTransaction();

      const query = "DELETE FROM title_basics WHERE tconst = ?";
      await conn.execute(query, [tconst]);

      if (sleepTime > 0) await new Promise((r) => setTimeout(r, sleepTime));

      await conn.commit();
      await conn.end();
      results[targetNodeKey] = "SUCCESS";
    } catch (err: any) {
      console.error(`Delete failed on ${targetNodeKey}: ${err.message}`);
      results[targetNodeKey] = "FAILED";
      // Log failure locally for recovery
      if (targetNodeKey !== CURRENT_NODE) {
        await logFailureLocally(targetNodeKey, { tconst }, "DELETE");
      }
    }
  }

  const status = Object.values(results).includes("SUCCESS")
    ? "success"
    : "failure";
  return NextResponse.json({ status, results, message: "Delete broadcasted." });
}

// log failure locally for recovery
async function logFailureLocally(
  failedNode: string,
  data: any,
  opType: string = "INSERT"
) {
  try {
    // @ts-ignore
    const localConfig = NODES[CURRENT_NODE];
    const conn = await mysql.createConnection({
      host: localConfig.host,
      port: localConfig.port,
      user: localConfig.user,
      password: localConfig.password,
      database: localConfig.database,
    });

    // include operation type in recovery log
    const recoveryPayload = { op: opType, payload: data };

    await conn.execute(
      `INSERT INTO recovery_log (failed_node, transaction_data, status) VALUES (?, ?, 'PENDING')`,
      [failedNode, JSON.stringify(recoveryPayload)]
    );
    await conn.end();
  } catch (e) {
    console.error("CRITICAL: Local DB is down.", e);
  }
}
