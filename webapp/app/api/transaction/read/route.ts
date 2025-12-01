import { NextRequest, NextResponse } from 'next/server';
import mysql, { RowDataPacket } from 'mysql2/promise';

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  const tconst = searchParams.get('tconst') || 'tt0000001';
  const targetNode = searchParams.get('targetNode') || 'central'; 
  const isolationLevel = searchParams.get('isolationLevel') || 'READ COMMITTED';

  let port = VM_PORTS['server0']; 
  if (targetNode === 'server1') port = VM_PORTS['server1'];
  if (targetNode === 'server2') port = VM_PORTS['server2'];

  if (!port) {
      return NextResponse.json({ error: 'Invalid target node' }, { status: 400 });
  }

  let conn;
  try {
    conn = await mysql.createConnection({ ...DB_CONFIG, port });

    await conn.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    await conn.beginTransaction();

    const [rows] = await conn.execute<RowDataPacket[]>(
      'SELECT tconst, primaryTitle, startYear, runtimeMinutes FROM title_basics WHERE tconst = ?', 
      [tconst]
    );

    await conn.commit();

    return NextResponse.json({ 
        status: 'success', 
        node: targetNode, 
        data: rows[0] || null,
        isolationLevel 
    });

  } catch (err: any) {
    if (conn) await conn.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}