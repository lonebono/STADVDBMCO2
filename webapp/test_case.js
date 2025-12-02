/**
 * STADVDB MCO2 - COMPLETE EVALUATION SUITE
 * * BEHAVIOR:
 * - Runs 3 Full Iterations.
 * - In each iteration: Runs Step 3 (Concurrency) -> Step 4 (Failure).
 * - Creates a NEW log file for each iteration (iter_1.txt, iter_2.txt, iter_3.txt).
 * * USAGE:
 * node test-suite.js
 */

const fs = require("fs");
const readline = require("readline");

// 1. CONFIGURATION (Public Cloud URLs)

const NODES = {
  server0: "http://ccscloud.dlsu.edu.ph:60205", // Central
  server1: "http://ccscloud.dlsu.edu.ph:60206", // Node 2
  server2: "http://ccscloud.dlsu.edu.ph:60207", // Node 3
};

// 2. HELPERS

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askUser = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

function logToFile(iter, text) {
  const filename = `technical_report_iter_${iter}.txt`;
  fs.appendFileSync(filename, text + "\n");
}

function log(iter, message) {
  console.log(message);
  logToFile(iter, message);
}

function logResult(iter, step, caseName, data) {
  const timestamp = new Date().toISOString();
  const entry = `
[${timestamp}] [${step}] [${caseName}]
STATUS: ${JSON.stringify(data, null, 2)}
--------------------------------------------------`;
  log(iter, entry);
}

