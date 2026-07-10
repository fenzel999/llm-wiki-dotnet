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

- 2026-07-11 **Ingest（DTO 知识）**：新增 `architecture/dto.md`（数据传输对象）。
    - 来源：吸收企业级 DDD 文档中 DTO 章节思想（DTO 的必要性：抽象领域层/数据隐藏/序列化与延迟加载陷阱、输入输出 DTO 原则、列表与分页结果、请求上限校验、映射与校验）；按 [P14](governance/policy.md) 全部以**微软官方文档**表述与引用（微服务应用层实现、面向 DDD 的微服务设计），正文/标题/summary/source/参考资料**均不含 ABP 字样与 abp.io 链接**。
    - 落地约定：用 `record` 定义 DTO；输入 DTO 不复用、输出 DTO 可复用；分页用 `PagedResult<T>` 载体（[P15](governance/policy.md) 明确允许，非统一 Result 信封）；请求分页 DTO 带默认页大小 + 硬上限校验（超限 422）；排序走白名单；映射手写/LINQ 投影不用 AutoMapper（[P10](governance/policy.md)）；序列化用 System.Text.Json 源生成（[P16](governance/policy.md) AOT）。
    - 同步：mkdocs.yml（模块内部组新增）、index.md、思维导图.md；与既有 `domain-application-services.md`（DTO 手写映射）互补交叉链接，无矛盾。
    - 验证：`mkdocs build --strict` 通过；全库无 "ABP"/"abp.io" 泄漏。
    - 影响：architecture/dto.md、mkdocs.yml、index.md、思维导图.md、log.md。

- 2026-07-11 **Correct（中文乱码修复）**：修复 `architecture/adr.md`、`architecture/api-design.md` 两页的中文乱码。
    - 问题：上次提交（2e9d80e）写入这两页时，内容被以 GBK/cp936 误编码后再存为 UTF-8，全文中文变为 `鏋舵瀯...` 类乱码，且写入管线把部分字节替换为 `?`（0x3F），造成约 323 处不可逆丢字（多为顿号 `、`、连接词、箭头 `→`）。
    - 处理：对原文做逐行 `cp936→utf-8` 逆向恢复为脚手架，再据上下文补齐丢失字符，用干净 UTF-8 重写两页；结构、代码块、表格保持原意。
    - 验证：两页残留乱码行 0、`U+FFFD` 0；`mkdocs build --strict` 通过。其余 90 个 wiki 页面经全库扫描均正常，未受影响。
    - 影响：architecture/adr.md、architecture/api-design.md、log.md。

- 2026-07-10 **Correct（人工纠错）**：`solution-structure.md` 改为**模块化单体**布局。
    - 问题：上一版把顶层设成横切分层（MyApp.Domain/Application/Infrastructure 覆盖整个应用），即传统分层单体，与本库 [modular-monolith](architecture/modular-monolith.md) 偏好矛盾（用户指正）。
    - 修正：顶层改为**按业务模块切**（Modules/Orders、Modules/Billing…），每个模块内部再分 `Contracts/Domain/Application/Infrastructure`；**模块内依赖只向内**、**跨模块只引对方 `*.Contracts`**、Host 为唯一组合根、SharedKernel 放共享基元。补充退化情形说明（单一上下文小应用=单模块=横向分层，可接受）。
    - 与 modular-monolith.md 互补对齐（后者讲概念/通信/边界，本页讲 .csproj 布局与引用图），无重复矛盾。`mkdocs build --strict` 通过。
    - 影响：architecture/solution-structure.md。

