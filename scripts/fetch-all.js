import { fork } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const NOW = new Date().toISOString();

const SCRIPTS = [
  { name: "fetch-standings.js", path: "./scripts/fetch-standings.js" },
  { name: "fetch-attendance.js", path: "./scripts/fetch-attendance.js" },
  { name: "fetch-attendance-history.js", path: "./scripts/fetch-attendance-history.js" },
  { name: "fetch-official-feed.js", path: "./scripts/fetch-official-feed.js" }
];

function runScript(scriptPath) {
  return new Promise((resolve) => {
    const processPath = path.resolve(ROOT, scriptPath);
    console.log(`[orchestrator] Running ${scriptPath}...`);
    const child = fork(processPath, [], { silent: true });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      console.log(`[orchestrator] Script ${scriptPath} exited with code ${code}`);
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const logs = [];
  let overallStatus = "ok";

  for (const item of SCRIPTS) {
    try {
      const result = await runScript(item.path);
      const ok = result.code === 0;
      if (!ok) {
        overallStatus = "warning";
      }
      logs.push({
        script: item.name,
        status: ok ? "ok" : "error",
        exitCode: result.code,
        message: ok ? "Executed successfully." : result.stderr || "Script exited with non-zero code."
      });
    } catch (err) {
      overallStatus = "warning";
      logs.push({
        script: item.name,
        status: "error",
        message: err.message
      });
    }
  }

  const logPayload = {
    lastRunAt: NOW,
    status: overallStatus,
    logs
  };

  const destPath = path.join(DATA_DIR, "fetch-log.json");
  await writeFile(destPath, JSON.stringify(logPayload, null, 2) + "\n");
  console.log(`[orchestrator] fetch-log.json written. Status: ${overallStatus}`);
}

main().catch(err => {
  console.error(`[fatal] Orchestrator failed: ${err.stack || err.message}`);
  process.exitCode = 1;
});
