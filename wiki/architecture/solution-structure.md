---
title: 解决方案分层与项目引用规则
summary: 按 Domain/Application/Infrastructure/Web 分项目，依赖只向内、单向无环；契约项目轻依赖，仅组合根引用实现。
tags: [architecture, solution, project-layout, layering, dependencies]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
updated: 2026-07-10
---

# 解决方案分层与项目引用规则

> **要点速览**
> - 分四个项目：**Domain**（核心，零框架依赖）、**Application**（用例 + DTO）、**Infrastructure**（EF Core/外部实现）、**Web**（组合根 + Minimal API）。
> - **依赖只向内、单向无环**：`Web → Infrastructure → Application → Domain`；Domain 不引用任何人。
> - **契约轻依赖**：DTO 与服务接口若要被别的模块/服务复用，单独放 `*.Contracts`，消费方只引契约、不被实现拖累。
> - **只有组合根（Web）引用实现**；其余层只依赖抽象。用架构测试守住这些边界。

## 概述

项目怎么分、谁能引用谁，是架构能否长期不腐化的关键。核心思想是把系统按**关注点**切成几个独立的 `.csproj`，并规定**严格的单向引用规则**——依赖永远指向更稳定、更核心的一侧，绝不反向、绝不成环。这样"业务核心"不会被数据库、Web 框架、外部服务污染，替换存储或升级框架都不动核心代码。

本库的标准布局（按[整洁架构](clean-architecture.md)的依赖方向，配合我们的约定：[Minimal API](../dotnet/aspnet-core/aspnet-core-10.md) 不用控制器、[直接用 `DbContext`](../dotnet/ef-core/ef-data-access.md) 不套仓储）：

```text
MyApp.sln
├── Directory.Packages.props     # 中央包版本管理（内置）
├── Directory.Build.props        # 共享编译设置（Nullable/LangVersion 等）
├── src/
│   ├── MyApp.Domain             # 实体/值对象/领域服务/领域事件；★零框架依赖
│   ├── MyApp.Application        # 应用服务/用例编排/DTO；引用 Domain
│   ├── MyApp.Infrastructure     # DbContext/EF 配置/外部集成实现；引用 Application、Domain
│   └── MyApp.Web                # ★组合根：Minimal API 端点 + Program.cs + DI 组装；引用 Infrastructure
└── tests/
    ├── MyApp.UnitTests          # 引用 Domain / Application
    └── MyApp.IntegrationTests   # 引用 Web
```

## 正确做法

引用规则（箭头表示"引用"，越靠右越核心稳定）：

```text
Web ──► Infrastructure ──► Application ──► Domain
 └──────────────────────────────────────►┘  (端点可直接用 Domain 类型)
```

- **Domain**：只含业务，**不引用** EF Core、ASP.NET Core 或任何外部框架，可脱离一切独立单测。
- **Application**：编排用例、定义 DTO；只引用 Domain。需要与外部世界打交道时，**在此声明窄接口**（如 `IEmailSender`），实现放 Infrastructure（[依赖倒置](clean-architecture.md)）。
- **Infrastructure**：放 `DbContext`、EF 实体配置、`IEmailSender` 实现等；引用 Application、Domain。
- **Web**：唯一的**组合根（Composition Root）**——在 `Program.cs` 把接口和实现用 DI 绑起来，Minimal API 端点在这里定义。

契约复用：当**别的模块或服务**要调用你，又不想拉进你的实现时，把 DTO + 服务接口单独抽到一个**轻依赖**的 `MyApp.Application.Contracts` 项目，消费方只引它：

```text
MyApp.Application.Contracts   # 只有 DTO + 接口 + 共享常量/枚举，几乎零依赖
        ▲                ▲
        │                │
MyApp.Application     其它模块/服务（只引契约，拿不到实现）
```

组合根是唯一知道"接口↔实现"映射的地方：

```csharp
// MyApp.Web / Program.cs —— 唯一引用实现的项目
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(cs));   // Infrastructure
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();            // 抽象→实现在此绑定
builder.Services.AddScoped<PlaceOrderHandler>();                        // Application 用例

app.MapPost("/orders", async (CreateOrderDto dto, PlaceOrderHandler h) => Results.Ok(await h.Handle(dto)));
```

边界靠**架构测试**守住（用内置反射手写，不引第三方，见[模块化单体](modular-monolith.md#用架构测试守住边界)）：断言 Domain 程序集不引用 `Microsoft.EntityFrameworkCore` 等。

## 常见误区

❌ **Domain 引用 Infrastructure / EF Core**（反向依赖），核心被数据库绑死。依赖只能向内，用依赖倒置把实现留在外层。

❌ **把 DTO 塞进 Domain**。DTO 是应用层的边界对象，放进 Domain 会让核心被"传输格式"污染。DTO 归 Application/Contracts。

❌ **每层都引用 Infrastructure** 或直接 `new` 实现类，绕过组合根。只有 Web（组合根）能引用实现，其余层只依赖抽象。

❌ **循环引用**（A→B 且 B→A）。项目引用必须是单向无环的有向图；出现环说明职责切错了。

❌ **按技术类型建文件夹当模块**（`Controllers/`、`Services/`、`Repositories/`）。那是分层不是模块化；文件夹应按**业务能力**切（呼应[垂直切片](vertical-slice.md)、[模块化单体](modular-monolith.md)）。

## 适用版本

分层与项目引用规则与版本无关。`Directory.Packages.props` 中央包管理 net6+ SDK 支持；示例面向 net8+。

## 参考资料

- [整洁架构（依赖方向）](clean-architecture.md) · [模块化单体（模块边界 + 架构测试）](modular-monolith.md) · [垂直切片](vertical-slice.md)
- [企业级架构模式（导览）](enterprise-patterns.md)
- [EF Core 数据访问（DbContext 归 Infrastructure）](../dotnet/ef-core/ef-data-access.md)
- 官方文档：[常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) · [中央包管理](https://learn.microsoft.com/nuget/consume-packages/central-package-management)
