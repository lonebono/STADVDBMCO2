/**
 * STADVDB MCO2 - EVALUATION TEST SUITE
 * * USAGE:
 * 1. Run Concurrency Tests (Step 3):
 * node test-suite.js --step3
 * * 2. Run Failure Tests (Step 4 - requires manual server crashing):
 * node test-suite.js --step4 --case=1  (Node 2 -> Central Fail)
 * node test-suite.js --step4 --case=3  (Central -> Node 2 Fail)
 * node test-suite.js --step4 --recover (Run Recovery)
 */

const fs = require("fs");

// ==========================================
// CONFIGURATION
// ==========================================
// Update these IPs to match your ACTUAL Public URLs
const NODES = {
  server0: "http://ccscloud.dlsu.edu.ph:60205", // Central
  server1: "http://ccscloud.dlsu.edu.ph:60206", // Node 2 (< 1919)
  server2: "http://ccscloud.dlsu.edu.ph:60207", // Node 3 (>= 1919)
};

const LOG_FILE = "technical_report_logs.txt";

// ==========================================
// HELPERS
// ==========================================
function log(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, message + "\n");
}

function logResult(step, caseName, iter, result) {
  const timestamp = new Date().toISOString();
  const entry = `
[${timestamp}] [${step}] [${caseName}] [Iter ${iter}]
RESULT: ${JSON.stringify(result, null, 2)}
--------------------------------------------------`;
  log(entry);
}

async function sendTransaction(url, payload) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    return { error: e.message, status: "NETWORK_ERROR" };
  }
}

async function readTransaction(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    return { error: e.message, status: "NETWORK_ERROR" };
  }
}

// ==========================================
// STEP 3: CONCURRENCY TESTS (Fully Automated)
// ==========================================

