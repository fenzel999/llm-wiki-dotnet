---
title: 整洁架构（Clean Architecture）
summary: 依赖只能向内指向领域核心，基础设施与 UI 都是可替换的外层，用接口在内层定义、外层实现。
tags: [architecture, clean-architecture, 分层, 依赖倒置]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
updated: 2026-07-10
---

## 概述

整洁架构（Clean Architecture，又称洋葱/六边形架构的一类）的一条铁律是：**依赖方向只能向内**。最内层是**领域（Domain）**——实体与业务规则，不依赖任何框架；外一层是**应用（Application）**——用例编排，定义它需要的接口（如 `IOrderRepository`）；最外层是**基础设施（Infrastructure）**与 **表现（Web/UI）**——数据库、EF Core、HTTP 都在这里，它们**实现**内层定义的接口。

这样做的回报是：核心业务逻辑不被数据库、Web 框架、第三方库"绑架"，可以独立测试、可以替换 EF Core 为别的存储而不动领域代码。实现手段是**依赖倒置**：内层声明接口，外层提供实现，运行时由 DI 容器在最外层把实现注入进来。

## 正确做法

内层定义接口，外层实现；依赖在启动处（Composition Root）组装：

```csharp
// Application 层（内）：只定义抽象
public interface IOrderRepository { Task<Order?> GetAsync(int id); }

public class PlaceOrderHandler(IOrderRepository repo)   // 用例，不认识 EF Core
{
    public async Task Handle(int id) { var o = await repo.GetAsync(id); /* 业务规则 */ }
}

// Infrastructure 层（外）：实现抽象，依赖 EF Core
public class EfOrderRepository(AppDbContext db) : IOrderRepository
{
    public Task<Order?> GetAsync(int id) => db.Orders.FindAsync(id).AsTask();
}

// Web 层（最外）：组装
builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
```

## 常见误区

❌ 让领域/应用层直接引用 `Microsoft.EntityFrameworkCore` 或 `AppDbContext`，依赖方向反了，核心被基础设施绑死。内层只依赖自己定义的接口。

❌ 把业务规则写进控制器或 `DbContext`，各层职责糊成一团。业务规则归领域/应用层。

❌ 为了"整洁"给一个 CRUD 小项目套五层 + 一堆接口，过度设计。分层强度应与复杂度匹配，简单项目 [模块化单体](modular-monolith.md) 足矣。

## 适用版本

架构模式与语言/版本无关，全版本适用。

## 参考资料

- [模块化单体架构](modular-monolith.md)
- [领域驱动设计](ddd.md)
- [依赖注入](../dotnet/fundamentals/dependency-injection.md)
- 官方文档：[常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
