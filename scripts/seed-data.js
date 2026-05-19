import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const NOW = new Date().toISOString();

const TEAM_SEEDS = {
  csl: [
    ["上海海港", "海港", "上海"], ["上海申花", "申花", "上海"], ["成都蓉城", "蓉城", "成都"], ["山东泰山", "泰山", "济南"],
    ["北京国安", "国安", "北京"], ["浙江队", "浙江", "杭州"], ["天津津门虎", "津门虎", "天津"], ["武汉三镇", "三镇", "武汉"],
    ["河南队", "河南", "郑州"], ["深圳新鹏城", "新鹏城", "深圳"], ["青岛西海岸", "西海岸", "青岛"], ["长春亚泰", "亚泰", "长春"],
    ["梅州客家", "梅州", "梅州"], ["沧州雄狮", "沧州", "沧州"], ["青岛海牛", "海牛", "青岛"], ["南通支云", "支云", "南通"]
  ],
  cl1: [
    ["云南玉昆", "玉昆", "玉溪"], ["大连英博", "英博", "大连"], ["重庆铜梁龙", "铜梁龙", "重庆"], ["广州队", "广州", "广州"],
    ["南京城市", "南京", "南京"], ["苏州东吴", "东吴", "苏州"], ["广西平果哈嘹", "平果", "平果"], ["石家庄功夫", "功夫", "石家庄"],
    ["辽宁铁人", "铁人", "沈阳"], ["佛山南狮", "南狮", "佛山"], ["上海嘉定汇龙", "嘉定", "上海"], ["延边龙鼎", "延边", "延吉"],
    ["黑龙江冰城", "冰城", "哈尔滨"], ["无锡吴钩", "吴钩", "无锡"], ["江西庐山", "庐山", "九江"], ["青岛红狮", "红狮", "青岛"]
  ],
  cl2: [
    ["陕西联合", "陕西", "西安"], ["广东广州豹", "广州豹", "广州"], ["深圳青年人", "深圳青年", "深圳"], ["广西蓝航", "蓝航", "柳州"],
    ["海口名城", "海口", "海口"], ["湖北青年星", "湖北青年", "武汉"], ["湖南湘涛", "湘涛", "长沙"], ["泰安天贶", "泰安", "泰安"],
    ["廊坊荣耀之城", "廊坊", "廊坊"], ["北京理工", "北理工", "北京"], ["山东泰山B队", "泰山B", "济南"], ["泉州亚新", "泉州", "泉州"],
    ["赣州瑞狮", "瑞狮", "赣州"], ["日照宇启", "日照", "日照"], ["西安崇德荣海", "荣海", "西安"], ["南通海门珂缔缘", "海门", "南通"],
    ["大连鲲城", "鲲城", "大连"], ["上海海港B队", "海港B", "上海"], ["广西恒宸", "恒宸", "南宁"], ["江西黑马青年", "黑马", "南昌"]
  ]
};

const FORM_PATTERNS = [
  ["W", "W", "D", "W", "W"], ["W", "D", "W", "W", "D"], ["L", "W", "W", "D", "W"], ["D", "W", "D", "W", "L"],
  ["W", "L", "W", "D", "W"], ["D", "D", "L", "W", "D"], ["L", "D", "L", "D", "L"], ["L", "L", "D", "L", "D"]
];

function buildTeam(leagueKey, seed, index, total) {
  const upper = total - index;
  const played = leagueKey === "cl2" ? 10 + (index % 3) : 13 + (index % 4);
  const wins = Math.max(1, Math.floor((upper / total) * 9) + (index % 2));
  const draws = Math.max(1, (index + 2) % 5);
  const losses = Math.max(0, played - wins - draws);
  const goalsFor = Math.max(6, 31 - index + (index % 4));
  const goalsAgainst = Math.max(5, 9 + index + (index % 5));
  const points = wins * 3 + draws;
  const homeWins = Math.max(0, Math.floor(wins * 0.58));
  const awayWins = wins - homeWins;
  const homeDraws = Math.max(0, Math.floor(draws * 0.55));
  const awayDraws = draws - homeDraws;
  const homeLosses = Math.max(0, Math.floor(losses * 0.42));
  const awayLosses = losses - homeLosses;

  return {
    id: `${leagueKey}-team-${String(index + 1).padStart(2, "0")}`,
    rank: index + 1,
    name: seed[0],
    shortName: seed[1],
    city: seed[2],
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    points,
    form: FORM_PATTERNS[index % FORM_PATTERNS.length],
    homeRecord: { wins: homeWins, draws: homeDraws, losses: homeLosses, points: homeWins * 3 + homeDraws },
    awayRecord: { wins: awayWins, draws: awayDraws, losses: awayLosses, points: awayWins * 3 + awayDraws },
    source: "mock",
    updatedAt: NOW
  };
}

