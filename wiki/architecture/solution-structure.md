---
title: 解决方案分层与项目引用规则
summary: 顶层按业务模块切，每个模块内部再分层；模块内依赖只向内、跨模块只经 Contracts，组合根统一装配。
tags: [architecture, solution, project-layout, modular-monolith, dependencies]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
updated: 2026-07-10
---

# 解决方案分层与项目引用规则

> **要点速览**
> - **顶层按业务模块切**（Orders / Billing / Identity），**不是**按技术层切整个应用——这是[模块化单体](modular-monolith.md)的落地形态。
> - **每个模块内部再分层**：`Contracts`（公开表面）+ `Domain` + `Application` + `Infrastructure`。
> - **模块内依赖只向内、单向无环**；**跨模块只能引用对方的 `*.Contracts`**，绝不碰其 Domain/Application/Infrastructure。
> - 只有 **Host（组合根）** 装配所有模块的实现；契约项目保持轻依赖。用架构测试守边界。

## 概述

项目怎么分、谁能引用谁，决定了架构能否长期不腐化。**关键原则：顶层先按业务能力（模块）切，再在每个模块内部分层**——而不是把整个应用横切成一套 `Domain/Application/Infrastructure` 大项目。后者是传统**分层单体**：业务改一处要横跨所有层项目，模块之间没有真正的边界。我们默认采用[模块化单体](modular-monolith.md)：每个模块是一个自包含的业务切片，内部自有分层，对外只暴露一层很窄的契约。

> 单一限界上下文的小应用是这套结构的**退化情形**：它就只有一个模块，看起来像普通的横向分层——这没问题。等出现第二个业务能力时，就该按模块拆，而不是继续往同一套层项目里堆。

## 正确做法

顶层按模块组织，模块内部分层（配合本库约定：[Minimal API](../dotnet/aspnet-core/aspnet-core-10.md) 不用控制器、[直接用 `DbContext`](../dotnet/ef-core/ef-data-access.md) 不套仓储）：

```text
MyApp.sln
├── Directory.Packages.props          # 中央包版本管理（内置）
├── Directory.Build.props             # 共享编译设置（Nullable/LangVersion）
├── src/
│   ├── Host/
│   │   └── MyApp.Host                # ★组合根：Program.cs + 装配各模块 + Minimal API 映射
│   ├── Shared/
│   │   └── MyApp.SharedKernel        # 跨模块共享的基元与自定义工具（见下）；零业务
│   └── Modules/
│       ├── Orders/
│       │   ├── MyApp.Orders.Contracts       # ★公开表面：DTO + 接口 + 集成事件；轻依赖
│       │   ├── MyApp.Orders.Domain          # 实体/值对象/领域事件；引用 SharedKernel
│       │   ├── MyApp.Orders.Application      # 应用服务(internal)；引用 Domain + 本模块 Contracts
│       │   └── MyApp.Orders.Infrastructure  # OrdersDbContext/EF 配置；引用 Application
│       └── Billing/
│           ├── MyApp.Billing.Contracts
│           ├── MyApp.Billing.Domain
│           ├── MyApp.Billing.Application
│           └── MyApp.Billing.Infrastructure
└── tests/
    ├── MyApp.Orders.Tests            # 引用 Orders.* 各项目
    └── MyApp.IntegrationTests        # 引用 Host
```

引用规则（箭头表示"引用"）：

```text
模块内（依赖只向内）：
  Infrastructure ──► Application ──► Domain ──► SharedKernel
                         └────────► Contracts（本模块公开表面，轻依赖）

跨模块（只经契约）：
  Orders.Application ──► Billing.Contracts        ✅ 只引对方契约
  Orders.Application ──► Billing.Application       ❌ 绝不碰对方内部

组合根：
  Host ──► 每个模块的 Infrastructure（为注册）+ 所有 Contracts
```

