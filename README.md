# china-football-dashboard

在线访问地址：[https://timkok.github.io/china-football-dashboard/](https://timkok.github.io/china-football-dashboard/)

中国足球职业联赛监测 Dashboard 是一个 **JSON-first / 真实数据优先 + mock fallback** 的 GitHub Pages 静态 dashboard。页面本身不抓第三方网页，只读取本仓库生成好的 `data/*.json`，用于展示中超 CSL、中甲 China League One、中乙 China League Two 的积分榜、赛程、球队监测、数据健康、刷新日志、图表和动态告警。

## 当前状态

- 中超积分榜：优先尝试中国足球职业联赛联合会官网；当前官方公开 HTML 未暴露完整 16 队积分榜时，脚本会使用新浪体育中超积分榜公开数据作为 fallback。
- 中超赛程：第一阶段仍为 mock fixture fallback。
- 中甲 / 中乙：第一阶段保留 mock fallback，并在页面中明确标注。
- 所有 JSON 都包含 `source`、`sourceUrl`、`isOfficial`、`fetchedAt`。
- 页面会显示数据模式：`Live Official` / `Live Fallback` / `Mock` / `Stale`。
- 数据超过 12 小时会显示 `Stale`。
- 非官方数据仅作参考；如与官方公告不一致，以中足联 / 足协官方公告为准。

页面中会显著标注：

```text
当前使用示例数据 / fallback 数据，不代表官方排名或真实赛果。
```

## 数据文件

GitHub Actions 生成并提交以下静态 JSON：

```text
data/csl-standings.json
data/csl-fixtures.json
data/cl1-standings.json
data/cl1-fixtures.json
data/cl2-standings.json
data/cl2-fixtures.json
data/meta.json
```

每个联赛数据文件结构：

```json
{
  "league": "csl",
  "season": 2026,
  "leagueName": "中超",
  "type": "standings",
  "source": "新浪体育中超积分榜",
  "sourceId": "sina-sports",
  "sourceUrl": "https://sports.sina.com.cn/csl/table/",
  "isOfficial": false,
  "mode": "fallback",
  "fetchedAt": "2026-05-18T04:04:18.498Z",
  "schemaVersion": 1,
  "data": [
    {
      "rank": 1,
      "team": "成都蓉城",
      "played": 12,
      "wins": 11,
      "draws": 1,
      "losses": 0,
      "goalsFor": 32,
      "goalsAgainst": 10,
      "goalDiff": 22,
      "points": 34
    }
  ]
}
```

`data/meta.json` 记录本次更新时间、数据源状态和各联赛数据状态：

```json
{
  "updatedAt": "2026-05-18T04:04:18.498Z",
  "mode": "fallback",
  "sources": [],
  "leagues": {
    "csl": { "standings": "fallback", "fixtures": "mock" },
    "cl1": { "standings": "mock", "fixtures": "mock" },
    "cl2": { "standings": "mock", "fixtures": "mock" }
  }
}
```

## 数据源优先级

1. 中国足球职业联赛联合会官网：https://www.cfl-china.cn/
   - official
   - 优先用于中超、中甲、中乙赛程和积分榜。
2. 新浪体育中超积分榜：https://sports.sina.com.cn/csl/table/
   - fallback
   - 当前第一阶段用于中超积分榜 fallback。
3. 懂球帝 / 球迷屋 / Sofascore / Flashscore / Soccerway
   - fallback
   - 非官方备用来源。

## 为什么 GitHub Pages 前端不直接抓网页

GitHub Pages 是纯静态托管，浏览器直接抓官方或第三方网页会遇到：

- CORS 限制。
- 反爬策略或频率限制。
- 页面结构变化导致解析不稳定。
- 需要登录态、Cookie 或动态 JavaScript 渲染。
- API key 不能安全写入公开 HTML。

因此本项目采用：

1. GitHub Actions 定时抓取数据。
2. Node.js 脚本标准化为 `data/*.json`。
3. 前端只读取同仓库静态 JSON。
4. 抓取失败时保留上一次成功 JSON，不覆盖为空数据。
5. JSON 不存在或过旧时，页面回退到内置 mock，并明确标注。

## GitHub Actions 更新机制

workflow 文件：

```text
.github/workflows/update-data.yml
```

触发方式：

- 每 6 小时自动运行一次。
- 支持 `workflow_dispatch` 手动运行。

手动触发方式：

1. 打开 GitHub 仓库的 `Actions` 页面。
2. 选择 `Update football data` workflow。
3. 点击 `Run workflow`。

执行内容：

```bash
npm install
npm run fetch:data
```

如果 `data/` 目录有变化，自动提交：

```text
Update football data
```

## 手动运行

本地需要 Node.js 20+。

```bash
npm install
npm run fetch:data
```

然后直接打开：

```bash
open index.html
```

或启动静态服务：

```bash
python3 -m http.server 8000
```

访问：

```text
http://localhost:8000/
```

## 功能列表

- 真实 JSON 优先，mock fallback。
- 中超 / 中甲 / 中乙 tab 切换。
- 中甲 / 中乙 tab 明确标注 `示例`，表示当前仍为 mock fallback。
- 积分榜、赛程、球队监测全部基于当前 JSON 或 fallback 数据渲染。
- 数据健康模块展示模式、来源、官方标记、刷新时间、数据年龄、完整度。
- 刷新日志显示最近数据事件。
- 动态告警支持 Stale Data、Form Alert、Defense Alert、Attack Alert、Fixture Alert、Data Completeness Alert。
- ECharts 图表包含积分 Top 8、进球 vs 失球、净胜球、最近 5 场状态分布、主客场表现。
- 如果 ECharts CDN 加载失败，页面保留表格并显示图表 fallback 文本。

## 后续路线图

- 接入官方中足联赛程与积分榜，优先替换 fallback。
- 生成真实赛程 JSON。
- 增加中甲 / 中乙真实积分榜和赛程。
- 为每条数据增加官方链接和 fallback 链接。
- 增加历史趋势。
- 增加数据差异检测。
