// STADVDB MCO2 - COMPLETE TEST SCRIPT
// - runs three iterations
// - iterates sequentially
// - creates three log files
// - use node test-suite.js to run

const fs = require("fs");
const readline = require("readline");

// 1. CONFIGURATION (Public Cloud URLs)
const NODES = {
  server0: "http://ccscloud.dlsu.edu.ph:60205", // Central Node
  server1: "http://ccscloud.dlsu.edu.ph:60206", // Node 2 (< 1919)
  server2: "http://ccscloud.dlsu.edu.ph:60207", // Node 3 (>= 1919)
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

    // timeout after 5 seconds
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
  const filename = `technical_report_iter_${iter}.txt`;
  fs.writeFileSync(
    filename,
    `MCO2 LOGS - ITERATION ${iter}\nDate: ${new Date().toISOString()}\n================================\n`
  );

  console.log(`\n\n=== STARTING ITERATION ${iter} ===`);
  console.log(`Logs will be saved to: ${filename}`);

  // STEP 3: CONCURRENCY CONTROL
  log(iter, "\n--- CONCURRENCY CONTROL ---");

  // Case 1: Concurrent Reads
  log(iter, "Running Case #1: Concurrent Reads (Server1 & Server2)...");
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
    server1_read_status: res1.status || "Failed",
    server2_read_status: res2.status || "Failed",
    data_match: JSON.stringify(res1.data) === JSON.stringify(res2.data),
  });

  // Case 2: Read-Write Conflict
  log(iter, "Running Case #2: Read-Write Conflict...");
  const tconstRW = `tt_rw_${iter}`;
  // slow write on server0
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

  // quick read from server1
  await new Promise((r) => setTimeout(r, 500));
  const readRes = await sendRequest(
    `${NODES.server1}/api/transaction/read?tconst=${tconstRW}&targetNode=central`,
    "GET"
  );
  const writeRes = await writePromise;

  logResult(iter, "Step 3", "Case 2: Read-Write Conflict", {
    write_status: writeRes.status,
    read_outcome: readRes.data ? "Saw Data (Dirty/Old)" : "Blocked/Empty",
  });

  // Case 3: Write-Write Conflict
  log(iter, "Running Case #3: Write-Write Conflict...");
  const tconstWW = `tt_ww_${iter}`;
  const payA = {
    tconst: tconstWW,
    titleType: "test",
    primaryTitle: "Server1 Win",
    startYear: 2025,
    runtimeMinutes: 10,
    isolationLevel: "SERIALIZABLE",
  };
  const payB = {
    tconst: tconstWW,
    titleType: "test",
    primaryTitle: "Server2 Win",
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
    server1_write_status: rA.status,
    server2_write_status: rB.status,
    final_winner_in_db: finalRead.data?.primaryTitle,
  });

  // STEP 4: FAILURE RECOVERY
  log(iter, "\n--- STEP 4: GLOBAL FAILURE RECOVERY ---");

  // Scenario 1: Server0 Fails
  //  Case 1 & Case 2
  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please STOP MySQL on SERVER 0. Press [Enter] when done..."
  );

  log(iter, "Running Case #1: Server1 -> Server0 (Write Failure)...");
  const payloadCase1 = {
    tconst: `tt_case1_${iter}`,
    titleType: "test",
    primaryTitle: "Log Local Server1",
    startYear: 1910, // < 1919 should be at server1
    runtimeMinutes: 5,
    targetNode: "server1", // started at server1
  };
  // send to server1. tries to write to server0. server0 is down.
  const resCase1 = await sendRequest(
    `${NODES.server1}/api/transaction`,
    "POST",
    payloadCase1
  );

  logResult(iter, "Step 4", "Case 1: Write Failure", {
    initiator: "Server1",
    target_down: "Server0",
    response_status: resCase1.status, // should be partial_failure or success
    message: resCase1.message,
  });

  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please START MySQL on SERVER 0. Press [Enter] when done..."
  );

  log(iter, "Running Case #2: Server0 Recovery...");
  // trigger recovery on server1 as log is stored there
  const resCase2 = await sendRequest(
    `${NODES.server1}/api/recover`,
    "POST",
    {}
  );

  logResult(iter, "Step 4", "Case 2: Recovery Process", {
    recovering_node: "Server0",
    source_of_logs: "Server1",
    recovered_count: resCase2.recovered,
    message: resCase2.message,
  });

  // Scenario 2: Server1 Fails
  // Covers Case 3 & Case 4
  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please STOP MySQL on SERVER 1. Press [Enter] when done..."
  );

  log(iter, "Running Case #3: Server0 -> Server1 (Write Failure)...");
  const payloadCase3 = {
    tconst: `tt_case3_${iter}`,
    titleType: "test",
    primaryTitle: "Log Local Server0",
    startYear: 1910, // < 1919 shold be at server1
    runtimeMinutes: 5,
    targetNode: "central", // started at Server0
  };
  // send to server0. tries to write to server1. server1 is down.
  const resCase3 = await sendRequest(
    `${NODES.server0}/api/transaction`,
    "POST",
    payloadCase3
  );

  logResult(iter, "Step 4", "Case 3: Write Failure", {
    initiator: "Server0",
    target_down: "Server1",
    response_status: resCase3.status,
    message: resCase3.message,
  });

  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please START MySQL on SERVER 1. Press [Enter] when done..."
  );

  log(iter, "Running Case #4: Server1 Recovery...");
  // trigger recovery on server0 as log is stored there
  const resCase4 = await sendRequest(
    `${NODES.server0}/api/recover`,
    "POST",
    {}
  );

  logResult(iter, "Step 4", "Case 4: Recovery Process", {
    recovering_node: "Server1",
    source_of_logs: "Server0",
    recovered_count: resCase4.recovered,
    message: resCase4.message,
  });

  console.log(`\n[SUCCESS] ITERATION ${iter} COMPLETE`);
}

// 4. MAIN RUN
async function main() {
  console.log("STADVDB MCO2 Test Script");
  console.log("Run 3 Full Iterations (Step 3 & 4)");

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
