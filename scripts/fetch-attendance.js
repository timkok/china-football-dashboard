import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const SEASON = 2026;
const NOW = new Date().toISOString();

const SOURCES = [
  {
    name: "Transfermarkt",
    url: "https://www.transfermarkt.com/chinese-super-league/besucherzahlen/wettbewerb/CSL"
  },
  {
    name: "Transfermarkt UK",
    url: "https://www.transfermarkt.co.uk/chinese-super-league/besucherzahlen/wettbewerb/CSL"
  },
  {
    name: "Transfermarkt JP",
    url: "https://www.transfermarkt.jp/chinese-super-league/besucherzahlen/wettbewerb/CSL"
  }
];

const TEAM_CN = {
  "Dalian Yingbo": "大连英博",
  "Beijing Guoan": "北京国安",
  "Shanghai Shenhua": "上海申花",
  "Chengdu Rongcheng": "成都蓉城",
  "Chongqing Tonglianglong": "重庆铜梁龙",
  "Shandong Taishan": "山东泰山",
  "Qingdao Hainiu": "青岛海牛",
  "Zhejiang FC": "浙江队",
  "Tianjin Jinmen Tiger": "天津津门虎",
  "Liaoning Tieren": "辽宁铁人",
  "Shanghai Port": "上海海港",
  "Yunnan Yukun": "云南玉昆",
  "Henan FC": "河南队",
  "Wuhan Three Towns": "武汉三镇",
  "Shenzhen Peng City": "深圳新鹏城",
  "Qingdao West Coast": "青岛西海岸",
  "Cangzhou Mighty Lions": "沧州雄狮",
  "Changchun Yatai": "长春亚泰",
  "Meizhou Hakka": "梅州客家",
  "Nantong Zhiyun": "南通支云"
};

const STADIUM_CN = {
  "Dalian Suoyuwan Football Stadium": "大连梭鱼湾足球场",
  "Workers Stadium": "北京工人体育场",
  "Shanghai Stadium": "上海体育场",
  "Phoenix Hill Sports Park Football Stadium": "凤凰山体育公园专业足球场",
  "Chongqing Longxing Football Stadium": "重庆龙兴足球场",
  "Ji'nan Olympic Sports Center": "济南奥体中心",
  "Qingdao Youth Football Stadium": "青岛青春足球场",
  "Huanglong Sports Centre Stadium": "黄龙体育中心",
  "TEDA Football Stadium": "泰达足球场",
  "Tiexi New District Sports Center Stadium": "铁西体育场",
  "Pudong Football Stadium": "浦东足球场",
  "Yuxi Plateau Sports Center Stadium": "玉溪高原体育中心",
  "Zhengzhou Hanghai Stadium": "郑州航海体育场",
  "Wuhan Sports Center Stadium": "武汉体育中心",
  "Bao'an Stadium": "宝安体育场",
  "West Coast University City Sports Center Stadium": "西海岸大学城体育中心"
};

function normalizeNumber(val) {
  if (val === null || val === undefined) return 0;
  const raw = String(val).trim();
  if (!raw || raw === "-") return 0;
  const cleaned = raw.replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) return Number(cleaned.replace(/\./g, ""));
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) return Number(cleaned.replace(/,/g, ""));
  const parsed = Number(cleaned.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} when fetching ${url}`);
  return response.text();
}

function parseAttendanceHtml(html, source) {
  const $ = cheerio.load(html);
  const table = $("table.items").first();
  if (!table.length) throw new Error("Transfermarkt attendance table not found");

  const teams = [];
  table.find("> tbody > tr").each((index, row) => {
    const cells = $(row).children("td").map((_, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get();
    const links = $(row).children("td").eq(1).find("a")
      .map((_, link) => $(link).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean);
    if (cells.length < 5 || links.length < 2) return;

    const stadium = links[0];
    const team = links[1];
    const capacity = normalizeNumber(cells[2]);
    const totalAttendance = normalizeNumber(cells[3]);
    const averageAttendance = normalizeNumber(cells[4]);
    const occupancyRate = capacity ? averageAttendance / capacity : null;

    teams.push({
      rank: normalizeNumber(cells[0]) || index + 1,
      team,
      teamCn: TEAM_CN[team] || team,
      stadium,
      stadiumCn: STADIUM_CN[stadium] || stadium,
      capacity,
      matches: averageAttendance ? Math.round(totalAttendance / averageAttendance) : 0,
      totalAttendance,
      averageAttendance,
      occupancyRate
    });
  });

  if (teams.length < 8) {
    throw new Error(`Attendance table parsed too few teams: ${teams.length}`);
  }

  const totalCells = table.find("> tfoot > tr > td").map((_, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get();
  const totalAttendance = normalizeNumber(totalCells[3] || teams.reduce((sum, t) => sum + t.totalAttendance, 0));
  const averageAttendance = normalizeNumber(totalCells[4] || Math.round(totalAttendance / teams.reduce((sum, t) => sum + t.matches, 0)));
  const matches = teams.reduce((sum, t) => sum + t.matches, 0) || (averageAttendance ? Math.round(totalAttendance / averageAttendance) : 0);
  const highest = [...teams].sort((a, b) => b.averageAttendance - a.averageAttendance)[0];

  return {
    league: "csl",
    leagueName: "中超",
    season: SEASON,
    type: "attendance",
    mode: "third_party",
    source: "Transfermarkt",
    sourceUrl: source.url,
    isOfficial: false,
    fetchedAt: NOW,
    status: "ok",
    disclaimer: "观众人数来自第三方公开来源 Transfermarkt，非官方数据，仅供趋势分析参考。",
    summary: {
      matches,
      totalAttendance,
      averageAttendance,
      highestAverageTeam: highest ? (highest.teamCn || highest.team) : "",
      highestAverageAttendance: highest ? highest.averageAttendance : 0
    },
    teams
  };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  let attendance = null;
  let usedSource = null;

  for (const source of SOURCES) {
    try {
      console.log(`[attendance] Trying ${source.url}`);
      const html = await getHtml(source.url);
      attendance = parseAttendanceHtml(html, source);
      usedSource = source;
      break;
    } catch (err) {
      console.warn(`[attendance] Source ${source.name} failed: ${err.message}`);
    }
  }

  if (!attendance) {
    throw new Error("Failed to crawl CSL attendance from all Transfermarkt mirrors");
  }

  const destPath = path.join(DATA_DIR, "csl-attendance.json");
  await writeFile(destPath, JSON.stringify(attendance, null, 2) + "\n");
  console.log(`[write] ${destPath} successfully created with ${attendance.teams.length} teams.`);
}

main().catch(err => {
  console.error(`[fatal] Attendance crawl failed: ${err.stack || err.message}`);
  process.exitCode = 1;
});