// HTTP Helpers
async function sendRequest(url, method, body = null) {
  try {
    const options = {
      method: method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    // Timeout to prevent hanging if server is totally dead (not just DB)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return await res.json();
  } catch (e) {
    return { error: e.message, status: "NETWORK_ERROR" };
  }
}

// 3. TEST LOGIC

async function runIteration(iter) {
  // Reset/Create Log File for this iteration
  const filename = `technical_report_iter_${iter}.txt`;
  fs.writeFileSync(
    filename,
    `MCO2 LOGS - ITERATION ${iter}\nDate: ${new Date().toISOString()}\n================================\n`
  );

  console.log(`\n\n=== STARTING ITERATION ${iter} ===`);
  console.log(`Logs will be saved to: ${filename}`);

  // -------------------------------------------------
  // STEP 3: CONCURRENCY (Automated)
  // -------------------------------------------------
  log(iter, "\n--- STEP 3: CONCURRENCY CONTROL ---");

  // Case 1: Concurrent Reads
  log(iter, "Running Case #1: Concurrent Reads (Node 2 & 3)...");
  const tconstRead = "tt0021000";
  const p1 = sendRequest(
    `${NODES.server1}/api/transaction/read?tconst=${tconstRead}&targetNode=central`,
    "GET"
  );
  const p2 = sendRequest(
    `${NODES.server2}/api/transaction/read?tconst=${tconstRead}&targetNode=central`,
    "GET"
  );
  const [res1, res2] = await Promise.all([p1, p2]);

  logResult(iter, "Step 3", "Case 1: Concurrent Reads", {
    node2_status: res1.status || "Failed",
    node3_status: res2.status || "Failed",
    match: JSON.stringify(res1.data) === JSON.stringify(res2.data),
  });

  // Case 2: Read-Write Conflict
  log(iter, "Running Case #2: Read-Write Conflict...");
  const tconstRW = `tt_rw_${iter}`;
  // Start Slow Write
  const writePayload = {
    tconst: tconstRW,
    titleType: "test",
    primaryTitle: `Locked ${iter}`,
    startYear: 2025,
    runtimeMinutes: 10,
    isolationLevel: "READ COMMITTED",
    sleepTime: 2000,
  };
  const writePromise = sendRequest(
    `${NODES.server0}/api/transaction`,
    "POST",
    writePayload
  );

  // Immediate Read
  await new Promise((r) => setTimeout(r, 500));
  const readRes = await sendRequest(
    `${NODES.server1}/api/transaction/read?tconst=${tconstRW}&targetNode=central`,
    "GET"
  );
  const writeRes = await writePromise;

  logResult(iter, "Step 3", "Case 2: Read-Write Conflict", {
    write_status: writeRes.status,
    read_data: readRes.data ? "Saw Data (Dirty/Old)" : "Blocked/Empty",
  });

  // Case 3: Write-Write Conflict
  log(iter, "Running Case #3: Write-Write Conflict...");
  const tconstWW = `tt_ww_${iter}`;
  const payA = {
    tconst: tconstWW,
    titleType: "test",
    primaryTitle: "Node 1 Win",
    startYear: 2025,
    runtimeMinutes: 10,
    isolationLevel: "SERIALIZABLE",
  };
  const payB = {
    tconst: tconstWW,
    titleType: "test",
    primaryTitle: "Node 2 Win",
    startYear: 2025,
    runtimeMinutes: 10,
    isolationLevel: "SERIALIZABLE",
  };

  const reqA = sendRequest(`${NODES.server1}/api/transaction`, "POST", payA);
  const reqB = sendRequest(`${NODES.server2}/api/transaction`, "POST", payB);
  const [rA, rB] = await Promise.all([reqA, reqB]);

  const finalRead = await sendRequest(
    `${NODES.server0}/api/transaction/read?tconst=${tconstWW}`,
    "GET"
  );

  logResult(iter, "Step 3", "Case 3: Write-Write Conflict", {
    node1_write: rA.status,
    node2_write: rB.status,
    winner: finalRead.data?.primaryTitle,
  });

  // -------------------------------------------------
  // STEP 4: FAILURE & RECOVERY (Interactive)
  // -------------------------------------------------
  log(iter, "\n--- STEP 4: FAILURE RECOVERY ---");

  // SCENARIO A: Node 2 (Server 1) Fails (Covers Case 3 & 4)
  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please STOP MySQL on SERVER 1 (Node 2). Press [Enter] when done..."
  );

  log(iter, "Running Case #3: Write to Central -> Node 2 (Should Fail)...");
  const failPayload = {
    tconst: `tt_fail_n2_${iter}`,
    titleType: "test",
    primaryTitle: "Logged on Central",
    startYear: 1910, // < 1919 (Target: Node 2)
    runtimeMinutes: 5,
    targetNode: "central",
  };
  const resFail = await sendRequest(
    `${NODES.server0}/api/transaction`,
    "POST",
    failPayload
  );
  logResult(iter, "Step 4", "Case 3: Write Failure (Node 2 Down)", resFail);

  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please START MySQL on SERVER 1 (Node 2). Press [Enter] when done..."
  );

  log(iter, "Running Case #4: Recover Node 2...");
  // We trigger recovery on Central (Server 0) because that's where the log is stored
  const resRecover = await sendRequest(
    `${NODES.server0}/api/recover`,
    "POST",
    {}
  );
  logResult(iter, "Step 4", "Case 4: Recovery (Central -> Node 2)", resRecover);

  // Central Fails: Case 1 & 2
  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please STOP MySQL on SERVER 0 (Central). Press [Enter] when done..."
  );

  log(iter, "Running Case #1: Write to Node 2 -> Central (Should Fail)...");
  const failPayload2 = {
    tconst: `tt_fail_c_${iter}`,
    titleType: "test",
    primaryTitle: "Logged on Node 2",
    startYear: 1910, // < 1919 (target: server1)
    runtimeMinutes: 5,
    targetNode: "server1",
  };
  // send to server 1
  const resFail2 = await sendRequest(
    `${NODES.server1}/api/transaction`,
    "POST",
    failPayload2
  );
  logResult(iter, "Step 4", "Case 1: Write Failure (Central Down)", resFail2);

  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please START MySQL on SERVER 0 (Central). Press [Enter] when done..."
  );

  log(iter, "Running Case #2: Recover Central...");
  // trigger recovery on Server 1 because log is stored locally
  const resRecover2 = await sendRequest(
    `${NODES.server1}/api/recover`,
    "POST",
    {}
  );
  logResult(
    iter,
    "Step 4",
    "Case 2: Recovery (Node 2 -> Central)",
    resRecover2
  );

  console.log(`\n[SUCCESS] ITERATION ${iter} COMPLETE`);
}

// 4. MAIN EXECUTION

async function main() {
  console.log("STADVDB MCO2 Evaluation Suite");
  console.log("Running 3 Full Iterations (Step 3 & 4)");

  for (let i = 1; i <= 3; i++) {
    await runIteration(i);
    if (i < 3) {
      console.log("...Cooling down (2s)...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("\n=== ALL TESTS FINISHED ===");
  console.log("Files generated:");
  console.log("- technical_report_iter_1.txt");
  console.log("- technical_report_iter_2.txt");
  console.log("- technical_report_iter_3.txt");
  rl.close();
}

main();
