# 中国职业足球联赛监测 Dashboard

在线访问地址：[https://timkok.github.io/china-football-dashboard/](https://timkok.github.io/china-football-dashboard/)

中国职业足球联赛监测 Dashboard 是一个 **真实数据优先，默认禁止 mock** 的 GitHub Pages 静态 dashboard。浏览器端只读取本仓库的 `data/*.json`，不直接抓取中足联、Transfermarkt、Sina 或其他第三方网页。

## 核心设计原则

1. **真实数据优先（Real-Data-Only）**：默认线上模式仅展示真实抓取/真实 JSON 数据。真实数据缺失时显示空状态和原因，不使用 mock 数据填充。
2. **Demo 模式**：mock/demo 数据只能在显式开启 demo 模式时使用，例如：
   `https://timkok.github.io/china-football-dashboard/?demo=1`
3. **数据源可信度标签**：每个模块均清晰标明数据来源、URL、官方标记以及数据模式，确保用户对数据可信度一目了然。

## 数据文件

GitHub Actions 定时生成并提交以下静态 JSON：

```text
data/meta.json                     # 全局抓取元数据及数据源状态
data/csl-standings.json            # 中超积分榜（真实抓取自新浪体育/中足联）
data/csl-fixtures.json             # 中超赛程（真实数据暂缺，显示空状态模板）
data/cl1-standings.json            # 中甲积分榜（真实数据暂缺，显示空状态模板）
data/cl1-fixtures.json             # 中甲赛程（真实数据暂缺，显示空状态模板）
data/cl2-standings.json            # 中乙积分榜（真实数据暂缺，显示空状态模板）
data/cl2-fixtures.json             # 中乙赛程（真实数据暂缺，显示空状态模板）
data/csl-attendance.json           # 中超观众人数数据（抓取自 Transfermarkt）
data/csl-attendance-history.json   # 中超观众历史年表数据（抓取自 Transfermarkt）
data/official-feed.json            # 中国足协/中足联官方公告新闻（抓取自中国足协官网）
data/fetch-log.json                # 抓取流程日志归档
data/data-quality.json             # 数据质量分析与告警归档
```

每个数据文件均包含来源信息及抓取时间戳：

```json
{
  "league": "csl",
  "status": "ok",
  "mode": "real-data-only",
  "source": "新浪体育中超积分榜",
  "sourceUrl": "https://sports.sina.com.cn/csl/table/",
  "isOfficial": false,
  "fetchedAt": "2026-05-19T20:00:00.000Z",
  "data": [...]
}
```

## 数据源优先级

1. **中国足球职业联赛联合会官网**：https://www.cfl-china.cn/
   - `official`
   - 优先用于中超、中甲、中乙赛程、积分榜和官方公告。
2. **中国足球协会官网**：https://www.thecfa.cn/
   - `official`
   - 用于获取官方通知公告和裁判指派信息。
3. **新浪体育中超积分榜**：https://sports.sina.com.cn/csl/table/
   - `fallback`
   - 用于中超积分榜 fallback 数据源。
4. **Transfermarkt**：https://www.transfermarkt.com/
   - `third_party`
   - 用于中超观众人数、上座率和历史场均观众趋势。

## GitHub Actions

主 workflow：
```text
.github/workflows/update-data.yml
```

触发方式：
- 每 6 小时自动运行一次。
- 支持 `workflow_dispatch` 手动运行。

执行内容：
```bash
npm install
npm run fetch:all
```

`fetch:all` 执行流程：
1. 运行 `scripts/fetch-all.js` 依次触发各模块抓取（积分榜、观众数据、历史数据、官方公告），并写入 `data/fetch-log.json`。
2. 运行 `scripts/validate-data.js` 对抓取到的 JSON 文件进行格式及字段一致性校验，并输出 `data/data-quality.json`。
3. 如果 `data/` 目录有数据更新，则自动提交并推送到 GitHub。

## 本地运行

本地开发与调试需要 Node.js 20+：

```bash
# 安装依赖
npm install

# 手动抓取最新数据
npm run fetch:all

# 启动本地服务
python3 -m http.server 8000
```

访问本地页面：
- 真实数据模式：[http://localhost:8000/](http://localhost:8000/)
- 示例/Demo 模式：[http://localhost:8000/?demo=1](http://localhost:8000/?demo=1)

## 免责声明

- 本项目所展示的 Transfermarkt、新浪体育等来源均非官方首发数据源，仅供参考。
- 页面中包含的“升降级/争冠资格预测”、“联赛热度指数”和“最热主场”均为内置数学模型，非官方最终结论。
- 缺失真实数据的模块，页面上将显示空状态，说明数据缺失及配置原因，不对外提供 Mock 数据填充，以防误导。