function buildFixtures(leagueKey, teams) {
  const statusPlan = ["finished", "finished", "finished", "finished", "finished", "live", "scheduled", "scheduled", "scheduled", "postponed", "scheduled", "finished", "scheduled", "finished"];
  const venues = ["体育中心体育场", "专业足球场", "奥体中心", "市体育场", "凤凰山体育公园", "龙泉驿足球场"];
  return statusPlan.map((status, index) => {
    const home = teams[index % teams.length];
    const away = teams[(index + 5) % teams.length];
    const isScored = status === "finished" || status === "live";
    return {
      id: `${leagueKey}-fixture-${String(index + 1).padStart(2, "0")}`,
      league: leagueKey,
      round: leagueKey === "cl2" ? 8 + Math.floor(index / 2) : 13 + Math.floor(index / 2),
      date: new Date(Date.UTC(2026, 4, 10 + index, 11 + (index % 5), index % 2 ? 30 : 35)).toISOString(),
      homeTeam: home.name,
      awayTeam: away.name,
      homeScore: isScored ? (index * 2 + 1) % 4 : null,
      awayScore: isScored ? (index + 1) % 3 : null,
      status,
      venue: `${home.city}${venues[index % venues.length]}`,
      source: "mock",
      fetchedAt: NOW
    };
  });
}

