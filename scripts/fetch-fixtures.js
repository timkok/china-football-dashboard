import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const SEASON = 2026;

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  // Tries official CFL crawler. Since official data is currently not parsed,
  // we default to writing the specified "missing" payload.
  const payload = {
    league: "csl",
    leagueName: "中超",
    season: SEASON,
    type: "fixtures",
    mode: "real-data-only",
    source: "",
    sourceUrl: "",
    isOfficial: false,
    fetchedAt: null,
    status: "missing",
    message: "暂无真实赛程数据，等待官方或稳定数据源接入。",
    data: []
  };

  const destPath = path.join(DATA_DIR, "csl-fixtures.json");
  await writeFile(destPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[write] ${destPath} created (status: missing).`);
}

main().catch(err => {
  console.error(`[fatal] Fixtures crawl failed: ${err.stack || err.message}`);
  process.exitCode = 1;
});
