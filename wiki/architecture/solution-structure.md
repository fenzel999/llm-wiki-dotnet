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
│   │   └── MyApp.SharedKernel        # 跨模块共享的领域基元（Entity 基类/领域事件接口）；零业务
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

## 参考资料

- [模块化单体（模块边界/通信/架构测试）](modular-monolith.md) · [整洁架构（模块内依赖方向）](clean-architecture.md) · [垂直切片](vertical-slice.md)
- [领域事件（跨模块进程内通信）](domain-events.md) · [企业级架构模式（导览）](enterprise-patterns.md)
- [EF Core 数据访问（DbContext 归模块 Infrastructure）](../dotnet/ef-core/ef-data-access.md)
- 官方文档：[常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) · [中央包管理](https://learn.microsoft.com/nuget/consume-packages/central-package-management)
