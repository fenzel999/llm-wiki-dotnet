---
title: 整洁架构（Clean Architecture）
summary: 模块内部的分层方式——依赖只向内指向领域核心；接口在内层定义、外层实现，便于测试与替换存储；AOT 友好。
tags: [architecture, clean-architecture]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures
updated: 2026-07-11
---

# 整洁架构（Clean Architecture）

> **要点速览**
> - **定位**：整洁架构是**模块内部（Module-Internal）**的分层方式（与[解决方案分层](solution-structure.md#arch-levels)一致），解决"一个模块内部的代码怎么分层"，和"拆不拆微服务"不是同一层级。
> - **铁律**：依赖方向**只向内**（Web/Infrastructure → Application → Domain）。外层可见内层，内层**绝不**引用外层（EF Core、ASP.NET、第三方库都不出现）。
> - **武器**：依赖倒置（DIP）——内层用接口说话，外层实现接口，启动处（Composition Root）组装。
> - **回报**：领域/应用层可脱离数据库与 Web 独立做单元测试；存储可替换。
> - **克制**：不是每个 CRUD 都要接口。多数项目[直接注入 `DbContext`](../dotnet/ef-core/ef-data-access.md)即可；只在需要"领域层彻底不认识持久化框架"时才引入窄接口。

## 概述

整洁架构（Clean Architecture，与洋葱架构、六边形架构同源）把代码按"离业务核心的距离"分成若干同心环。**越靠内越抽象、越不依赖框架；越靠外越具体**。一条铁律贯穿始终：

> **源码依赖只允许指向内圈。** 外层可以知道内层，内层不得知道外层。

典型四环（由内到外）：

| 环 | 职责 | 可依赖 |
|----|------|--------|
| **领域 Domain** | 实体、值对象、领域服务、领域事件、业务不变量 | 只依赖自己 |
| **应用 Application** | 用例编排（命令/查询处理器）、应用服务、接口定义 | Domain |
| **基础设施 Infrastructure** | EF Core、`DbContext`、HTTP 客户端、消息、外部存储 | Domain + Application 的接口 |
| **表现/宿主 Presentation** | Minimal API、程序入口、DI 注册（Composition Root） | 以上全部 |

为什么这么做：把"会变的东西"（数据库技术、Web 框架、第三方 SDK）推到外层，让"不该变的东西"（业务规则）留在内核。于是：

- **可测试性**：用例处理器只依赖接口，用[手写替身](../dotnet/fundamentals/test-doubles.md)就能在内存里测业务，不用真数据库。
- **可替换性**：把 EF Core 换成别的微软官方存储（如原生 ADO.NET / `FromSql`），只动基础设施层，领域/应用不动。
- **可演化性**：Web 框架升级、加 gRPC 入口，不影响业务核心。

## 正确做法

### 1. 内层定义接口，外层实现，启动处组装

```csharp
// ── Application 层（内）：只定义抽象，不认识 EF Core ──
public interface IOrderRepository
{
    Task<Order?> GetAsync(int id, CancellationToken ct);
    Task AddAsync(Order order, CancellationToken ct);
}

public class PlaceOrderHandler(IOrderRepository repo)   // 用例，依赖接口
{
    public async Task<Order> Handle(PlaceOrder cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.Items);
        await repo.AddAsync(order, ct);
        return order;
    }
}

// ── Infrastructure 层（外）：实现抽象，依赖 EF Core ──
public sealed class EfOrderRepository(AppDbContext db) : IOrderRepository
{
    public Task<Order?> GetAsync(int id, CancellationToken ct)
        => db.Orders.FindAsync(id, ct).AsTask();
    public Task AddAsync(Order order, CancellationToken ct)
        => db.Orders.AddAsync(order, ct);
}

// ── Presentation 层（最外，Composition Root）：唯一知道具体实现的地方 ──
builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
```

注意：`IOrderRepository` 是**为依赖倒置服务的窄接口**（让应用层不认识 `AppDbContext`），不是通用 `Repository<T>`/UoW 抽象。

### 2. 何时引入窄接口？决策表

| 你的需要 | 做法 | 理由 |
|----------|------|------|
| 应用层要直接查数据 | 直接注入 `DbContext` | 本身即仓储+UoW，零抽象（见 [EF 数据访问](../dotnet/ef-core/ef-data-access.md)） |
| 领域层要完全脱离持久化框架做单测 | 引入 `IOrderRepository` 等窄接口 | 内层不沾 EF，测试可换替身 |
| 需要切换存储实现（如测试用内存、生产用 SQL） | 窄接口 + 多实现 | 外层替换即可 |
| 横切逻辑（日志/缓存/授权）包在用例外 | 装饰器（见 [组合性](../patterns/composition.md)） | 不污染用例 |

### 3. 用例分层示意（模块内）

```text
OrderModule/
├─ Domain/          实体 Order、领域服务、领域事件
├─ Application/      PlaceOrderHandler、IOrderRepository（接口）
├─ Infrastructure/   EfOrderRepository、AppDbContext
└─ (模块注册入口，在宿主里调用 AddOrderModule())
```

在[模块化单体](modular-monolith.md)里，每个模块都用这套内部层级；模块之间**只**依赖对方的对外契约（应用服务/DTO），不跨模块引用内层。

## 常见误区

❌ **领域/应用层直接 `using Microsoft.EntityFrameworkCore` 或引用 `AppDbContext`**——依赖向外了，核心被基础设施绑死，也无法脱离数据库测。内层只依赖自己定义的接口。

❌ **业务规则写进控制器或 `DbContext`**——各层职责糊成一团，规则无法复用、无法单测。规则归领域/应用层，表现层只做"收请求、调用例、映射结果"。

❌ **为了"看起来整洁"给每个 CRUD 套五层 + 一堆 `IRepository<T>` 通用抽象**——过度设计，反而比直接 `DbContext` 更难读。分层强度应与复杂度匹配，简单模块[模块化单体](modular-monolith.md)足矣。

❌ **把 Composition Root 拆散到各层**（在各处静态 `new`、或在领域层做 DI 装配）——组装必须集中在最外层（宿主/程序入口），否则又反向依赖了具体实现。

❌ **把整洁架构当成"系统形态"**，以为用了它就等于微服务。它是模块内部的分层（见[三种架构不在同一层级](solution-structure.md#arch-levels)），与拆服务正交。

## 适用版本

架构模式与语言/版本无关，全版本适用；示例面向 net8+（主构造函数、 Minimal API）。

### Native AOT 兼容性

整洁架构**天然利于 AOT**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：

- 依赖倒置靠**显式 DI 注册**（`AddScoped<IOrderRepository, EfOrderRepository>()`），无运行期反射/程序集扫描，AOT 安全。
- 用例处理器用普通类 + 构造注入，编译期类型已知。
- 唯一注意：EF Core 实现侧启用编译模型/预编译查询（见 [EF AOT](../dotnet/ef-core/ef-data-access.md)）；表现层用 [Minimal API](../dotnet/aspnet-core/aspnet-core-10.md) 而非 MVC。

## 参考资料

- [模块化单体架构（模块间边界）](modular-monolith.md) · [解决方案分层（层级定位）](solution-structure.md)
- [领域驱动设计](ddd.md) · [领域服务与应用服务](domain-application-services.md)
- [依赖注入](../dotnet/fundamentals/dependency-injection.md) · [测试替身](../dotnet/fundamentals/test-doubles.md) · [组合性/装饰器](../patterns/composition.md)
- 官方文档：[常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
