// STADVDB MCO2 TEST SCRIPT
// run node test-suite.js in webapp folder
// does three cases per iso level, makes 4 log files per iso level
// does one case for failure recovery, makes 1 log file

const fs = require("fs");
const readline = require("readline");

// 1. Config

const NODES = {
  server0: "http://ccscloud.dlsu.edu.ph:60205", // Central
  server1: "http://ccscloud.dlsu.edu.ph:60206", // < 1919
  server2: "http://ccscloud.dlsu.edu.ph:60207", // >= 1919
};

// 2. Helpers
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askUser = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

function getConcurrencyFileName(isoLevel) {
  return `technical_report_concurrency_${isoLevel
    .toLowerCase()
    .replace(/ /g, "_")}.txt`;
}

function log(filename, message) {
  console.log(message);
  fs.appendFileSync(filename, message + "\n");
}

function logResult(filename, iter, caseName, result) {
  const timestamp = new Date().toISOString();
  const entry = `
[${timestamp}] [Iter ${iter}] [${caseName}]
STATUS: ${JSON.stringify(result, null, 2)}
--------------------------------------------------`;
  log(filename, entry);
}

async function sendRequest(url, method, body = null) {
  try {
    const options = {
      method: method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return await res.json();
  } catch (e) {
    return { error: e.message, status: "NETWORK_ERROR" };
  }
}

// 3. Concurrency
async function testConcurrency(isoLevel) {
  const filename = getConcurrencyFileName(isoLevel);
  fs.writeFileSync(
    filename,
    `CONCURRENCY LOGS - ${isoLevel}\nDate: ${new Date().toISOString()}\n================================\n`
  );

  console.log(`\n>>> STARTING BATCH: ${isoLevel} <<<`);
  console.log(`Logs -> ${filename}`);

  // run 3 Iterations per Isolation Level
  for (let i = 1; i <= 3; i++) {
    log(filename, `\n--- ITERATION ${i} ---`);

    // Case 1: Concurrent Reads
    const tconstRead = "tt0021000";
    const p1 = sendRequest(
      `${NODES.server1}/api/transaction/read?tconst=${tconstRead}&targetNode=central&isolationLevel=${isoLevel}`,
      "GET"
    );
    const p2 = sendRequest(
      `${NODES.server2}/api/transaction/read?tconst=${tconstRead}&targetNode=central&isolationLevel=${isoLevel}`,
      "GET"
    );
    const [res1, res2] = await Promise.all([p1, p2]);

    logResult(filename, i, "Case 1: Concurrent Reads", {
      node2: res1.status || "Failed",
      node3: res2.status || "Failed",
      consistent: JSON.stringify(res1.data) === JSON.stringify(res2.data),
    });

    // Case 2: Read-Write Conflict
    const tconstRW = `tt_rw_${isoLevel.substring(0, 3)}_${i}`;
    const writePayload = {
      tconst: tconstRW,
      titleType: "test",
      primaryTitle: `Locked ${i} (${isoLevel})`,
      startYear: 2025,
      runtimeMinutes: 10,
      isolationLevel: isoLevel,
      sleepTime: 2000,
    };
    const writePromise = sendRequest(
      `${NODES.server0}/api/transaction`,
      "POST",
      writePayload
    );

    await new Promise((r) => setTimeout(r, 500));
    const readRes = await sendRequest(
      `${NODES.server1}/api/transaction/read?tconst=${tconstRW}&targetNode=central`,
      "GET"
    );
    const writeRes = await writePromise;

    logResult(filename, i, "Case 2: Read-Write Conflict", {
      write_status: writeRes.status,
      read_outcome: readRes.data ? "Saw Data (Dirty/Old)" : "Blocked/Empty",
    });

    // Case 3: Write-Write Conflict
    const tconstWW = `tt_ww_${isoLevel.substring(0, 3)}_${i}`;
    const payA = {
      tconst: tconstWW,
      titleType: "test",
      primaryTitle: "Server 0 Win",
      startYear: 2025,
      runtimeMinutes: 10,
      isolationLevel: isoLevel,
      sleepTime: 0,
    };
    const payB = {
      tconst: tconstWW,
      titleType: "test",
      primaryTitle: "Server 1 Win",
      startYear: 2025,
      runtimeMinutes: 10,
      isolationLevel: isoLevel,
      sleepTime: 0,
    };

    const reqA = sendRequest(`${NODES.server1}/api/transaction`, "POST", payA);
    const reqB = sendRequest(`${NODES.server2}/api/transaction`, "POST", payB);
    const [rA, rB] = await Promise.all([reqA, reqB]);

    const finalRead = await sendRequest(
      `${NODES.server0}/api/transaction/read?tconst=${tconstWW}`,
      "GET"
    );

    logResult(filename, i, "Case 3: Write-Write Conflict", {
      node1: rA.status,
      node2: rB.status,
      winner: finalRead.data?.primaryTitle,
    });

    await new Promise((r) => setTimeout(r, 1000)); // Cool down between iters
  }
}

// 4. Failure & Recovery
async function testFailRecov(iter) {
  const filename = "technical_report_failure.txt";

  // Only initialize file on first iteration
  if (iter === 1) {
    fs.writeFileSync(
      filename,
      `FAILURE RECOVERY LOGS\nDate: ${new Date().toISOString()}\n================================\n`
    );
  }

  console.log(`\n>>> STARTING FAILURE RECOVERY ITERATION ${iter} <<<`);
  log(filename, `\n--- ITERATION ${iter} ---`);

  // SCENARIO 1: Central Fails (Cases 1 & 2)
  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please STOP MySQL on SERVER 0 (Central). Press [Enter] when done..."
  );

  log(filename, "Running Case #1: Node 2 -> Central (Write Failure)...");
  const payloadCase1 = {
    tconst: `tt_fail_c1_${iter}`,
    titleType: "test",
    primaryTitle: "Log Local Node 2",
    startYear: 1910,
    runtimeMinutes: 5,
    targetNode: "server1",
  };
  const resCase1 = await sendRequest(
    `${NODES.server1}/api/transaction`,
    "POST",
    payloadCase1
  );
  logResult(filename, iter, "Case 1: Write Failure", resCase1);

  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please START MySQL on SERVER 0 (Central). Press [Enter] when done..."
  );

  log(filename, "Running Case #2: Central Recovery...");
  const resCase2 = await sendRequest(
    `${NODES.server1}/api/recover`,
    "POST",
    {}
  );
  logResult(filename, iter, "Case 2: Recovery Process", resCase2);

  // SCENARIO 2: Node 2 Fails (Cases 3 & 4)
  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please STOP MySQL on SERVER 1 (Node 2). Press [Enter] when done..."
  );

  log(filename, "Running Case #3: Central -> Node 2 (Write Failure)...");
  const payloadCase3 = {
    tconst: `tt_fail_c3_${iter}`,
    titleType: "test",
    primaryTitle: "Log Local Central",
    startYear: 1910,
    runtimeMinutes: 5,
    targetNode: "central",
  };
  const resCase3 = await sendRequest(
    `${NODES.server0}/api/transaction`,
    "POST",
    payloadCase3
  );
  logResult(filename, iter, "Case 3: Write Failure", resCase3);

  console.log("\n[ACTION REQUIRED]");
  await askUser(
    ">>> Please START MySQL on SERVER 1 (Node 2). Press [Enter] when done..."
  );

  log(filename, "Running Case #4: Node 2 Recovery...");
  const resCase4 = await sendRequest(
    `${NODES.server0}/api/recover`,
    "POST",
    {}
  );
  logResult(filename, iter, "Case 4: Recovery Process", resCase4);
}

// 5. MAIN RUNNER
async function main() {
  console.log("MCO2 TEST SCRIPT");
  console.log("This will generate 5 log files in total.");

  // Run Step 3 for all 4 Isolation Levels
  const isoLevels = [
    "READ UNCOMMITTED",
    "READ COMMITTED",
    "REPEATABLE READ",
    "SERIALIZABLE",
  ];

  for (const level of isoLevels) {
    await testConcurrency(level);
  }

  for (let i = 1; i <= 3; i++) {
    await testFailRecov(i);
  }

  console.log("\n🎉 ALL TESTS COMPLETED 🎉");
  console.log("Files Generated:");
  isoLevels.forEach((l) => console.log(`- ${getConcurrencyFileName(l)}`));
  console.log(`- technical_report_failure.txt`);

  rl.close();
}

main();
