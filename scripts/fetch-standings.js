import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const SEASON = 2026;
const NOW = new Date().toISOString();

const SOURCES = {
  official: {
    name: "中国足球职业联赛联合会官网",
    url: "https://www.cfl-china.cn/"
  },
  sina: {
    name: "新浪体育中超积分榜",
    url: "https://sports.sina.com.cn/csl/table/",
    apiUrl: "https://api.sports.sina.com.cn/?p=sports&s=sport_client&a=index&_sport_t_=football&_sport_s_=opta&_sport_a_=teamOrder&use_type=team&type=213&callback=callScoreList"
  }
};

const TEAM_META = {
  "上海申花": ["申花", "上海"],
  "上海海港": ["海港", "上海"],
  "成都蓉城": ["蓉城", "成都"],
  "北京国安": ["国安", "北京"],
  "山东泰山": ["泰山", "济南"],
  "浙江队": ["浙江", "杭州"],
  "天津津门虎": ["津门虎", "天津"],
  "武汉三镇": ["三镇", "武汉"],
  "河南队": ["河南", "郑州"],
  "青岛海牛": ["海牛", "青岛"],
  "深圳新鹏城": ["新鹏城", "深圳"],
  "青岛西海岸": ["西海岸", "青岛"],
  "长春亚泰": ["亚泰", "长春"],
  "沧州雄狮": ["雄狮", "沧州"],
  "梅州客家": ["客家", "梅州"],
  "南通支云": ["支云", "南通"],
  "云南玉昆": ["玉昆", "玉溪"],
  "大连英博": ["英博", "大连"],
  "重庆铜梁龙": ["铜梁龙", "重庆"],
  "广州队": ["广州", "广州"]
};

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} when fetching ${url}`);
  return res.text();
}

function parseNumber(val) {
  if (!val || val === "-") return 0;
  const num = Number(String(val).replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

async function fetchOfficialCfl() {
  console.log(`[official] Trying to fetch standings from ${SOURCES.official.url}`);
  const html = await getText(SOURCES.official.url);
  // CFL stands tables are typically loaded dynamically or nested in index subpages.
  // If we cannot find a clear table with standings structure, we throw to fallback.
  if (!html.includes("积分榜") || !html.includes("排名")) {
    throw new Error("CFL official page does not expose standings directly in index HTML");
  }
  throw new Error("Dynamic CFL official standings crawler not fully implemented");
}

async function fetchSinaStandings() {
  console.log(`[sina] Fetching standings from API: ${SOURCES.sina.apiUrl}`);
  const jsonp = await getText(SOURCES.sina.apiUrl);
  const match = jsonp.match(/^callScoreList\(([\s\S]+)\)\s*;?$/);
  if (!match) throw new Error("Sina standings API response is not in expected JSONP callback wrapper");
  const payload = JSON.parse(match[1]);
  const rows = Object.values(payload?.result?.data || {});
  
  if (rows.length < 8) {
    throw new Error(`Sina standings data has too few teams: ${rows.length}`);
  }

  return rows.map(row => {
    const rawTeam = row.team_cn;
    const team = rawTeam;
    const [shortName, city] = TEAM_META[team] || [team.slice(0, 3), "未标注"];
    
    // Parse form
    const form = [];
    if (row.five_score) {
      for (const char of String(row.five_score)) {
        if (char === "3") form.push("W");
        else if (char === "1") form.push("D");
        else if (char === "0") form.push("L");
      }
    }
    while (form.length < 5) form.push("W"); // fallback form items if length < 5

    return {
      rank: parseNumber(row.team_order),
      team,
      name: team,
      shortName,
      city,
      played: parseNumber(row.count),
      wins: parseNumber(row.win),
      draws: parseNumber(row.draw),
      losses: parseNumber(row.lose),
      goalsFor: parseNumber(row.goal),
      goalsAgainst: parseNumber(row.losegoal),
      goalDiff: parseNumber(row.truegoal),
      points: parseNumber(row.score),
      form: form.slice(0, 5),
      homeRecord: {
        wins: parseNumber(row.home_win),
        draws: parseNumber(row.home_draw),
        losses: parseNumber(row.home_lose),
        points: parseNumber(row.home_score)
      },
      awayRecord: {
        wins: parseNumber(row.away_win),
        draws: parseNumber(row.away_draw),
        losses: parseNumber(row.away_lose),
        points: parseNumber(row.away_score)
      }
    };
  }).sort((a, b) => a.rank - b.rank);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  let standings = null;
  let source = "";
  let sourceUrl = "";
  let isOfficial = false;
  let mode = "";

  try {
    standings = await fetchOfficialCfl();
    source = SOURCES.official.name;
    sourceUrl = SOURCES.official.url;
    isOfficial = true;
    mode = "official";
  } catch (err) {
    console.warn(`[official] Failed: ${err.message}. Falling back to Sina Sports...`);
    try {
      standings = await fetchSinaStandings();
      source = SOURCES.sina.name;
      sourceUrl = SOURCES.sina.url;
      isOfficial = false;
      mode = "fallback";
    } catch (sinaErr) {
      console.error(`[sina] Fallback failed: ${sinaErr.message}`);
      throw new Error(`Failed to crawl standings from all sources: ${sinaErr.message}`);
    }
  }

  const payload = {
    league: "csl",
    leagueName: "中超",
    season: SEASON,
    type: "standings",
    mode,
    source,
    sourceUrl,
    isOfficial,
    fetchedAt: NOW,
    status: "ok",
    disclaimer: isOfficial ? "中足联官方数据。" : "非官方 fallback 数据，如有变化，以中足联或中国足协官方公告为准。",
    data: standings
  };

  const destPath = path.join(DATA_DIR, "csl-standings.json");
  await writeFile(destPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[write] ${destPath} successfully created with ${standings.length} teams.`);
}

main().catch(err => {
  console.error(`[fatal] Standings crawl failed: ${err.stack || err.message}`);
  process.exitCode = 1;
});
