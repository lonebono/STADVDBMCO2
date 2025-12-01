import { NextRequest, NextResponse } from 'next/server';
import mysql, { RowDataPacket } from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

const VM_PORTS = {
  server0: Number(process.env.SERVER0_PORT), //node 1
  server1: Number(process.env.SERVER1_PORT), //node 2
  server2: Number(process.env.SERVER2_PORT), //node 3
};

const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const FRAGMENTATION_YEAR = 1919;

//main post handler
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    tconst, titleType, primaryTitle, startYear, runtimeMinutes,
    isolationLevel = 'READ COMMITTED', 
    sleepTime = 0, 
    targetNode = 'central'
  } = body;
  
  let primaryServer: keyof typeof VM_PORTS;
  let replicaServer: keyof typeof VM_PORTS;

    //determine primary and fragment servers based on targetNode and startYear
  if (targetNode === 'central') {
    primaryServer = 'server0';
    replicaServer = (startYear < FRAGMENTATION_YEAR) ? 'server1' : 'server2';
  } else {
    primaryServer = (startYear < FRAGMENTATION_YEAR) ? 'server1' : 'server2';
    replicaServer = 'server0';
  }

  try {
    await executeTransaction(primaryServer, body, isolationLevel, sleepTime);
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: `Primary ${primaryServer} failed`, details: err.message }, { status: 500 });
  }

  try {
    await executeTransaction(replicaServer, { ...body, sleepTime: 0 }, 'READ COMMITTED', 0);
  } catch (err: any) {
    console.error(`Replication to ${replicaServer} failed. Logging for recovery.`);
    await logForRecovery(replicaServer, body); 
    return NextResponse.json({ status: 'partial_success', message: 'Primary ok, Replica failed (saved to log)' });
  }

  return NextResponse.json({ status: 'success', primary: primaryServer, replica: replicaServer });
}

//database transaction execution
async function executeTransaction(serverKey: keyof typeof VM_PORTS, data: any, isoLevel: string, sleep: number) {
  const port = VM_PORTS[serverKey];
  if (!port) throw new Error(`Invalid port for ${serverKey}`);

  const conn = await mysql.createConnection({ ...DB_CONFIG, port });

  try {
    await conn.query(`SET TRANSACTION ISOLATION LEVEL ${isoLevel}`);
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
      data.tconst, data.titleType, data.primaryTitle, data.startYear, data.runtimeMinutes
    ]);

    //delay
    if (sleep > 0) {
      console.log(`[${serverKey}] Sleeping for ${sleep}ms...`);
      await new Promise(r => setTimeout(r, sleep));
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

//logging for recovery
async function logForRecovery(failedServer: string, data: any) {
  const logPath = path.join(process.cwd(), 'recovery_log.json');
  const entry = {
    server: failedServer,
    data,
    timestamp: new Date().toISOString()
  };

  let logs = [];
  try {
    const fileContent = await fs.readFile(logPath, 'utf-8');
    logs = JSON.parse(fileContent);
  } catch (e) { /*ignore error*/ }

  logs.push(entry);
  await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
}