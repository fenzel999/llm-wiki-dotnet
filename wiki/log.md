---
title: 操作日志
summary: 追加式时间线，记录每次 Ingest/Query/Lint/Audit/Correct 的影响页面。
tags: [governance, log]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# log — 操作日志

追加式记录。每次操作后在顶部加一行（新在最上）。

- 2026-07-10 **大规模 Ingest（六方向扩建，26 新页）**：按微软官方文档补齐常用主题。
    - 后端核心（9）：`dotnet/fundamentals/` 测试/可观测性/配置Options/HttpClient/弹性/缓存/后台服务，`dotnet/aspnet-core/` 认证授权/中间件。
    - C# 深化（3）：`dotnet/csharp/` linq/collections/serialization。
    - 数据访问（5）：`dotnet/ef-core/` migrations/relationships/query-performance/concurrency，`comparisons/ef-vs-ado`。
    - 架构（6）：`architecture/` clean-architecture/vertical-slice/cqrs/ddd/microservices/event-driven。
    - 云原生（3）：新增 `cloud-native/` aspire/containers/health-checks。
    - 性能诊断（3）：新增 `performance/` benchmarking/gc-memory/diagnostics。
    - 新增 **POLICY P10/P11/P12**（自学习）：只用微软/基金会包、其余手写；删旧换新为整理主线；不用需付费/云绑定组件（Azure/Orleans）。据此把 testing 去 Moq/FluentAssertions/Testcontainers 改手写、http-client 去 Flurl、observability 去 Application Insights、数据访问对比改 EF vs ADO.NET（弃 Dapper）、CQRS/事件驱动去 MediatR、Aspire/事件驱动保持厂商中立。
    - 同步 `mkdocs.yml` nav、`index.md`、`思维导图.md`（+云原生/性能两色）、`sources/README.md`。`mkdocs build --strict` 通过（零死链）。

- 2026-07-10 **Audit + Correct（全库）**：对照官方文档做一次全库自审，删旧换新。
    - 事实订正：`dotnet/csharp/async-await.md`「并行组合」原称 `(await GetA(), await GetB())` 为并发——实为串行（表达式从左到右求值），改为先发起 Task 再统一 await，并提示 `Task.WhenAll`。
    - 事实订正：`comparisons/list-vs-immutablearray.md` 对比表「空值」行：`List<T>` 变量可为 null；`default(ImmutableArray<T>)` 为未初始化态（访问抛异常），空集合须用 `ImmutableArray<T>.Empty`。
    - 编码修复：`governance/qa.md`、`governance/feedback.md` 磁盘编码损坏（双重编码乱码），用干净 UTF-8 依原结构重写。
    - 其余 18 个内容页经子代理审计判定通过（frontmatter/source/新惯用法均无问题）。
    - 更新 `governance/qa-report.md`（本轮结论与已自修表）。`mkdocs build --strict` 通过。

- 2026-07-10 **Ingest（历史版本）**：按微软官方 "What's new" 文档补齐 .NET Core 3.0/3.1、.NET 5/6/7 知识，遵循 POLICY P1「新写法为首选，旧写法一句话标为已被取代」。
    - 新建 `dotnet/versions/netcore3.md`（C# 8：NRT/异步流/范围索引、内置 System.Text.Json 取代 Newtonsoft、单文件/裁剪/R2R、Windows 桌面）、`net5.md`（C# 9：records/顶层语句/模式匹配、统一 net5.0 TFM）、`net6.md`（C# 10 + 最小托管取代 Startup.cs、DateOnly/TimeOnly、日志源生成器）、`net7.md`（C# 11：泛型数学/原始字符串/required、Native AOT 控制台、限流、发布到容器、EF Core 7 批量更新、LibraryImport 取代 DllImport）。均标 `status: deprecated`（EOL），仅保留至今仍有效的知识并链到当前 .NET 10 推荐。
    - 更新 `comparisons/net-evolution.md`：时间线表补 Core 3.0/3.1/5 并标 EOL；新增 C# 8–11 行；参考资料增 4 页链接。
    - 同步 `mkdocs.yml` nav、`index.md`、`思维导图.md` 的「版本对照」，`sources/README.md` 登记 5 条官方来源。`mkdocs build --strict` 通过。