- **Contracts**：只含 DTO、服务接口、集成事件；只引 `SharedKernel`（或零依赖）。别的模块要调你，只引这个项目，拿不到你的实现。
- **Domain / Application / Infrastructure**：模块内部逐层向内依赖，类型**默认 `internal`**，用编译器强制边界（见[模块化单体](modular-monolith.md)）。
- **Host**：唯一的组合根，把接口↔实现在 `Program.cs` 里绑起来，是唯一"看得到全部模块"的项目。

### SharedKernel：放"自定义工具/基类"的地方

需要跨模块复用的**自定义基类与工具**——不属于任何单一业务模块的通用能力——集中放在 `SharedKernel`，各模块引用它。典型内容：

- **领域基元**：`Entity`/`AggregateRoot` 基类、`ValueObject`、领域事件接口 `IDomainEvent`。
- **[规约模式](specification-pattern.md)基类** `Specification<T>`：可组合的查询条件基类，供各模块领域/应用层继承。
- **[分页与动态排序](../dotnet/ef-core/pagination.md)**：`PagedResult<T>`、`PageRequest`、`IQueryable` 分页/排序扩展。
- **横切基础**：`BusinessException` 基类（供[全局异常处理](../dotnet/aspnet-core/exception-handling.md)映射）、`IClock` 之类的抽象。

原则：SharedKernel **只放稳定、通用、零业务**的东西。带具体业务语义的类型属于对应模块，不要往这里塞——它被所有模块引用，一旦掺入业务就会变成新的耦合中心。

### 层级分工：谁负责什么

边界清晰的前提是每层职责单一。同一件事只在一层做：

| 层 | 职责 | 举例 | 不该出现 |
|----|------|------|----------|
| **Contracts** | 对外公开表面 | DTO、服务接口、集成事件 | 实现、EF 依赖 |
| **Domain** | 业务规则与不变量 | 实体/值对象/领域事件、规约定义 | 分页、`DbContext`、HTTP |
| **Application** | 用例编排 | 应用服务、事务边界、**分页/排序查询**、投影成 DTO | 领域规则、SQL 细节 |
| **Infrastructure** | 技术实现 | `DbContext`/EF 配置、外部客户端、消息发送 | 业务决策 |
| **Host** | 组合根 | DI 装配、Minimal API 端点映射、中间件管道 | 业务逻辑 |
| **SharedKernel** | 跨模块通用基元 | 基类、`PagedResult<T>`、规约基类 | 任何业务语义 |

> 举例落点：**分页只在应用层**（`OrderQueryService` 里 `Skip/Take`），领域层不感知分页；规约在**领域层定义**、被应用/基础设施**消费**；`DbContext` 只属于 **Infrastructure**。

### 自由组合：单体模块 ↔ 独立微服务 {#two-mode-deploy}