async function runStep3() {
  log("\n=== STARTING STEP 3: CONCURRENCY CONTROL ===");

  for (let i = 1; i <= 3; i++) {
    log(`\n--- ITERATION ${i} ---`);

    // --- Case #1: Concurrent Reads ---
    // Node 2 and Node 3 reading the same data item simultaneously
    log("Running Case #1: Concurrent Reads...");
    const tconstRead = "tt0021000";
    const p1 = readTransaction(
      `${NODES.server1}/api/transaction/read?tconst=${tconstRead}&targetNode=central`
    );
    const p2 = readTransaction(
      `${NODES.server2}/api/transaction/read?tconst=${tconstRead}&targetNode=central`
    );

    const [res1, res2] = await Promise.all([p1, p2]);

    logResult("Step 3", "Case 1: Concurrent Reads", i, {
      node2_read: res1.status || "Failed",
      node3_read: res2.status || "Failed",
      consistent: JSON.stringify(res1.data) === JSON.stringify(res2.data),
    });

    // --- Case #2: Read-Write Conflict ---
    // One transaction writes (update) while another reads the same item
    log("Running Case #2: Read-Write Conflict...");
    const tconstRW = `tt_rw_${i}`;

    // Writer (Slow, 2s delay)
    const writePayload = {
      tconst: tconstRW,
      titleType: "short",
      primaryTitle: `Write In Progress ${i}`,
      startYear: 2025,
      runtimeMinutes: 10,
      isolationLevel: "READ COMMITTED",
      sleepTime: 2000,
    };
    const writePromise = sendTransaction(
      `${NODES.server0}/api/transaction`,
      writePayload
    );

    // Reader (Immediate - wait 500ms to ensure write started)
    await new Promise((r) => setTimeout(r, 500));
    const readRes = await readTransaction(
      `${NODES.server1}/api/transaction/read?tconst=${tconstRW}&targetNode=central`
    );
    const writeRes = await writePromise;

    logResult("Step 3", "Case 2: Read-Write Conflict", i, {
      write_status: writeRes.status,
      read_during_write: readRes.data
        ? "Dirty Read / Old Data"
        : "Clean / Blocked",
      read_value: readRes.data,
    });

    // --- Case #3: Write-Write Conflict ---
    // Two nodes writing to the same item simultaneously
    log("Running Case #3: Write-Write Conflict...");
    const tconstWW = `tt_ww_${i}`;

    const payloadA = {
      tconst: tconstWW,
      titleType: "short",
      primaryTitle: "Title From Node 1",
      startYear: 2025,
      runtimeMinutes: 10,
      isolationLevel: "SERIALIZABLE",
      sleepTime: 0,
    };
    const payloadB = {
      tconst: tconstWW,
      titleType: "short",
      primaryTitle: "Title From Node 2",
      startYear: 2025,
      runtimeMinutes: 10,
      isolationLevel: "SERIALIZABLE",
      sleepTime: 0,
    };

    // Fire from two different nodes targeting the same Central data
    const reqA = sendTransaction(`${NODES.server1}/api/transaction`, payloadA);
    const reqB = sendTransaction(`${NODES.server2}/api/transaction`, payloadB);

    const [resA, resB] = await Promise.all([reqA, reqB]);

    // Verify who won
    const finalRead = await readTransaction(
      `${NODES.server0}/api/transaction/read?tconst=${tconstWW}&targetNode=central`
    );

    logResult("Step 3", "Case 3: Write-Write Conflict", i, {
      node1_write: resA.status,
      node2_write: resB.status,
      final_winner: finalRead.data?.primaryTitle,
    });

    log("Cooldown 2s...");
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ==========================================
// STEP 4: FAILURE RECOVERY (Semi-Automated)
// ==========================================

async function runStep4(args) {
  const caseNum = args.find((a) => a.startsWith("--case="))?.split("=")[1];
  const recover = args.includes("--recover");

  if (recover) {
    log("\n=== STEP 4: TRIGGERING RECOVERY ===");
    // Try recovering on ALL nodes just to be safe
    const p0 = sendTransaction(`${NODES.server0}/api/recover`, {});
    const p1 = sendTransaction(`${NODES.server1}/api/recover`, {});
    const p2 = sendTransaction(`${NODES.server2}/api/recover`, {});

    const [r0, r1, r2] = await Promise.all([p0, p1, p2]);

    logResult("Step 4", "Recovery Action", "Manual", {
      server0_recovery: r0,
      server1_recovery: r1,
      server2_recovery: r2,
    });
    return;
  }

  if (caseNum === "1") {
    // Case 1: Node 2 (Server 1) -> Central (Server 0) fails.
    // REQUIREMENT: You must manually STOP MySQL on Server 0 before running this.
    log("\n=== STEP 4 CASE 1: Node 2 -> Central (Fail) ===");
    const payload = {
      tconst: "tt_fail_case1",
      titleType: "short",
      primaryTitle: "Should Log Locally on Node 2",
      startYear: 1910, // < 1919, belongs to Node 2 (Server 1)
      runtimeMinutes: 5,
      targetNode: "server1",
    };
    // We send this to Server 1. It will try to write to Server 0.
    const res = await sendTransaction(
      `${NODES.server1}/api/transaction`,
      payload
    );
    logResult("Step 4", "Case 1: Write Failure", 1, res);
  } else if (caseNum === "3") {
    // Case 3: Central (Server 0) -> Node 2 (Server 1) fails.
    // REQUIREMENT: You must manually STOP MySQL on Server 1 before running this.
    log("\n=== STEP 4 CASE 3: Central -> Node 2 (Fail) ===");
    const payload = {
      tconst: "tt_fail_case3",
      titleType: "short",
      primaryTitle: "Should Log Locally on Central",
      startYear: 1910, // < 1919, belongs to Node 2
      runtimeMinutes: 5,
      targetNode: "central",
    };
    // We send this to Server 0. It will try to write to Server 1.
    const res = await sendTransaction(
      `${NODES.server0}/api/transaction`,
      payload
    );
    logResult("Step 4", "Case 3: Write Failure", 1, res);
  } else {
    console.log("Please specify a valid case: --case=1 or --case=3");
    console.log(
      "For Cases 2 & 4, simply run --recover after restarting the database."
    );
  }
}

// ==========================================
// RUNNER
// ==========================================
const args = process.argv.slice(2);

if (args.includes("--step3")) {
  runStep3();
} else if (args.includes("--step4")) {
  runStep4(args);
} else {
  console.log("Usage:");
  console.log("  node test-suite.js --step3");
  console.log("  node test-suite.js --step4 --case=1");
  console.log("  node test-suite.js --step4 --case=3");
  console.log("  node test-suite.js --step4 --recover");
}
