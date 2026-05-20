import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const NOW = new Date().toISOString();

async function readJson(fileName, fallback = null) {
  const file = path.join(DATA_DIR, fileName);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    return fallback;
  }
}

async function main() {
  const csl = await readJson("csl-standings.json") || { source: "", sourceUrl: "" };
  const attendance = await readJson("csl-attendance.json") || { source: "", sourceUrl: "" };

  const payload = {
    generatedAt: NOW,
    status: "ok",
    comparisons: [
      {
        fieldGroup: "standings",
        league: "csl",
        primarySource: csl.source || "新浪体育中超积分榜",
        primarySourceUrl: csl.sourceUrl || "https://sports.sina.com.cn/csl/table/",
        comparedSources: [],
        conflicts: [],
        note: "当前积分榜只有一个可解析结构化来源；发现第二来源后将逐字段比对排名和积分。"
      },
      {
        fieldGroup: "attendance",
        league: "csl",
        primarySource: attendance.source || "Transfermarkt",
        primarySourceUrl: attendance.sourceUrl || "https://www.transfermarkt.com/chinese-super-league/besucherzahlen/wettbewerb/CSL",
        comparedSources: [],
        conflicts: [],
        note: "观众人数当前使用 Transfermarkt 单源数据；后续接入 FootyStats 后比对总观众、场均观众和上座率。"
      }
    ]
  };

  const destPath = path.join(DATA_DIR, "source-comparison.json");
  await writeFile(destPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[write] ${destPath} successfully generated.`);
}

main().catch(error => {
  console.error(`[fatal] ${error.stack || error.message}`);
  process.exitCode = 1;
});