因为跨模块只依赖 `*.Contracts`，这套结构支持**同一份模块代码二态部署**：进程内组装成[模块化单体](modular-monolith.md)，或独立宿主成微服务——切换时模块内部不变，只在组合根替换"接缝"（本地实现↔远程客户端、进程内事件↔集成事件）。详见[模块化单体 · 二态部署](modular-monolith.md#二态部署)。

### 三种架构不在同一层级（别并列理解） {#arch-levels}

容易混淆的是：本库把「模块化单体」「整洁架构」「Aspire」都放在「架构」下，但它们是**不同层级**的概念，不是平级可二选一的方案：

| 概念 | 所处层级 | 回答的问题 |
|------|----------|------------|
| **Aspire** | 部署/编排层 | 怎么把服务/容器编排起来、统一配置与可观测性（**与代码内部结构正交**） |
| **模块化单体** | 系统/部署形态层 | 整个应用怎么按业务模块切、单进程还是多服务部署 |
| **整洁架构（端口/适配器）** | 模块**内部**代码层 | 单个模块内部怎么分层、依赖怎么向内 |
| DDD / 规约 / 领域事件 | 模块内**领域/应用**层 | 业务怎么建模 |

关键关系：

- **整洁架构 ⊂ 模块化单体内部**：每个模块的 `Contracts/Domain/Application/Infrastructure` 正是整洁架构在该模块上的落地——它不站在模块化单体"对面"，而是在它"里面"。所以本库既讲模块化单体（模块边界），又讲整洁架构（模块内分层），二者互补而非互斥。
- **Aspire 与代码结构正交**：Aspire 编排的是**进程/服务**（含数据库、缓存、消息），不关心你模块内部是整洁架构还是别的。一个 Aspire 应用模型既可以编排**单体进程**（模块化单体跑在一个 App Host 里），也可以编排**多微服务**——代码内部的整洁架构分层不受影响。换言之，**解决方案架构与 Aspire 天然协作**：Aspire 负责"怎么跑起来+连起来"，模块化单体+整洁架构负责"代码怎么组织"，各管一层。
- 选型的真实维度是：**先定系统形态（单体 vs 微服务，见[模块化单体](modular-monolith.md)）→ 再定每个模块内部的分层（整洁架构）→ 最后用 Aspire 等做部署编排（见[.NET Aspire](../cloud-native/aspire.md)）**。它们不是"三选一"。

组合根只是把各模块拼起来（每模块自带注册入口，细节见[模块化单体](modular-monolith.md)）：

```csharp
// MyApp.Host / Program.cs —— 唯一装配实现的项目
builder.Services
    .AddOrdersModule(builder.Configuration)      // 各模块自带的注册扩展
    .AddBillingModule(builder.Configuration);

var app = builder.Build();
app.MapOrdersEndpoints();                         // 各模块自带的 Minimal API 端点
app.MapBillingEndpoints();
app.Run();
```

边界靠**架构测试**守住（内置反射手写，不引第三方，见[模块化单体](modular-monolith.md#用架构测试守住边界)）：断言某模块不引用另一模块的内部命名空间、Domain 不引用 `Microsoft.EntityFrameworkCore`。

## 常见误区

❌ **顶层就是 `MyApp.Domain` / `MyApp.Application` / `MyApp.Infrastructure`，把整个应用横切分层**。这是传统分层单体，不是模块化——业务改一处横跨所有层项目，模块间无真实边界。多能力应用应**顶层按模块切**。

❌ **跨模块引用对方的 Domain/Application/Infrastructure**。只能引对方 `*.Contracts`，或通过[进程内领域事件](domain-events.md)通信。

❌ **把实现或 EF 依赖塞进 Contracts**。契约要轻，否则消费方一引契约就被拖入你的实现依赖。

❌ **Domain 反向引用 Infrastructure / EF Core**，核心被数据库绑死。依赖只能向内，用[依赖倒置](clean-architecture.md)把实现留在外层。

❌ **循环引用**（模块 A↔B 或层间成环）。项目引用必须是单向无环的有向图；成环说明边界切错了。

## 适用版本

分层与引用规则与版本无关。`Directory.Packages.props` 中央包管理 net6+ SDK 支持；示例面向 net8+。

### Native AOT 兼容性

这套布局**天然利于后端 AOT**（[P16](../governance/policy.md)）：Host 用 Minimal API（AOT 支持）、模块**显式注册**不做程序集扫描、SharedKernel 里的工具（规约表达式、分页扩展）都是编译期已知、无运行期反射。EF Core 在 AOT 发布下需编译模型/预编译查询。前端（Blazor）项目不在此约束内。

## 参考资料

- [模块化单体（模块边界/通信/架构测试）](modular-monolith.md) · [整洁架构（模块内依赖方向）](clean-architecture.md) · [垂直切片](vertical-slice.md)
- [领域事件（跨模块进程内通信）](domain-events.md) · [企业级架构模式（导览）](enterprise-patterns.md)
- [EF Core 数据访问（DbContext 归模块 Infrastructure）](../dotnet/ef-core/ef-data-access.md)
- 官方文档：[常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) · [中央包管理](https://learn.microsoft.com/nuget/consume-packages/central-package-management)
