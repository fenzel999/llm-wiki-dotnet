---
title: 质量报告 QA-REPORT
summary: Agent 自审透明度报告——记录了什么、判对错、已修与待你判定项。
tags: [governance, report]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# QA-REPORT — 质量自审报告

本文件是 Agent 自审（Audit）的**透明度记录**：做了什么判断、改了什么、哪些在等你判定。
每次 Audit/Correct 后追加或更新本节内容。

---

## 最近一次自审

- 日期：2026-07-10（**Ingest/Correct #5** — HTTP 状态码约定 + 分页 + 组合性 + AOT 约束）
- 触发：人工反馈——① API 用真实 HTTP 状态码（404/400/422）而非 Result 包装；② 需要动态分页知识；③ 解决方案应支持自定义工具（规约父类/分页）与清晰层级分工；④ 模块要能像成熟企业框架那样自由组合（单体模块↔独立微服务）；⑤ **不支持 AOT 的模式不用**（后端严格 AOT，前端豁免）。
- 新增规则：**P15**（API 用真实 HTTP 状态码、不用 Result 信封）、**P16**（后端代码必须 Native AOT 兼容、前端豁免）。
- Ingest：新增 `dotnet/ef-core/pagination.md`——应用层偏移分页 + 编译期表达式白名单动态排序 + `PagedResult<T>`（明确它是数据载体，非 Result 信封），刻意用表达式白名单而非字符串反射以兼容 AOT。
- Correct：
  - `exception-handling.md` 加"HTTP 状态码映射表"、语义化异常子类（NotFound/Conflict）、反对 Result 信封（P15）、`### Native AOT 兼容性`（IExceptionHandler 无反射、JSON 用源生成）。
  - `solution-structure.md` 补 SharedKernel 自定义工具清单（规约基类/分页/BusinessException）、"层级分工"表、"单体↔微服务自由组合"段、AOT 小节。
  - `modular-monolith.md` 新增"§6 二态部署"（同模块两形态、只换接缝）、AOT 小节；修 P10 残留 `UseNpgsql`→`UseSqlServer`。
- 结论：`mkdocs build --strict` 待跑通过后提交。
- 待你判定：无。

### 待办（后续巡检）：P16 全库 AOT 合规扫描
P16 要求每个**后端主题页**补 `### Native AOT 兼容性` 小节。本轮仅覆盖新增/改动页，后续巡检需为其余后端页补齐并标注限制，重点：
- `dotnet/aspnet-core/auth.md`：cookie/OpenID Connect **不支持 AOT**，应显式标注并推荐 AOT 后端用 JWT Bearer（现主例已是 JWT）。
- `dotnet/aspnet-core/signalr.md`：AOT **部分支持**，需标注。
- 全库排查运行期反射/反射式 JSON 序列化/DI 程序集扫描，替换为源生成/显式注册。

- 日期：2026-07-10（**巡检 Patrol #4** — 吸收"统一异常处理"设计思想）
- 范围：Web 层横切能力缺口补齐 + 合规复扫。
- 结论：知识页 P10/P12/P14 持续零违规（复扫命中均为"不用 X"教学提示与治理记录）。
- Ingest：新增 `dotnet/aspnet-core/exception-handling.md`——吸收"业务异常携带错误码 + 全局集中映射为标准化错误响应"这一设计思想；用微软内置 `IExceptionHandler`（net8+）+ `ProblemDetails`（RFC 9457）+ `IProblemDetailsService` 表达，按 P10 不引第三方（如 Hellang），厂商中立不提 ABP。与 `middleware.md`（异常处理在管道最外层）、`validation.md`、`quality-engineering.md#exception-handling` 互补并互加链接。net10 诊断抑制行为已在"适用版本"注明。
- 前沿性：核对官方 error-handling 文档确认 `IExceptionHandler` / `AddProblemDetails` / `UseExceptionHandler` API 与 net10 `SuppressDiagnosticsCallback` 变更。`mkdocs build --strict` 零死链通过。
- 待你判定：无。

- 日期：2026-07-10（**Correct** — solution-structure 改为模块化单体布局）
- 触发：人工指正——上一版顶层用横切分层（整个应用一套 Domain/Application/Infrastructure），是传统分层单体，与本库 modular-monolith 偏好矛盾。
- 修正：`solution-structure.md` 顶层改为**按业务模块切**，模块内部再分层；跨模块只经 `*.Contracts`，Host 唯一组合根。与 `modular-monolith.md` 互补对齐（概念 vs .csproj 布局），消除矛盾（Q3）。`mkdocs build --strict` 通过。

- 日期：2026-07-10（**巡检 Patrol #3** — 吸收"解决方案分层与项目引用"设计思想）
- 范围：架构分层缺口补齐 + 一致性修复。
- Ingest：新增 `architecture/solution-structure.md`——项目分层（Domain/Application/Infrastructure/Web）与**单向无环引用规则**、契约轻依赖、组合根唯一绑定实现、架构测试守边界；厂商中立不提 ABP，对齐 Minimal API + DbContext-direct 约定，对照微软"常见 Web 应用体系结构"与"中央包管理"文档。
- 一致性（Q3/P5）：修复 `clean-architecture.md`（`IOrderRepository`）与 `ef-data-access.md`（不用仓储）张力——注明前者是依赖倒置窄接口、非通用仓储，默认仍直用 `DbContext`。
- 结论：知识页 P10/P12/P14 持续零违规；`mkdocs build --strict` 零死链通过。待你判定：无。