- 2026-07-10 **巡检（Patrol #3）**：吸收"解决方案分层与项目引用"设计思想。
    - **Ingest**：新增 `architecture/solution-structure.md`，吸收"项目按 Domain/Application/Infrastructure/Web 分层、**依赖只向内单向无环**、契约项目轻依赖、仅组合根引用实现"这一设计思想（用户点名的"文件夹层级之间如何引用"）。厂商中立、不提 ABP；对齐本库约定（Minimal API 不用控制器、DbContext 直用不套仓储）；含标准目录树、引用箭头图、`Directory.Packages.props` 中央包管理、架构测试守边界。
    - **一致性修复（Q3/P5）**：`clean-architecture.md` 的 `IOrderRepository` 与 `ef-data-access.md`"不用仓储"存在张力——补一句说明：那是依赖倒置的**窄接口**（非通用 `Repository<T>`），默认仍直用 `DbContext`。
    - **锚点**：给 `modular-monolith.md` 架构测试小节加显式锚点 `{#用架构测试守住边界}` 供跨页深链。
    - **同步**：mkdocs.yml（架构风格组加新页）、index、思维导图、sources（加 CPM 链接）。`mkdocs build --strict` 零死链通过。
    - 影响：architecture/solution-structure.md（新）、architecture/clean-architecture.md、architecture/modular-monolith.md、mkdocs.yml、index.md、思维导图.md、sources/README.md。

- 2026-07-10 **巡检（Patrol #2）**：合规复扫 + 吸收新设计思想。
    - **合规复扫（P10/P12/P14）**：全库扫描第三方/付费/云绑定/ABP 字样——知识页**零违规**；剩余命中均为治理/日志记录、P14 规则本身、或"不用 X"教学提示（Newtonsoft/Dapper/Moq/Swashbuckle 等，均正确拒绝）。
    - **Ingest 新设计思想（厂商中立）**：补齐 DDD 拼图缺口——新增 `architecture/domain-events.md`（**聚合收集领域事件 + 在 SaveChanges 提交前用手写分发器派发，副作用与业务变更同一事务**）。对照微软官方 eShop「领域事件：设计与实现」文档；官方示例用 MediatR，本页按 [P10](governance/policy.md) 改**手写分发器 + EF Core 拦截器**。厘清与 event-driven 的边界：领域事件=进程内同事务，集成事件=跨服务+发件箱。
    - **同步**：mkdocs.yml（领域建模组加"领域事件"）、index、思维导图、sources；event-driven / enterprise-patterns 加反向链接。`mkdocs build --strict` 零死链通过。
    - 影响：architecture/domain-events.md（新）、architecture/event-driven.md、architecture/enterprise-patterns.md、mkdocs.yml、index.md、思维导图.md、sources/README.md。