- 2026-07-10 **重构（reorg）**：按技术子域重排 .NET 知识树，并新增架构方向。
    - `concepts/` 全部并入 `dotnet/`：`modern-csharp`、`async-await` → `dotnet/csharp/`；`dependency-injection` → `dotnet/fundamentals/`。`concepts/` 目录移除。
    - `dotnet/` 根下 `native-aot`、`file-based-apps` → `dotnet/aot/`。
    - 新建 `architecture/` 与首篇 `architecture/modular-monolith.md`（模块化单体架构；来源 Microsoft Learn .NET 架构指南 + eShop 示例，含 C# 示例与好/坏对比）。
    - 全量修正跨页相对链接（composition / disposable-using / design-antipatterns / record-vs-class / list-vs-immutablearray / rag-vs-llm-wiki / ef-data-access / jit-optimizations / overview / index / 思维导图 / qa-report）。
    - 同步 `mkdocs.yml` nav（.NET 分：C# 语言 / 框架基础 / Web·Minimal API / 数据访问 EF Core / AOT 与部署 / 运行时 / Blazor / 版本对照；新增「架构」「工程规范」顶级组）、`index.md`、`思维导图.md`（新增青色「架构」分组）。`mkdocs build --strict` 通过。

- 2026-07-10 **Correct（阅读模式）**：护眼改为默认底色（不再单列按钮），主题按钮精简为 `☀️白天`（护眼暖色·浅）/ `🌙黑夜`（护眼暖色·深），保留 `📖专注` 开关（默认开）。影响：`extra/theme.css`（default/slate 均改暖色调）、`extra/modes.js`（移除 eye-care 按钮与逻辑，快捷键 d/n/f）、`extra/modes.css`（删 `.eye-care` 块）。`mkdocs build --strict` 通过。

- 2026-07-10 **合并（compose）**：新建 `patterns/composition.md`（组合与架构模式，合并 options-pattern / generic-host / pipeline-behavior / minimal-api-organization 四页），重写 `patterns/disposable-using.md` 正文；删除上述 4 个旧文件；同步更新 `index.md` 与 `思维导图.md` 的模式节点。其它目录指向旧文件的链接（standards/、dotnet/、anti-patterns/）未改动。

---

## 2026-07-10 · 重写 16 个 comparisons / dotnet 页面（结构统一）

- comparisons（4）：list-vs-immutablearray、net-evolution、rag-vs-llm-wiki、record-vs-class —— 套用「概述/取舍对比/结论与建议/参考资料」模板，改为流畅中文段落。
- dotnet 内容页（12）：overview、wiki/overview（地图页仅清理）、file-based-apps、native-aot、blazor/javascript-improvements、csharp/csharp-14、aspnet-core/aspnet-core-10、ef-core/ef-core-10、ef-core/ef-data-access、runtime/jit-optimizations、versions/net8、versions/net9 —— 套用「概述/正确做法/反例（常见错误）/适用版本/参考资料」模板。
- 修复 `jit-optimizations.md`、`versions/net8.md`、`versions/net9.md` 三处乱码（编码损坏），重写为干净中文；保留全部代码示例与相对链接目标。
- frontmatter：`updated` 统一为 `2026-07-10`；net10 特性 `introduced-in: net10`、`applies-to: [net10]`；版本页按 net8/net9 标注；`source` 一律保留未改。
- 影响：上述 16 个文件。无新增 ⚠️ 待判定点。

## 2026-07-10 · 视觉层整体重构（字体 + 设计）

- 放弃零散修补，重做整套视觉：**统一字体**（`extra/fonts.css` 经 Google Fonts 加载 Inter + 思源黑体 Noto Sans SC + JetBrains Mono，全设备中文渲染一致）。
- 重写 `extra/readable.css` 为 `extra/theme.css`：克制靛蓝配色、内容限宽 800px 居中、标题层级与分隔线、圆角代码块/表格/提示框、柔和引用与链接、更透气的侧栏导航；浅色与深色方案均做了配色与字体覆盖。移除旧 `readable.css`。
- 保留并适配 `extra/modes.css` / `modes.js`（护眼暖色 + 专注模式），与新变量一致。
- `mkdocs build --strict` 零警告；字体/主题/模式资源均打包。

## 2026-07-10 · 阅读模式：护眼 + 专注

