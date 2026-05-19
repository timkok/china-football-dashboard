import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const NOW = new Date().toISOString();

const SOURCES = [
  {
    name: "Transfermarkt UK",
    url: "https://www.transfermarkt.co.uk/chinese-super-league/besucherzahlenentwicklung/wettbewerb/CSL"
  },
  {
    name: "Transfermarkt",
    url: "https://www.transfermarkt.com/chinese-super-league/besucherzahlenentwicklung/wettbewerb/CSL"
  }
];

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

function parseHistoryHtml(html, source) {
  const $ = cheerio.load(html);
  const table = $("table.items").first();
  if (!table.length) throw new Error("Transfermarkt UK history table not found");

  const seasons = [];
  table.find("> tbody > tr").each((_, row) => {
    const cells = $(row).children("td").map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get();
    if (cells.length < 4 || !cells[0]) return;

    const season = cells[0]; // e.g. "2024" or "24/25" or "23"
    
    // Compute seasonEndYear
    let seasonEndYear = 0;
    if (season.includes("/")) {
      const parts = season.split("/");
      const lastPart = parts[parts.length - 1];
      seasonEndYear = lastPart.length === 2 ? 2000 + parseInt(lastPart) : parseInt(lastPart);
    } else {
      const parsedYear = parseInt(season);
      if (parsedYear > 1900 && parsedYear < 2100) {
        seasonEndYear = parsedYear;
      }
    }

    seasons.push({
      season,
      seasonEndYear,
      matches: normalizeNumber(cells[1]),
      totalAttendance: normalizeNumber(cells[2]),
      averageAttendance: normalizeNumber(cells[3]),
      highestAverageTeam: cells[5] || "",
      highestAverageAttendance: normalizeNumber(cells[6])
    });
  });

  if (seasons.length < 3) {
    throw new Error(`Historical data has too few seasons: ${seasons.length}`);
  }

  return {
    league: "csl",
    leagueName: "中超",
    type: "attendance-history",
    mode: "third_party",
    source: "Transfermarkt",
    sourceUrl: source.url,
    isOfficial: false,
    fetchedAt: NOW,
    status: "ok",
    seasons
  };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  let history = null;
  let usedSource = null;

  for (const source of SOURCES) {
    try {
      console.log(`[history] Trying ${source.url}`);
      const html = await getHtml(source.url);
      history = parseHistoryHtml(html, source);
      usedSource = source;
      break;
    } catch (err) {
      console.warn(`[history] Source ${source.name} failed: ${err.message}`);
    }
  }

  if (!history) {
    throw new Error("Failed to crawl CSL attendance history from Transfermarkt");
  }

  const destPath = path.join(DATA_DIR, "csl-attendance-history.json");
  await writeFile(destPath, JSON.stringify(history, null, 2) + "\n");
  console.log(`[write] ${destPath} successfully created with ${history.seasons.length} seasons.`);
}

main().catch(err => {
  console.error(`[fatal] History crawl failed: ${err.stack || err.message}`);
  process.exitCode = 1;
});
