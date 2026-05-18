# china-football-dashboard

中国足球职业联赛监测 Dashboard，一个无需构建工具的单文件静态 HTML 项目，用于演示中超 CSL、中甲 China League One、中乙 China League Two 的赛程、积分榜、球队状态、图表和自动告警。

当前版本默认使用 mock/sample 数据，页面中明确标注“示例数据，仅用于 Dashboard 演示”。没有 API key 时不会报错。

## 功能说明

- 顶部标题区：展示项目标题、副标题、数据最后更新时间、数据状态。
- 核心指标卡片：今日比赛数、近期已完赛场次、总进球数、平均每场进球、数据源数量、异常告警数量。
- 联赛切换：中超、中甲、中乙三个 tab，切换后刷新积分榜、赛程、球队筛选和图表。
- 积分榜：排名、球队、场次、胜平负、进失球、净胜球、积分、最近 5 场状态。
- 赛程与赛果：展示轮次、时间、主队、比分、客队、状态，并支持球队和状态筛选。
- 球队监测：选择球队后展示排名、积分、进球、失球、净胜球、最近 5 场和近期比赛。
- 图表：使用 ECharts CDN，包含积分 Top 8、进球 vs 失球、净胜球、最近 5 场状态分布。
- 告警区：自动生成 Stale Data、Form Alert、Defense Alert、Fixture Alert。
- 数据刷新：刷新按钮会模拟 1 秒 loading，并更新 fetchedAt 时间。

## 本地运行方式

不需要安装 Node.js，也不需要构建。

直接双击或用浏览器打开：

```bash
open index.html
```

也可以用任意静态文件服务打开，但不是必需：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/
```

## 数据源说明

代码中保留了 `dataSources` 配置，当前只作为页面展示和未来接入说明，不会主动请求外部 API。

优先级建议：

1. 官方中足联：https://www.cfl-china.cn/
   - 用于中超、中甲、中乙赛程和积分榜。
2. 新浪体育中超积分榜
   - 作为中超 fallback。
3. Sofascore / Flashscore / Soccerway
   - 作为第三方 fallback，用于赛程、赛果、球队状态校验。
4. Sportmonks / TheSportsDB / API-Football
   - 可选 API，通常需要 API key。

## 如何替换 mock 数据为真实 API

在 `index.html` 中找到：

```js
async function fetchLiveData() {
  // TODO
}
```

建议替换步骤：

1. 从官方中足联或可信 API 获取赛程和积分榜。
2. 将接口响应转换为当前 `leagues` 数据结构：

```js
{
  name: "中超 CSL",
  standings: [
    { rank, team, played, wins, draws, losses, gf, ga, points, form }
  ],
  fixtures: [
    { round, date, home, away, homeScore, awayScore, status }
  ]
}
```

3. 成功后设置：

```js
dashboardState.dataMode = "live";
dashboardState.fetchedAt = new Date().toISOString();
```

4. 调用 `renderAll()` 重新渲染页面。

注意：如果使用需要 API key 的服务，不建议把 key 写入静态 HTML。应通过后端、Serverless Function 或安全代理层转发请求。

## 如何部署到 GitHub Pages

推送到 GitHub 后，可以在仓库设置中启用 GitHub Pages：

1. 打开 GitHub 仓库页面。
2. 进入 `Settings` -> `Pages`。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 保存后等待 GitHub Pages 构建完成。

如果使用 GitHub CLI，也可以尝试：

```bash
gh api repos/OWNER/china-football-dashboard/pages --method POST --field 'source[branch]=main' --field 'source[path]=/'
```

其中 `OWNER` 替换为你的 GitHub 用户名或组织名。