- 新增 `wiki/extra/modes.css` 与 `wiki/extra/modes.js`，经 `mkdocs.yml` 的 `extra_css` / `extra_javascript` 接入。
- **护眼模式**（👁 / 快捷键 `e`）：暖色纸张配色（sepia），覆盖 Material 主色变量，减轻白底刺眼；与原生浅色/深色主题独立。
- **专注模式**（📖 / 快捷键 `f`）：隐藏左侧栏、目录(TOC)、标签页与页脚，正文收窄居中(720px)、字号略增、行距加大，鼠标移开时顶栏半透明，适合专心通读。
- 两个开关选择记入 `localStorage`，刷新/重访后保留。右下角固定两个圆形按钮切换。
- `mkdocs build --strict` 零警告通过。

## 2026-07-10 · 可读性收尾（第三轮）

- 将上一轮未覆盖的 **dotnet 内容页（10 篇）与 comparisons（4 篇）** 同样改写为流畅中文长文（csharp-14 / aspnet-core-10 / ef-core-10 / ef-data-access / file-based-apps / native-aot / blazor / jit-optimizations / net8 / net9；以及 4 个对比页），保留合并页锚点与跨页链接。
- 重排 `index.md`：人类读者视角优先——开头加「欢迎语 + 建议阅读路径」，目录居中，「给 AI 的使用说明」移到底部并标注。
- `mkdocs build --strict` 零警告通过。

## 2026-07-10 · 页面可读性与密度重构（第二轮）

- **排版主题**：新增 `wiki/extra/readable.css` 并经 `mkdocs.yml` 的 `extra_css` 接入——放大正文字号(16px)、行距 1.75、内容限宽 860px、代码块圆角/阴影、更柔和链接与引用块、中英文混排字体栈。治「排版累眼」。
- **合并零散小页为长篇连贯文档**（治「页面太多太散 / 单页太碎 / 中文生硬」）：
  - concepts 9→3：`modern-csharp.md`（合并 records/nullable/generics/pattern-matching/span-memory/value-task/source-generators，保留 async-await、dependency-injection）
  - standards 8→2：`coding-conventions.md`、`quality-engineering.md`
  - anti-patterns 8→2：`async-antipatterns.md`、`design-antipatterns.md`
  - patterns 5→2：`composition.md`（合并 options/generic-host/pipeline/minimal-api）、保留 `disposable-using.md`
  - 每篇用自然流畅中文重写，小节带 `{#anchor}`，保留全部代码示例。
- 全库失效链接用脚本统一改写为「合并页#锚点」（10 个文件），`mkdocs.yml` nav 与 `思维导图.md` 节点同步折叠；`mkdocs build --strict` 零警告通过。
- 页面数 54 → 36。

## 2026-07-10 · 页面可读性重构（统一模板）

- 发现并修复 4 个磁盘编码损坏、中文全乱码的文件：`patterns/composition.md#minimal-api-organization`、`dotnet/runtime/jit-optimizations.md`、`dotnet/versions/net8.md`、`dotnet/versions/net9.md`（重建为干净 UTF-8）。
- 为全库内容页制定统一、连贯的阅读模板（概述 → 正确做法 → 反例（常见错误）→ 适用版本 → 参考资料；反模式用 为什么/❌/✅/如何避免；对比用 概述/取舍/结论）。
- 重写全部 46 个内容页（concepts 9、standards 8、patterns 5、anti-patterns 8、comparisons 4 + dotnet 12），统一结构、修正前后矛盾的 frontmatter（`introduced-in`/`applies-to` 据实，如 record 改 `csharp9`），文字改为连贯段落而非清单堆砌。
- 校验：`mkdocs build --strict` 通过；全库扫描无 U+FFFD / 乱码文件；合并页锚点（`#csharp-14` 等）保留、跨页链接完好、`source` 未被回退为占位。

## 2026-07-10 · 整洁/优雅重构（四方向）

### 1. 清理结构冗余
- `mkdocs.yml` 导航移除重复的 `comparisons/net-evolution.md` 条目（原在 .NET 10 版本对照与实践/对比两处重复）。
- 删除空占位目录：`raw/articles`、`raw/papers`、`raw/assets`、`wiki/assets`（均无文件）；同步更新 `wiki/sources/README.md` 的本地资料说明。

### 2. 修正 source 溯源
- 42 个知识页的 `source` 由占位的 `sources/README.md` 改为真实官方一手来源（Microsoft Learn / 官方博客 / 上游仓库），内部治理与索引页保持 `AGENTS.md`；彻底消除「假来源」。

