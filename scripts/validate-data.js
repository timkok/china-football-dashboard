import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const NOW = new Date().toISOString();
const EXPECTED_ROUNDS = 30;

async function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!existsSync(filePath)) {
    return { status: "missing", data: [] };
  }
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (err) {
    return { status: "error", message: `Parse error: ${err.message}`, data: [] };
  }
}

function validateStandings(payload) {
  const issues = [];
  if (payload.status === "missing") {
    return ["文件不存在或标注为缺失"];
  }
  if (payload.status === "error") {
    return [payload.message || "JSON 解析失败"];
  }
  if (!Array.isArray(payload.data)) {
    issues.push("data 字段不是数组");
    return issues;
  }
  if (payload.data.length < 8) {
    issues.push(`球队数量太少: ${payload.data.length} 支`);
  }
  
  payload.data.forEach((row, index) => {
    if (!row.team && !row.name) {
      issues.push(`第 ${index + 1} 行缺少队名(team/name)`);
    }
    const requiredNum = ["played", "points", "wins", "draws", "losses", "goalsFor", "goalsAgainst", "goalDiff"];
    for (const field of requiredNum) {
      if (typeof row[field] !== "number" || Number.isNaN(row[field])) {
        issues.push(`第 ${index + 1} 行球队 ${row.team || row.name || ""} 字段 ${field} 不是有效数值`);
      }
    }
  });

  return issues;
}

function scheduleCompleteness(fixturesPayload) {
  if (fixturesPayload.status === "missing" || fixturesPayload.status === "error") {
    return {
      expectedRounds: EXPECTED_ROUNDS,
      fetchedRounds: [],
      fetchedRoundsCount: 0,
      missingRounds: Array.from({ length: EXPECTED_ROUNDS }, (_, i) => i + 1),
      anomalyCount: 0,
      anomalies: []
    };
  }

  const fixtures = fixturesPayload.data || [];
  const rounds = [...new Set(fixtures.map(match => Number(match.round)).filter(Number.isFinite))].sort((a, b) => a - b);
  const missingRounds = Array.from({ length: EXPECTED_ROUNDS }, (_, index) => index + 1).filter(round => !rounds.includes(round));
  const seen = new Set();
  const anomalies = [];

  fixtures.forEach(match => {
    if (!match.date) {
      anomalies.push({ type: "missing_time", match: match.id || `${match.homeTeam}-${match.awayTeam}` });
    }
    if (match.status === "finished" && (match.homeScore === null || match.awayScore === null)) {
      anomalies.push({ type: "finished_without_score", match: match.id || `${match.homeTeam}-${match.awayTeam}` });
    }
    const key = `${match.round}|${match.homeTeam}|${match.awayTeam}|${match.date}`;
    if (seen.has(key)) {
      anomalies.push({ type: "duplicate_match", match: key });
    }
    seen.add(key);
  });

  return {
    expectedRounds: EXPECTED_ROUNDS,
    fetchedRounds: rounds,
    fetchedRoundsCount: rounds.length,
    missingRounds,
    anomalyCount: anomalies.length,
    anomalies
  };
}

async function main() {
  const leagues = {};
  const issues = [];

  // Validate Leagues
  for (const league of ["csl", "cl1", "cl2"]) {
    const standings = await readJson(`${league}-standings.json`);
    const fixtures = await readJson(`${league}-fixtures.json`);

    const standingsIssues = validateStandings(standings);
    if (standingsIssues.length && standings.status !== "missing") {
      issues.push({ league, type: "standings", issues: standingsIssues });
    }

    leagues[league] = {
      standings: standings.status === "missing" ? "missing" : (standingsIssues.length ? "warning" : standings.mode || "ok"),
      fixtures: fixtures.status === "missing" ? "missing" : (fixtures.mode || "ok"),
      scheduleCompleteness: scheduleCompleteness(fixtures)
    };
  }

  // Validate CSL Attendance
  const attendance = await readJson("csl-attendance.json");
  if (attendance.status === "missing") {
    issues.push({ league: "csl", type: "attendance", issues: ["csl-attendance.json 缺失"] });
  } else if (attendance.status === "error") {
    issues.push({ league: "csl", type: "attendance", issues: [attendance.message] });
  } else if (!Array.isArray(attendance.teams) || attendance.teams.length < 8) {
    issues.push({ league: "csl", type: "attendance", issues: ["attendance.teams 球队数据少于 8 支"] });
  }

  // Validate History
  const history = await readJson("csl-attendance-history.json");
  if (history.status === "missing") {
    issues.push({ league: "csl", type: "history", issues: ["csl-attendance-history.json 缺失"] });
  } else if (history.status === "error") {
    issues.push({ league: "csl", type: "history", issues: [history.message] });
  } else if (!Array.isArray(history.seasons) || history.seasons.length < 3) {
    issues.push({ league: "csl", type: "history", issues: ["attendance-history.seasons 数据少于 3 个赛季"] });
  }

  const payload = {
    generatedAt: NOW,
    status: issues.length ? "warning" : "ok",
    expectedRounds: EXPECTED_ROUNDS,
    leagues,
    issues
  };

  await writeFile(path.join(DATA_DIR, "data-quality.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[write] data/data-quality.json: ${payload.status}`);
}

main().catch(error => {
  console.error(`[fatal] ${error.stack || error.message}`);
  process.exitCode = 1;
});
