// webapp/app/api/recover/route.ts

import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";

const VM_PORTS = {
  server0: Number(process.env.SERVER0_PORT),
  server1: Number(process.env.SERVER1_PORT),
  server2: Number(process.env.SERVER2_PORT),
};

const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

export async function POST() {
  const logPath = path.join(process.cwd(), "recovery_log.json");
  let logs = [];

  try {
    const fileContent = await fs.readFile(logPath, "utf-8");
    logs = JSON.parse(fileContent);
  } catch (e) {
    return NextResponse.json({ message: "No recovery logs found" });
  }

  if (logs.length === 0) {
    return NextResponse.json({
      message: "No pending transactions to recover.",
    });
  }

  const remainingLogs = [];
  let recoveredCount = 0;

  for (const entry of logs) {
    const serverName = entry.server as keyof typeof VM_PORTS;
    const port = VM_PORTS[serverName];

    if (!port) {
      console.error(`Unknown server in log: ${entry.server}`);
      remainingLogs.push(entry);
      continue;
    }

    let conn;
    try {
      console.log(`Attempting recovery for ${serverName} on port ${port}...`);
      conn = await mysql.createConnection({ ...DB_CONFIG, port });

      const query = `
        INSERT INTO title_basics (tconst, titleType, primaryTitle, startYear, runtimeMinutes)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        titleType = VALUES(titleType),
        primaryTitle = VALUES(primaryTitle),
        startYear = VALUES(startYear),
        runtimeMinutes = VALUES(runtimeMinutes)
      `;

      const { tconst, titleType, primaryTitle, startYear, runtimeMinutes } =
        entry.data;

      await conn.execute(query, [
        tconst,
        titleType,
        primaryTitle,
        startYear,
        runtimeMinutes,
      ]);
      await conn.commit();

      recoveredCount++;
      console.log(`Recovered transaction ${tconst} to ${serverName}`);
    } catch (err: any) {
      console.error(`Recovery failed for ${serverName}: ${err.message}`);
      remainingLogs.push(entry);
    } finally {
      if (conn) await conn.end();
    }
  }

  await fs.writeFile(logPath, JSON.stringify(remainingLogs, null, 2));

  return NextResponse.json({
    status: "success",
    recovered: recoveredCount,
    remaining: remainingLogs.length,
    message:
      recoveredCount > 0
        ? `Successfully recovered ${recoveredCount} transactions!`
        : "No transactions recovered.",
  });
}