- 2026-07-10 **巡检（Patrol）**：按 `governance/patrol.md` 全量执行，触发词"巡检"。
    - **新增 POLICY P14**：只吸收架构思想，知识页正文/标题/summary/source/参考资料**不得出现 "ABP" 与 `abp.io`**，一律用微软官方文档表述。
    - **去 ABP 命名**：`architecture/abp-inspired.md` → 重写为 `enterprise-patterns.md`（企业级架构模式导览，厂商中立）；specification-pattern/multi-tenancy/auditing-soft-delete/domain-application-services 四页的 `source` 与参考资料改为微软官方文档（EF Core 多租户/查询筛选器/拦截器、.NET 微服务 DDD 指南），删除所有 ABP 字样。
    - **P10 违规修复（发现旧内容仍推荐第三方）**：`patterns/composition.md` 把管道行为从 **MediatR** 改写为**手写装饰器**；`architecture/modular-monolith.md` 把进程内事件从 MediatR notification 改为**手写事件分发器**、架构测试从 **NetArchTest** 改为**内置反射手写**；`dotnet/fundamentals/testing.md` 清除 **Testcontainers** 残留（frontmatter + 正文）改内置 `Microsoft.Data.Sqlite`/手写脚本。
    - **P12 修复**：`standards/quality-engineering.md` 日志后端示例去 **Application Insights**，改开源自托管（Grafana Loki/ELK/Seq）。
    - **前沿核对（联网）**：确认 .NET 10 / C# 14 仍是当前 GA LTS（推荐生产）；.NET 11 / C# 15 处于预览（Preview 5，GA 2026-11，STS，勿用于生产）。新增 `dotnet/versions/net11.md`（status: preview，联合类型/封闭类层次/Runtime Async/JSON Lines/Zstandard），明确标注预览不入生产。
    - **同步**：mkdocs.yml（nav 改名 + 加 net11）、index.md、思维导图.md、sources/README.md；`mkdocs build --strict` 零死链通过。
    - 影响：policy.md、architecture/*（重命名 1 + 改 4）、patterns/composition.md、standards/quality-engineering.md、dotnet/fundamentals/testing.md、dotnet/versions/net11.md（新）、mkdocs.yml、index.md、思维导图.md、sources/README.md。

- 2026-07-10 **Ingest：从 ABP 汲取架构思想（厂商中立，5 新页）+ 定义巡检流程**：按你拍板"只吸收 ABP 架构思想、厂商中立重写"与"定义巡检指令按需触发"。
    - 联网核对 ABP 官方架构文档（DDD/模块化/多租户/规约/审计/事件总线），仅作**思想来源**，不引 `Volo.ABP.*`、不用控制器/付费模块/AutoMapper。
    - 新页：`architecture/abp-inspired.md`（导览：吸收什么/拒绝什么）、`specification-pattern.md`（手写表达式树规约）、`multi-tenancy.md`（EF 全局查询筛选器 + 租户解析中间件 + AsyncLocal）、`auditing-soft-delete.md`（`SaveChanges` 拦截器 + 全局筛选）、`domain-application-services.md`（领域/应用服务 + DTO 手写映射）。
    - 治理：新增 `governance/patrol.md` 巡检流程（人类说"巡检"即触发全量前沿核对→删旧换新→合规扫描→Lint→重排→build→push）。
    - 架构分类优化：nav/index/思维导图把"架构"重组为 架构风格 / 领域建模 / 横切与企业能力 三组 + 导览页。
    - 同步：mkdocs.yml、index.md、思维导图.md、sources/README.md；`mkdocs build --strict` 零死链通过。
    - 影响：architecture/*（+5）、governance/patrol.md（新）、mkdocs.yml、index.md、思维导图.md、sources/README.md。

- 2026-07-10 **可读性统一（P13 落地，全库 63 内容页）**：为每个内容页在正文前加"要点速览"（3–6 条 bullet），使人类可秒扫、AI 可零解析提取事实。
    - 本次会话 35 新页 + 28 旧种子页全部补齐；`grep 要点速览` 覆盖率 100%。
    - 新增 **POLICY P13**：页面结构对 AI/人类双友好（要点速览 + 固定小节 + ✅/❌ 好坏代码）。
    - `mkdocs build --strict` 通过。

- 2026-07-10 **Ingest（第 7 批，6 新页，全内置零第三方）**：按官方文档补齐常用横切能力。
    - `dotnet/aspnet-core/`：实时通信 SignalR、限流 rate-limiting（net7+ 内置四算法）、输入验证 validation（DataAnnotations，弃 FluentValidation）、输出缓存 output-caching（取代响应缓存）。
    - `dotnet/fundamentals/`：安全加固 data-protection（Data Protection + 机密管理）。
    - `dotnet/csharp/`：源生成器实战 source-generators（增量生成器取代旧 ISourceGenerator）。
    - 严守 P10/P11/P12：仅内置 API；验证/缓存/序列化以新写法取代旧；无付费/云绑定。
    - 同步 nav / index / 思维导图 / sources；`mkdocs build --strict` 通过。

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

## 2026-07-10 · 巡检 Patrol #4：吸收"统一异常处理"设计思想
- Ingest：新增 `dotnet/aspnet-core/exception-handling.md`——业务异常带错误码 + `IExceptionHandler`（net8+）全局映射为 `ProblemDetails`（RFC 9457）统一错误响应；按 P10 用微软内置、不引第三方，厂商中立不提 ABP；含 net10 诊断抑制说明。
- 同步：mkdocs.yml nav、index.md、思维导图.md、sources/README.md、middleware.md 互加链接、qa-report.md。
- 校验：`mkdocs build --strict` 零死链通过。
- 影响：dotnet/aspnet-core/exception-handling.md、dotnet/aspnet-core/middleware.md、mkdocs.yml、wiki/index.md、wiki/思维导图.md、wiki/sources/README.md、wiki/governance/qa-report.md。

## 2026-07-10 · Ingest/Correct #5：HTTP 状态码约定 + 分页 + 组合性 + AOT 约束
- 新规则：POLICY **P15**（API 用真实 HTTP 状态码 404/400/422，不用 Result 信封）、**P16**（后端严格 Native AOT 兼容、前端豁免）。
- Ingest：新增 `dotnet/ef-core/pagination.md`（应用层偏移分页 + 编译期表达式白名单动态排序 + PagedResult<T>；AOT 友好、非 Result 信封）。
- Correct：`exception-handling.md` 加状态码映射表/语义化异常子类/反 Result 信封/AOT 小节；`solution-structure.md` 补 SharedKernel 工具清单+层级分工表+单体↔微服务组合+AOT 小节；`modular-monolith.md` 新增二态部署 §6 + AOT 小节，修 UseNpgsql→UseSqlServer（P10）。
- 同步：mkdocs.yml、index.md、思维导图.md、policy.md、qa-report.md。
- 待办：后续巡检为其余后端页补 P16 的 AOT 兼容性小节（auth 的 cookie/OIDC、signalr 等）。
- 影响：wiki/dotnet/ef-core/pagination.md、wiki/dotnet/aspnet-core/exception-handling.md、wiki/architecture/solution-structure.md、wiki/architecture/modular-monolith.md、wiki/governance/policy.md、wiki/governance/qa-report.md、mkdocs.yml、wiki/index.md、wiki/思维导图.md。

## 2026-07-10 · P17 深度标准 + DI 页深写 + AOT 矩阵入库
- 新规则：POLICY **P17**（页面须自足、深度完整、能教会知识过时的 LLM 解决真实问题）。
- Correct：`dotnet/fundamentals/dependency-injection.md` 按 P17 重写为深度自足页——修正"主构造函数非 DI 必选项（只是 C# 12 语法糖）"，补齐键控服务(net8+)/IEnumerable 多注册/TryAdd*/工厂/开放泛型/IServiceScopeFactory/释放语义/装饰器/启动期校验/ActivatorUtilities + AOT 小节。
- Ingest：`dotnet/aot/aot-compatibility.md`（上一轮新建但漏挂导航）正式入 nav/index/思维导图，作为后端 AOT 规则中枢。
- 同步：mkdocs.yml、index.md、思维导图.md、policy.md、qa-report.md。
- 影响：wiki/governance/policy.md、wiki/dotnet/fundamentals/dependency-injection.md、wiki/dotnet/aot/aot-compatibility.md、mkdocs.yml、wiki/index.md、wiki/思维导图.md。