### 3. 精简合并页面
- C# 14 六页（extension 成员 / field 关键字 / 空条件赋值 / nameof 非绑定泛型 / 隐式 Span 转换 / lambda 参数修饰符）→ `dotnet/csharp/csharp-14.md`（用显式锚点 `#id` 保链接稳定）。
- EF Core 两页（复杂类型与 JSON、命名查询筛选器）→ `dotnet/ef-core/ef-core-10.md`；保留 `ef-data-access.md`（属模式，非特性）。
- ASP.NET Core 两页（最小 API 验证、OpenAPI 3.1）→ `dotnet/aspnet-core/aspnet-core-10.md`。
- 全库引用（index / overview / dotnet/overview / 思维导图 / mkdocs nav / 各版本页 / qa-report 等）同步折叠更新，无死链。

### 4. 改善渲染观感
- 思维导图 `.mm` 增加折叠箭头平滑动画与行 hover 高亮。

- 校验：`mkdocs build --strict` 通过（无死链、无缺失、无重复 nav）。页面数 61 → 54。

## 2026-07-10 · 重写 9 个 concepts 页（结构统一）
- 重写 `wiki/concepts/` 下 9 个文件（async-await / dependency-injection / generics / nullable-reference-types / pattern-matching / records / source-generators / span-memory / value-task）。
- 套用统一模板（概述 / 正确做法 / 反例（常见错误）/ 适用版本 / 参考资料），改为流畅中文段落，补 ❌ 反例代码块，参考资料增加官方文档链接。
- 修正 frontmatter 版本：records→csharp9、nullable-reference-types→csharp8、pattern-matching→csharp7、generics→csharp2、async-await→csharp5、source-generators→net5、span-memory→netcore21、value-task→netcore20；全部 `updated: 2026-07-10`。source 链接均保留未改。
- 影响：上述 9 个 concepts 页。无 ⚠️ 待判定点。

## 2026-07-10 · 清理无用构建产物
- 删除本地 `site/`（189 个文件）：MkDocs 生成产物，已被 `.gitignore` 忽略且未纳入 git；GitHub Actions 每次 push 自动重建部署，本地留存属冗余。
- `raw/articles`、`raw/assets`、`raw/papers` 为空占位目录，属 schema 规定结构，保留。
- 项目已符合 LLM Wiki 三层架构（`raw/` 源头、`wiki/` 知识层、`AGENTS.md`/`CLAUDE.md` Schema），无需额外改造。

