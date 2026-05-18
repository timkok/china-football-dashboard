# china-football-dashboard

在线访问地址：[https://timkok.github.io/china-football-dashboard/](https://timkok.github.io/china-football-dashboard/)

中国足球职业联赛监测 Dashboard 是一个 mock-first static dashboard，用单个 `index.html` 展示中超 CSL、中甲 China League One、中乙 China League Two 的积分榜、赛程赛果、球队监测、数据健康、刷新日志、图表和动态告警。

当前状态：**Mock-first static dashboard**。页面默认使用示例数据，不代表官方排名或真实赛果。

## 功能列表

- 中超 / 中甲 / 中乙 tab 切换。
- 默认展示中超积分榜和最近/即将赛程。
- 积分榜包含排名区间、城市、胜平负、进失球、净胜球、积分、主客场记录、最近 5 场状态。
- 赛程支持球队筛选和状态筛选。
- 球队监测展示排名、积分、进球、失球、净胜球、主客场积分和近期比赛。
- 数据健康模块展示数据模式、刷新时间、数据年龄、数据源数量、刷新结果、完整度和异常数量。
- 刷新日志保留最近 5 条 manual / scheduled / fallback / error 事件。
- 动态告警支持 Stale Data、Form Alert、Defense Alert、Attack Alert、Fixture Alert、Data Completeness Alert。
- ECharts 图表包含积分 Top 8、进球 vs 失球、净胜球、最近 5 场状态分布、主客场表现。
- 如果图表 CDN 加载失败，页面仍显示完整表格数据和 fallback 文本。

## 数据源优先级

代码中保留了清晰的 `DATA_SOURCES` 配置：

1. 中国足球职业联赛联合会官网：https://www.cfl-china.cn/
   - 类型：official
   - 用途：standings、fixtures、news
2. 懂球帝
   - 类型：fallback
   - 用途：standings、fixtures
3. 新浪爱彩
   - 类型：fallback
   - 用途：standings、fixtures

当前版本不会直接请求这些站点，避免静态页面因为网络、跨域或 API key 问题失效。

## 为什么当前不直接抓官方页面

GitHub Pages 是纯静态托管环境，没有后端执行能力。浏览器直接抓取官方或第三方页面通常会遇到：

- CORS 限制。
- 反爬策略或频率限制。
- 页面结构变化导致解析不稳定。
- 需要登录态、Cookie 或动态 JavaScript 渲染。
- API key 不能安全写入公开 HTML。

因此当前前端保留 `fetchLiveData()`、`fetchOfficialCflData()`、`fetchFallbackData()`、`normalizeStandings()`、`normalizeFixtures()`、`validateLeagueData()`、`updateDataHealth()` 等函数入口，但默认返回 mock 数据。

## 推荐真实数据更新方案

1. 使用 GitHub Actions 定时抓取官方中足联和 fallback 数据源。
2. 在 CI 中清洗并生成 `data/*.json` 静态文件，例如：
   - `data/csl.json`
   - `data/cl1.json`
   - `data/cl2.json`
3. 前端通过同源 HTTPS 读取这些静态 JSON。
4. 抓取失败时保留上一次成功数据，并在 JSON 中写入 `mode: "Fallback"` 或 `mode: "Stale"`。
5. 如果需要 API key 或更复杂抓取，使用 serverless proxy 或后端服务，不要把密钥写进 `index.html`。

## 本地打开方式

不需要 Node.js，也不需要构建工具。

直接打开：

```bash
open index.html
```

或启动任意静态服务：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/
```

## GitHub Pages 部署

当前仓库已按 GitHub Pages 静态站方式设计：

- 不依赖后端。
- 不读取本地文件。
- CDN 资源使用 HTTPS。
- CDN 不可用时保留表格和核心数据展示。

部署方式：

1. 推送 `index.html` 和 `README.md` 到 `main` 分支。
2. GitHub 仓库进入 `Settings` -> `Pages`。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，目录选择 `/root`。
5. 等待 Pages build 完成。

## 后续路线图

- 增加 `data/*.json` 静态数据层。
- 增加 GitHub Actions 定时抓取与数据校验。
- 为每条数据增加官方链接和 fallback 链接。
- 增加赛程变更 diff、排名变化趋势和球队详情页。
- 增加历史快照对比和 stale/fallback 明细说明。