## 2026-07-10 · 全局清理 Round 1（分类/规范一致化）
- 小节名统一：7 页 反例（常见错误）→ 常见误区；AGENTS.md/CLAUDE.md 模板同步。
- tag 归一：30 页移除 tags 中的中文 tag，aspnetcore→aspnet-core、efcore→ef-core、裸 aot→native-aot。
- 修孤立链接：output-caching↔caching、rate-limiting/output-caching 入 middleware、data-protection 入 auth、concurrency/pagination/ef-vs-ado 入 ef-data-access。
- 迁移决策待定：patterns/composition.md 是否移到 dotnet/fundamentals/（内容属基础/Web），本轮保留，记于 qa-report。
- 影响：7 页正文、30 页 frontmatter、AGENTS.md、CLAUDE.md、middleware/auth/ef-data-access/caching 参考资料、qa-report。

## 2026-07-10 · 深写 Round 2：框架基础（fundamentals）完成
- 9 页全部按 P17 深写 + AOT 小节：config-options/observability/http-client/resilience/caching/background-services/data-protection 扩到深度完整；DI 前轮已完成。
- 测试扩展：testing.md 改总览；新增 integration-testing.md、test-doubles.md（均不引第三方 mock/容器库）。
- 同步：mkdocs.yml、index.md、思维导图.md、qa-report.md。
- 影响：wiki/dotnet/fundamentals/*（9 页）、wiki/dotnet/fundamentals/integration-testing.md、wiki/dotnet/fundamentals/test-doubles.md、mkdocs.yml、wiki/index.md、wiki/思维导图.md。

## 2026-07-10 · 深写 Round 3：Web / Minimal API（aspnet-core）完成
- 7 页全部按 P17 深写 + AOT 小节：auth（Cookie/OIDC ❌ 非 AOT、JWT ✅）、middleware、validation、rate-limiting、output-caching、signalr（🟡 部分）、aspnet-core-10（TypedResults/MapGroup/OpenAPI 3.1）。
- 影响：wiki/dotnet/aspnet-core/*（7 页）。

## 2026-07-10 · 修正：分页页升级为多字段动态排序
- dotnet/ef-core/pagination.md 采用用户提供的更完整实现：多字段排序（WithDynamicOrderBy + ThenBy）、DynamicOrderByAllowList（Map 从表达式树取属性名、不反射）、WithOffsetPaging 夹紧参数；AOT 说明同步更新。
- 影响：wiki/dotnet/ef-core/pagination.md（仅内容升级，未改结构）。

## 2026-07-10 · 架构澄清 + 分页升级
- solution-structure.md：逐层职责（负责/拥有/依赖/不碰）+ 落点速查表 + 高内聚低耦合节 + "三种架构不在同一层级"（Aspire⊥模块化单体⊃整洁架构）。
- 顺带：前次 dotnet/ef-core/pagination.md 多字段动态排序升级也一并提交。
- 影响：wiki/architecture/solution-structure.md、wiki/dotnet/ef-core/pagination.md、qa-report.md。

## 2026-07-11 · 架构分类重构（四分组）+ 薄页深写（Round A / Part 1）
- mkdocs.yml 架构段重组为四分组：**系统形态（System-Level）** / **模块内部（Module-Internal）** / **横切能力（Cross-Cutting）** / **部署与编排（Deployment）**（Aspire/容器/健康检查归部署组）。index.md、思维导图.md 同步。
- solution-structure.md 补显式锚点 `#arch-levels`/`#two-mode-deploy`；microservices.md 链接锚点修正。aspnet-core-10.md 补 `#minimal-api-validation`/`#openapi-3-1` 显式锚点（net8/net9/patterns 引用）。
- P17 深写（部署组 + 导览）：`cloud-native/health-checks.md`（liveness/readiness 语义表 + 自定义 IHealthCheck + AOT 小节）、`architecture/enterprise-patterns.md`（四层能力映射表 + 取舍）、`architecture/microservices.md`（系统形态定位 + 二态部署 + 最终一致 + Aspire 编排 + AOT 小节）。
- mkdocs build --strict 通过（修复 policy.md 相对路径深度）。
- 待续：architecture/ 薄页 P17 深写（clean-architecture、ddd、event-driven、cqrs、vertical-slice、domain-*、specification、multi-tenancy、auditing-soft-delete）。

## 2026-07-11 · 薄页 P17 深写（Round A / Part 2：架构全分类 + 部署 + 性能）
- architecture/ 全部 14 页按 P17 深写：每页补"定位（四种层级之一）+ 决策表 + 代码 + ≥3 误区（含 why）+ Native AOT 兼容性小节"，并互相交叉引用锚点（#arch-levels、#二态部署）。
  - 系统形态：microservices、vertical-slice 已 Part1；本轮补 modular-monolith/enterprise-patterns/solution-structure（前已完成）。
  - 模块内部：clean-architecture、ddd、domain-application-services、specification-pattern（均补"内层依赖倒置/富领域/AOT 安全"等）。
  - 横切能力：event-driven（领域事件 vs 集成事件表 + 发件箱 + 幂等）、cqrs（轻/重版决策表）、multi-tenancy（隔离模型选型 + 解析来源表）、auditing-soft-delete（IClock/ICurrentUser + 误用 DateTime.Now）、domain-events（前已完成）。
- 部署组：aspire（"部署层与架构正交"定位 + AppHost/ServiceDefaults 表 + AOT 协作）、containers（Dockerfile vs PublishContainer 决策表 + AOT 更小镜像）、health-checks（Part1 已完成）。
- 性能：benchmarking（定位 + 何时做基准决策表 + 读结果 + AOT 也要基准 + AOT 小节）。
- 严格校验：mkdocs build --strict 通过；中途修复（1）policy.md 相对路径深度（architecture 用 ../、cloud-native 用 ../../）；（2）composition.md 实际位于 patterns/ 而非 dotnet/fundamentals/，全部链接改正；（3）auditing-soft-delete 接口声明补分号。
- 影响：wiki/architecture/*.md（14 页）、wiki/cloud-native/aspire.md、wiki/cloud-native/containers.md、wiki/performance/benchmarking.md、wiki/log.md。

## 2026-07-11 · 薄页 P17 深写（Round B：comparisons + dotnet/csharp 基础）
- comparisons/ 4 页按 P17 深写：每页补决策表 + ≥3 误区（含 why）+ AOT 小节。
  - ef-vs-ado（何时下沉 ADO.NET 决策表 + 参数化示例 + EF/ADO 各自 AOT 说明）、record-vs-class（class vs record 选型表 + record struct + AOT 安全）、list-vs-immutablearray（构建期 Builder + .Empty vs default + AOT 安全）、rag-vs-llm-wiki（选型决策表 + 混合用法 + 与本库约束关系；source 改为 karpathy/llm-wiki 仓库）。
- dotnet/csharp/ 基础 4 页按 P17 深写：async-await（ConfigureAwait 决策表 + CancellationToken + async void/伪并行误区 + AOT 安全）、collections（选型决策表 + Frozen/Concurrent + AOT 安全）、linq（IEnumerable vs IQueryable 表 + 物化决策表 + 多次枚举误区 + AOT 说明）、serialization（反射 vs 源生成表 + AOT 必须源生成 + 路径修复）。
- 链接深度修复：dotnet/csharp/ 下引用 dotnet/aot、dotnet/ef-core、dotnet/fundamentals 应用 `../`（非 `../dotnet/`）；governance 用 `../../governance/`。
- mkdocs build --strict 通过。
- 影响：wiki/comparisons/*.md（4 页）、wiki/dotnet/csharp/async-await.md、collections.md、linq.md、serialization.md、wiki/log.md。

## 2026-07-11 · 薄页 P17 深写（Round C：dotnet/ef-core 基础）
- ef-core/ 基础 5 页按 P17 深写：query-performance（问题→解法决策表 + ToQueryString + AOT 需预编译查询）、migrations（本地 vs 生产部署对比表 + AOT 无关/设计期工具）、modeling-relationships（关系类型表 + OnDelete 显式 + AOT 需编译模型）、concurrency（乐观 vs 悲观表 + PostgreSQL xmin + 重试前 reload + AOT 安全）、ef-core-10（补 AOT 小节：JSON 列需源生成）。
- mkdocs build --strict 通过。
- 影响：wiki/dotnet/ef-core/query-performance.md、migrations.md、modeling-relationships.md、concurrency.md、ef-core-10.md、wiki/log.md。

## 2026-07-11 · 薄页 P17 深写（Round D：dotnet/performance + 验收）
- performance/ 2 页按 P17 深写：gc-memory（分配优化选型表 + struct 与 class 取舍 + AOT 下 GC 不变但需源生成）、diagnostics（症状→工具决策表 + 容器/K8s 用法 + AOT 同样可用，裁剪影响堆分析深度）。
- 所有后端核心页面（architecture、deployment、csharp、ef-core、fundamentals、performance）已完成 P17 深写。
- mkdocs build --strict 通过。
- 影响：wiki/performance/gc-memory.md、diagnostics.md、wiki/log.md。