async function writeJson(fileName, data) {
  await writeFile(path.join(DATA_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  // Generate standings and fixtures
  for (const leagueKey of ["csl", "cl1", "cl2"]) {
    const seeds = TEAM_SEEDS[leagueKey];
    const standings = seeds.map((seed, index) => buildTeam(leagueKey, seed, index, seeds.length))
      .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor)
      .map((team, index) => ({ ...team, rank: index + 1 }));
    
    const fixtures = buildFixtures(leagueKey, standings);

    await writeJson(`${leagueKey}-standings.json`, {
      league: leagueKey,
      fetchedAt: NOW,
      mode: "mock",
      source: "内置示例数据",
      isOfficial: false,
      data: standings
    });

    await writeJson(`${leagueKey}-fixtures.json`, {
      league: leagueKey,
      fetchedAt: NOW,
      mode: "mock",
      source: "内置示例数据",
      isOfficial: false,
      data: fixtures
    });
  }

  // Generate attendance
  const attendanceTeams = [
    ["北京国安", "北京国安", "Workers Stadium", "北京工人体育场", 68000, 6, 258000, 43000],
    ["上海申花", "上海申花", "Shanghai Stadium", "上海体育场", 70381, 6, 246000, 41000],
    ["成都蓉城", "成都蓉城", "Phoenix Hill Sports Park Football Stadium", "凤凰山体育公园专业足球场", 50695, 6, 228000, 38000],
    ["上海海港", "上海海港", "Pudong Football Stadium", "浦东足球场", 37000, 6, 156000, 26000],
    ["山东泰山", "山东泰山", "Ji'nan Olympic Sports Center", "济南奥体中心", 56808, 6, 180000, 30000],
    ["天津津门虎", "天津津门虎", "TEDA Football Stadium", "泰达足球场", 35680, 6, 150000, 25000],
    ["浙江队", "浙江队", "Huanglong Sports Centre Stadium", "黄龙体育中心", 52000, 6, 132000, 22000],
    ["青岛海牛", "青岛海牛", "Qingdao Youth Football Stadium", "青岛青春足球场", 53317, 6, 120000, 20000]
  ].map((row, index) => ({
    rank: index + 1,
    team: row[0],
    teamCn: row[1],
    stadium: row[2],
    stadiumCn: row[3],
    capacity: row[4],
    matches: row[5],
    totalAttendance: row[6],
    averageAttendance: row[7],
    occupancyRate: row[7] / row[4],
    source: "mock attendance fallback"
  }));

  await writeJson("attendance-csl.json", {
    league: "csl",
    leagueName: "中超",
    season: 2026,
    type: "attendance",
    source: "内置示例数据",
    sourceUrl: "",
    isOfficial: false,
    mode: "mock",
    fetchedAt: NOW,
    schemaVersion: 1,
    summary: {
      matches: 48,
      totalAttendance: 1124000,
      averageAttendance: 23417,
      highestAverageTeam: "北京国安",
      highestAverageAttendance: 43000
    },
    teams: attendanceTeams,
    matches: [],
    trend: [
      { season: "2024", matches: 240, totalAttendance: 4560000, averageAttendance: 19000, yoyGrowth: null },
      { season: "2025", matches: 240, totalAttendance: 5040000, averageAttendance: 21000, yoyGrowth: 0.105 },
      { season: "2026", matches: 48, totalAttendance: 1124000, averageAttendance: 23417, yoyGrowth: 0.115 }
    ]
  });

  await writeJson("attendance-meta.json", {
    updatedAt: NOW,
    status: "ok",
    mode: "mock",
    source: "内置示例数据",
    sourceUrl: "",
    isOfficial: false,
    teamsCount: attendanceTeams.length,
    logs: [{ level: "info", source: "seed", message: "Generated seed attendance data" }]
  });

  await writeJson("attendance-history-csl.json", {
    league: "csl",
    leagueName: "中超",
    season: 2026,
    type: "attendance_history",
    source: "内置示例数据",
    sourceUrl: "",
    isOfficial: false,
    mode: "mock",
    fetchedAt: NOW,
    schemaVersion: 1,
    data: [
      { season: "2024", seasonEndYear: 2024, matches: 240, totalAttendance: 4560000, averageAttendance: 19000, yoyGrowth: null },
      { season: "2025", seasonEndYear: 2025, matches: 240, totalAttendance: 5040000, averageAttendance: 21000, yoyGrowth: 0.105 },
      { season: "2026", seasonEndYear: 2026, matches: 48, totalAttendance: 1124000, averageAttendance: 23417, yoyGrowth: 0.115 }
    ]
  });

  // Generate meta
  await writeJson("meta.json", {
    updatedAt: NOW,
    mode: "mock",
    primarySource: "内置示例数据",
    primarySourceUrl: "",
    sources: [
      {
        id: "cfl-official",
        name: "中国足球职业联赛联合会官网",
        url: "https://www.cfl-china.cn/",
        isOfficial: true,
        status: "unused",
        lastFetchedAt: NOW
      }
    ],
    leagues: {
      csl: { standings: "mock", fixtures: "mock" },
      cl1: { standings: "mock", fixtures: "mock" },
      cl2: { standings: "mock", fixtures: "mock" }
    },
    logs: [
      { level: "info", message: "Initial seed data deployment" }
    ]
  });

  // Generate official-feed.json
  await writeJson("official-feed.json", [
    {
      title: "2026/27 赛季亚冠联赛名额分配补充通知",
      date: NOW,
      source: "中国足协官网",
      sourceUrl: "https://www.thefa.org.cn/",
      category: "公告"
    },
    {
      title: "2026 怡宝中国足球超级联赛第 11 轮裁判人员选派安排",
      date: NOW,
      source: "中足联联合会官网",
      sourceUrl: "https://www.cfl-china.cn/",
      category: "裁判安排"
    },
    {
      title: "2026 怡宝中乙联赛第 8 轮裁判人员选派安排表",
      date: NOW,
      source: "中足联联合会官网",
      sourceUrl: "https://www.cfl-china.cn/",
      category: "裁判安排"
    },
    {
      title: "关于对中甲联赛违规违纪行为的纪律处罚决定",
      date: NOW,
      source: "中国足协官网",
      sourceUrl: "https://www.thefa.org.cn/",
      category: "纪律处罚"
    },
    {
      title: "关于调整 2026 中超联赛第 12 轮部分比赛开球时间的通知",
      date: NOW,
      source: "中足联联合会官网",
      sourceUrl: "https://www.cfl-china.cn/",
      category: "赛程变更"
    }
  ]);

  // Generate changelog
  await writeJson("changelog.json", {
    updatedAt: NOW,
    history: [
      { time: NOW, league: "csl", type: "init", message: "初始化中超数据监测快照" }
    ]
  });

  // Generate source-comparison
  await writeJson("source-comparison.json", {
    updatedAt: NOW,
    leagues: {
      csl: {
        matchesCount: { "sina-sports": 14, "dongqiudi": 14, "cfl-official": 0 },
        differences: []
      }
    }
  });

  console.log("Seed data generation complete.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