## 2026-07-09 · 内容整理（AI 友好）
- 治理页归入 `wiki/governance/`：`QA.md→governance/qa.md`、`POLICY.md→governance/policy.md`、`QA-REPORT.md→governance/qa-report.md`、`如何反馈.md→governance/feedback.md`；更新全库链接与导航。
- `index.md` 增加「给 AI 的使用说明」：目录即主题（dotnet/concepts/standards/patterns/anti-patterns/comparisons/governance/sources），说明 frontmatter（tags/summary/source）用法。
- 去除 17 个文件（dotnet/ef/patterns 种子页）的 UTF-8 BOM，统一为无 BOM UTF-8；全库 frontmatter 审计（title/summary/tags/source）通过。
- 分类明确简单：目录即主题，便于 LLM 检索与维护。
- 影响：governance/*、index.md、思维导图.md、overview.md、AGENTS.md、CLAUDE.md、README.md、comparisons/* 及导航。

## 2026-07-09 · 去掉自定义 Result<T>（与最小 API Results<T> 重复）
- 删除 `concepts/result-type.md`：自造 `Result<T>` 与最小 API 内建 `Results<T>`/`TypedResults` 语义重复。
- `minimal-api-organization.md` 新增「类型化返回」小节，统一改用 `Results<T>`/`TypedResults` 表达多响应；示例中去除对自定义 Result 的依赖。
- 同步清理引用：`index.md`、`思维导图.md`、`overview.md`、`swallowing-exceptions.md`（`标准/null-handling.md`、`api-design.md` 改为推荐 `Results<T>`/`TypedResults`）。
- 影响：concepts/result-type.md（删除）、patterns/composition.md#minimal-api-organization、index.md、思维导图.md、overview.md、anti-patterns/design-antipatterns.md#swallowing-exceptions、standards/*。

## 2026-07-09 · 整理：去 3D 图谱、合并分类、移出 Result/仓储
- 删除 3D 关系图：移除 `知识图谱3D.md`、`graph.json`、`gen_graph.py`；导航与首页不再含 3D 入口，仅保留可导航思维导图。
- 合并分类为 4 个顶层：`.NET 10` / `语言与规范`（概念+规范）/ `实践`（模式+反模式+对比）/ `治理`，思维导图与索引同步重构。
- `Result 类型` 移出「模式」→ 归入 `语言与规范 / 语言概念`（`concepts/result-type.md`）。
- `仓储模式` 改写为的「EF Core 数据访问」移出「模式」→ 归入 `.NET 10 / EF Core`（`dotnet/ef-core/ef-data-access.md`）。
- 同步更新 AGENTS.md/CLAUDE.md/POLICY 中关于 `graph.json`/3D 的描述与 Lint 步骤。
- 影响：mkdocs.yml、index.md、overview.md、思维导图.md、AGENTS.md、CLAUDE.md、POLICY.md、README.md 及上述两个页面链接。

## 2026-07-09 · 纠正：验证改用 .NET 10 内置（不用 FluentValidation）
- `minimal-api-validation.md` 改为 .NET 10 最小 API 内置验证（`AddValidation()` + `WithValidation()`，数据注解 + `IValidatableObject`），不再使用 FluentValidation。
- 影响：dotnet/aspnet-core/minimal-api-validation.md。

## 2026-07-09 · 纠正：去 Swagger / 用 FluentValidation / EF 不用仓储+UoW / 不用 Controller
- OpenAPI：移除 Swashbuckle/Swagger，统一 .NET 10 原生 `AddOpenApi()` + `MapOpenApi()`（openapi-3-1.md）。
- 验证：最小 API 验证改为以 FluentValidation 为主（验证器 + 端点过滤器），.NET 10 内置验证作为备选（minimal-api-validation.md）。
- EF：将 `patterns/repository.md` 改写为「EF Core 数据访问：不引入仓储/工作单元」，直接注入 `DbContext`；清除全库对 Repository/UoW/Controller 的推荐与示例代码。
- Web 层：统一最小 API，不使用 Controller（minimal-api-organization.md、api-design.md 改为应用服务 + `DbContext`）。
- 可视化：思维导图增加分组 emoji 与 `initialExpandLevel` 折叠、按主题着色；3D 图谱按连接数定节点大小、按主题着色、加箭头与图例。
- 影响：dotnet/aspnet-core/*、patterns/*、standards/*、concepts/*、anti-patterns/*、index.md、overview.md、思维导图.md、知识图谱3D.md。

## 2026-07-09 · 部署上线
- `gh repo create llm-wiki-dotnet --public`（owner: fenzel999）。
- 分支 `master` → 重命名为 `main` 并设为默认分支；删除 `master`。
- 启用 GitHub Pages（build_type=workflow），放开 `github-pages` 环境部署分支策略（main 设为保护分支）。
- `mkdocs build` 通过 → GitHub Actions 自动部署成功。
- 站点：https://fenzel999.github.io/llm-wiki-dotnet/  （HTTP 200，思维导图/3D 图谱/各页面均可访问）
- 影响：线上站点、Actions 流水线。之后 Agent 每次 commit+push 自动重新部署。

## 2026-07-09 · seed + viz + build
- 写入 ~51 个种子页（dotnet/concepts/standards/patterns/anti-patterns/comparisons/sources）。
- 思维导图改为 markmap CDN 渲染（可点击节点跳转）；3D 图谱用 3d-force-graph（点击节点跳转）。
- 生成 wiki/graph.json（61 节点 / 274 边），由 Lint 依据交叉引用生成。
- 修正子代理写错的相对链接深度；`mkdocs build` 零死链通过。
- 记录 .NET 10 语法待确认项至 QA-REPORT.md「待你判定」。
- 影响：wiki/ 全量内容、可视化、graph.json。

## 2026-07-09 · scaffold
- 建仓库骨架、mkdocs.yml、.github、.gitignore、Issue 模板。
- 写 AGENTS.md ≡ CLAUDE.md Schema。
- 写治理文件 POLICY.md / QA.md / QA-REPORT.md / 如何反馈.md。
- 影响：仓库根、wiki/ 治理层。
- 待办：种子页面、可视化、git 提交与 push。
