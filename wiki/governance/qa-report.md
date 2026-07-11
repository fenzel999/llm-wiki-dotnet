---
title: 自审报告
summary: 最近一次全库质量自审（Audit）与校正（Correct）的结论与待判定项。
tags: [governance, qa]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-11
---

# qa-report — 自审报告

按 [AGENTS.md](../../AGENTS.md) 的 Audit / Correct 流程维护。每次全库巡检后更新。

## 最近一次：2026-07-11 全库内容巡检

对全库 `wiki/`（架构、ASP.NET Core、EF Core、AOT、性能、对比、标准等）做并行子代理审计，依据 POLICY（P1/P10/P12/P14/P15/P16）与「代码可编译、无自相矛盾、厂商中立」原则逐项判定。

### 已修复（对/错结论明确，直接 Correct）

| 页面 | 问题 | 结论 | 修复 |
|------|------|------|------|
| architecture/auditing-soft-delete.md:32 | 接口属性后多余 `;` | 错（编译错误） | 删除 `;` |
| dotnet/fundamentals/caching.md:79 | `IDCache` 拼写错误 | 错 | → `IDistributedCache` |
| dotnet/aspnet-core/signalr.md:83 | `OthersInGroup(Context.ConnectionId)` | 错（connectionId 非 group 名） | → `Clients.Others` |
| dotnet/aspnet-core/aspnet-core-10.md:56 | 非法字符串插值 `$"/orders/{...}"` | 错（编译错误） | → `$"/orders/{cmd.Id}"` |
| dotnet/aspnet-core/validation.md:62 | 捏造 `.WithValidationFilter()` | 错（net10 无此 API） | 删除，说明内置 `AddValidation` 全局生效 |
| dotnet/aspnet-core/aspnet-core-10.md:70 | 推荐第三方 Scalar UI | 错（违反 P10） | 改为仅说明内置 `AddOpenApi` 生成 JSON |
| architecture/event-sourcing.md:94 | `Apply((dynamic)e)` 与自身 AOT 规则矛盾 | 错 | 显式 `switch` 分发 |
| architecture/hexagonal-architecture.md:193 | 常见误区示例仍用 `IOrderRepository` | 错（与"不用仓储模式"矛盾） | → `IPricingPort` |
| architecture/architecture-tests.md:221 | `Assert.True(... || true)` 恒真 | 错（测试无意义） | → `offenders.Count == 0` |
| dotnet/ef-core/ef-data-access.md:79 | 误导"InMemory 跑单测" | 错（与测试页矛盾） | 改为 SQLite/真实库集成测试 |
| dotnet/aspnet-core/auth.md:79 | MVC `[Authorize(AuthenticationSchemes=...)]` | 错（与 Minimal API 主线不符） | 改为策略 + `RequireAuthorization` |
| dotnet/ef-core/pagination.md / standards/quality-engineering.md | 旧 `static class`+`this` 扩展方法 | 旧惯用法（违反 P1） | 改 C# 14 `extension` 块 |
| comparisons/net-evolution.md:84 | 错写 `extension X for Y` | 错（语法不存在） | → 正确 `extension(<Type> <p>)` |
| architecture/bounded-context.md / architecture/api-gateway-bff.md | 反射式 JSON 反序列化却称 AOT 安全 | 错（自相矛盾） | 传入 `JsonSerializerContext` 源生成上下文 |
| dotnet/aot/native-aot.md:27-39 | csproj/CLI 误用 ```csharp 围栏 | 错（语言标注） | → ```xml / ```bash |
| architecture/saga.md:62,83 | `IRepository` 命名与"不用仓储模式"冲突 | 存疑→改 | → `IInventoryStore` / `ICreditStore` |
| comparisons/net-evolution.md:37 | .NET 9 未标 EOL | 过时 | 标 `（EOL）`（支持 2026-05 截止） |

### 待你判定（拿不准，未静默改写）

- **performance/aot-performance.md — 静态 PGO 命令/产物名存疑**：原表中 `dotnet run --profile`、`.mib` 文件、`EnableAotPgo` 等精确命令在 .NET 10 仍为实验性且端到端工具链"未完整文档化"（见 dotnet/runtime #79003）。已把捏造的具体 flag 软化，并保留 `⚠️ needs-your-call` 标记。需要你确认 .NET 10 官方文档里的真实 PGO 采集/反馈命令后再定稿。

### 已知局限（本次未深改，低优先级）

- 部分对比页（`api-design.md`、`microservices.md`）的 JSON 反序列化示例仍用反射式写法，但其 AOT 小节已声明需源生成；未逐一改为传上下文，避免大范围改动引入新错。后续可统一收敛。

### 结论

除"静态 PGO 精确命令"一项需你判定外，其余问题均已按 POLICY 与可编译性直接修复，`mkdocs build --strict` 通过。