- 日期：2026-07-10（**巡检 Patrol #2** — 合规复扫 + 吸收新设计思想）
- 范围：全库合规复扫；DDD/架构缺口补齐。
- 结论：**知识页 P10/P12/P14 零违规**（上一轮整改已生效）；剩余 "第三方/ABP" 命中均为治理记录、P14 规则本身、或"不用 X"教学提示，均合规。
- Ingest：新增 `architecture/domain-events.md`，吸收"聚合收集领域事件 + 随工作单元（SaveChanges）延迟分发、副作用同事务"这一核心设计思想；对照微软 eShop 官方文档，官方用 MediatR → 本页按 P10 改**手写分发器 + EF Core 拦截器**。与 `event-driven.md`（跨服务集成事件 + 发件箱）划清边界，互加链接。
- 前沿性：延续 Patrol #1 结论——生产 .NET 10 LTS，.NET 11/C# 15 预览页已在库。`mkdocs build --strict` 零死链通过。
- 待你判定：无。

- 日期：2026-07-10（**巡检 Patrol** — 全库前沿核对 + P10/P12/P14 合规扫描 + 删旧换新）
- 范围：全库 78 页扫描；重点整改 architecture/*、patterns/composition、standards/quality-engineering、dotnet/fundamentals/testing、dotnet/versions。
- 结论：**新增 P14（正文不得提及 ABP）并落地**；**发现并修复 4 处 P10/P12 违规**（合规扫描比上一轮更严）：
  1. `patterns/composition.md` 管道行为原本教 **MediatR** → 改**手写装饰器**（内置 DI 逐层包裹）。
  2. `architecture/modular-monolith.md` 进程内事件用 **MediatR notification**、架构测试用 **NetArchTest** → 均改**手写**（DI 事件分发器 + 反射断言）。
  3. `dotnet/fundamentals/testing.md` frontmatter/正文仍推荐 **Testcontainers**（与自身正文矛盾）→ 统一为内置 `Microsoft.Data.Sqlite`/手写脚本。
  4. `standards/quality-engineering.md` 日志后端举例含 **Application Insights**（P12 付费/云绑定）→ 改开源自托管。
- 前沿性：联网核实 .NET 10/C# 14 为当前 GA LTS（生产推荐）；.NET 11/C# 15 仍预览（GA 2026-11）。新增 `dotnet/versions/net11.md`（status: preview），满足 Q2「预览不写成稳定承诺」。
- 去 ABP：`abp-inspired.md`→`enterprise-patterns.md`，4 架构页 source/参考资料改微软官方文档。`mkdocs build --strict` 零死链通过。

- 日期：2026-07-10（Ingest：从 ABP 汲取架构思想，厂商中立重写 5 新页 + 定义巡检流程）
- 范围：新增 `architecture/` 5 页（abp-inspired / specification-pattern / multi-tenancy / auditing-soft-delete / domain-application-services）+ `governance/patrol.md`。
- 结论：**两处 needs-your-call 已由你拍板并落地**——(1) ABP 只吸收架构思想、厂商中立重写（不引 `Volo.ABP.*`、不用控制器/付费模块/AutoMapper，遵守 P10/P12）；(2) "每 10 分钟自动整理"因 Agent 无常驻定时器不可行，改为**人类说"巡检"即触发**的 `patrol.md` 流程。
- 落实：ABP 架构文档仅作思想来源（DDD/模块化/多租户/规约/审计/事件总线）；实现全部微软内置 + 手写 + Minimal API。与既有 `ef-data-access.md`"不引仓储/UoW"、"不用控制器"保持一致（应用服务页明确拒绝 Repository/UoW/AutoMapper）。架构 nav 重组为 风格/建模/能力 三组。`mkdocs build --strict` 零死链通过。

- 日期：2026-07-10（六方向大规模 Ingest：26 新页，全部对照微软官方文档）
- 范围：后端核心 9 + C# 深化 3 + 数据访问 5 + 架构 6 + 云原生 3 + 性能诊断 3。
- 结论：**新增 POLICY P10/P11/P12 并全程遵守**——仅用微软/基金会包（xUnit/Polly/BenchmarkDotNet 属基金会），其余手写；删旧换新；不用付费/云绑定组件。
- 落实：testing 用手写测试替身（弃 Moq/FluentAssertions/Testcontainers）；数据访问对比为 EF vs ADO.NET（弃第三方 Dapper）；CQRS/事件驱动不用 MediatR；observability 去 Application Insights；序列化以 System.Text.Json 取代 Newtonsoft。`mkdocs build --strict` 通过。

- 日期：2026-07-10（全库 Audit + Correct：对照官方文档、删旧换新）
- 范围：20 个内容页 + 治理页；对照 Microsoft 官方 .NET 文档常识逐页判 Q1–Q7。
- 结论：**发现 2 处事实错误、2 个编码损坏文件，均已自修；其余 18 内容页通过**。
- 方法：内容审计由子代理逐页读取判定；编码损坏经全库扫描定位。修复后 `mkdocs build --strict` 通过（零死链）。

- 日期：2026-07-09（建库初始化 + 种子 + 构建验证）
- 范围：全库骨架、~51 种子页、MkDocs 构建（零死链）、graph.json（61 节点/274 边）
- 结论：结构、链接、可视化通过；.NET 10 / C# 14 新语法由子代理撰写，部分处标注了 `⚠️ needs-your-call`。

- 日期：2026-07-09（联网核实 + 订正）
- 范围：11 处 `⚠️ needs-your-call` 不确定点（C# 14 语法、.NET 10 内置验证/OpenAPI/EF Core/Blazor/PGO）
- 结论：**全部以 Microsoft 官方文档（Microsoft Learn / .NET Blog）为权威依据核实，确认无误**；
  并订正了「最小 API 验证」页误用的 `.WithValidation()`（实际无此 API，自动启用 + `.DisableValidation()` 关闭）
  与「Blazor JS 互操作」页补全新增的 `InvokeConstructorAsync` / 属性读写 API。全库已无 `⚠️` 标记。
- 方法：**质量报告中的不确定项一律以官方文档裁定，不依赖社区文章或主观猜测**；核实结果已逐页在「参考资料 → 官方文档」中给出原始链接。

## 已自修

| 日期 | 页面 | 改了什么 | 依据 |
|------|------|----------|------|
| 2026-07-10 | dotnet/csharp/async-await.md | 修正「并行组合」错误：`(await GetA(), await GetB())` 实为**串行**（从左到右求值）。改为先发起任务再统一 await，并提示 `Task.WhenAll` | C# 语言规范（表达式求值顺序） |
| 2026-07-10 | comparisons/list-vs-immutablearray.md | 修正对比表「空值」行：`List<T>` 变量可为 null；`default(ImmutableArray<T>)` 是未初始化态（访问抛异常），空集合须用 `ImmutableArray<T>.Empty` | .NET API 文档（ImmutableArray） |
| 2026-07-10 | governance/qa.md、governance/feedback.md | 两文件磁盘编码损坏（UTF-8 被按 GBK 双重编码，恢复有丢字）；按 AGENTS.md 与原结构用干净 UTF-8 重写 | 全库乱码扫描 |
| 2026-07-09 | dotnet/* 与 patterns/* | 修正子代理写错的相对链接深度（`../sources` ↔ `../../sources`、`../../dotnet` ↔ `../dotnet`） | Lint 死链扫描 |
| 2026-07-09 | dotnet/aspnet-core/aspnet-core-10.md | 删除不存在的 `.WithValidation()`；改为 `AddValidation()` 自动启用 + `.DisableValidation()` 关闭 | Microsoft Learn / 社区资料核实 |
| 2026-07-09 | dotnet/blazor/javascript-improvements.md | 补全 .NET 10 新增 JS 互操作 API：`InvokeConstructorAsync`、JS 对象属性读写 | ASP.NET Core 10 发行说明 |
| 2026-07-09 | 11 个 .NET 10 页 | 移除全部 `⚠️ needs-your-call` 标记（语法/API 均已确认） | 官方文档联网核实 |

## 待你判定（⚠️ needs-your-call）

> 无。上一轮 11 处不确定点已通过联网核实全部确认，详情见上方「已自修」。

## 官方依据（Microsoft 官方文档）

> 以下为本轮 11 处不确定点的裁定来源（均为 Microsoft 官方，非社区转载）。各页「参考资料 → 官方文档」已附相同链接。

| 页面 | 官方文档 |
|------|----------|
| dotnet/csharp/csharp-14.md | [What's new in C# 14](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-14) |
| dotnet/aot/file-based-apps.md | [File-based apps (.NET)](https://learn.microsoft.com/dotnet/core/sdk/file-based-apps) |
| dotnet/aspnet-core/aspnet-core-10.md | [What's new in ASP.NET Core 10](https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0) |
| dotnet/ef-core/ef-core-10.md | [What's new in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew) |
| dotnet/runtime/jit-optimizations.md | [.NET runtime compilation config (PGO)](https://learn.microsoft.com/dotnet/core/runtime-config/compilation) |
| dotnet/blazor/javascript-improvements.md | [What's new in ASP.NET Core 10 (Blazor)](https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0) |

## 待办（Lint 发现）

- [ ] 种子页全部写完后跑首轮全量 Audit，逐页回填 Q1–Q7 判定。
- [x] 校验 `wiki/思维导图.md` 节点可点击跳转、分类清晰：已由**自写 CSS + 原生 JS** 实现（无 markmap / 无 CDN 依赖），折叠展开与点击跳转均正常。
