---
title: 六边形架构（端口与适配器）
summary: 用端口（接口）与适配器把领域核心与外界 I/O 隔离，依赖倒置使业务不依赖任何基础设施。
tags: [architecture, hexagonal, ports-adapters, dotnet]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/
updated: 2026-07-11
---

> **要点速览**
> - 六边形架构又称“端口与适配器（Ports & Adapters）”，核心是一个不依赖任何外部 I/O 的“应用核心（Application Core）”。
> - 端口（Port）是领域/核心定义的接口；适配器（Adapter）是端口两端的具体实现——主适配器（driving）驱动核心，次适配器（driven）被核心驱动。
> - 依赖倒置：核心只依赖自己定义的端口接口，基础设施适配器反向依赖端口，从而把 HTTP、数据库、消息等 I/O 推到边界之外。
> - 与[整洁架构](../architecture/clean-architecture.md)的区别：六边形强调“驱动端/被驱动端”的对称端口，整洁架构强调同心分层（实体→用例→接口适配→框架）。
> - 可测试性来自“替换基础设施”：跨进程端口可用内存替身，持久化可用 EF Core 内存提供程序，无需真实数据库或网络即可驱动与断言核心。
> - 小应用不必上六边形——端口过多会带来样板代码负担，见[常见误区](#common-pitfalls)。

## 概述

六边形架构（Hexagonal Architecture，由 Alistair Cockburn 提出，又称 Ports & Adapters）是[整洁架构](../architecture/clean-architecture.md)、洋葱架构的思想近亲，但它用一个统一的隐喻组织代码：**中心是应用核心，周围是端口，端口之外是适配器**。

整体形状像一个六边形，每一“边”都是一个端口。端口分两类：

- **主端口（Primary / Driving Port）**：核心对外暴露的能力（用例接口），由“主适配器”从外部驱动，例如 Minimal API 端点、命令行、集成测试。
- **次端口（Secondary / Driven Port）**：核心需要向外调用、且**跨越进程边界**的能力（出库接口），由“次适配器”实现，例如第三方 HTTP 调用、消息发送、通知。

核心规则：**依赖只向内**。应用核心只引用自己定义的端口接口，或（按本库 [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md) 约定）直接注入 `AppDbContext`——绝不手写额外的仓储/工作单元包装。这是依赖倒置原则（DIP）的直接应用，与 [依赖注入](../dotnet/fundamentals/dependency-injection.md) 天然契合——运行时由 DI 容器把具体适配器“注入”到端口背后。

> 为什么持久化不单独抽象成端口？因为 **EF Core 的 `DbContext` 本身就是 Unit of Work、`DbSet<T>` 本身就是 Repository**，再包一层 `IOrderRepository` / `EfOrderRepository` 属于多余抽象（见 [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)）。所以本库约定：持久化直接注入 `AppDbContext`、用静态扩展方法补 `DbSet` 缺的能力、**坚决不写仓储类**。此外 **EF Core 自身就是适配器模式**：换数据库只换 `UseXxx` 一行（如 `UseSqlServer` ↔ `UseNpgsql`），领域与抽象不受影响，因此持久化层不需要你再手写适配器。只有真正跨进程边界的关注点（通知、第三方 HTTP 等）才定义端口。六边形与 [DDD](../architecture/ddd.md) 经常一起使用：领域模型与领域服务位于核心，它也常作为 [模块化单体](../architecture/modular-monolith.md) 内部模块的边界风格——每个模块用端口暴露能力、隐藏实现。

## 正确做法

下面的例子演示完整闭环：定义端口（领域侧）+ 用例 → 直接注入 `AppDbContext`（EF Core 内置的仓储/工作单元）与跨进程端口 → 用 DI 接线 → 用 Minimal API 作主适配器驱动核心。不依赖任何第三方库。

### 1. 定义端口与用例（应用核心）

```csharp
namespace Wiki.AppCore;

// 领域模型（核心，纯数据 + 行为，无基础设施依赖）
public sealed record Order(Guid Id, string Product, decimal Amount, bool IsConfirmed);

// 端口（只有跨越进程边界的关注点才需要）：向外发通知
public interface INotifier
{
    Task NotifyAsync(string message, CancellationToken ct = default);
}

// 主端口（核心暴露的用例，由外层驱动）
public interface IConfirmOrderUseCase
{
    Task ConfirmAsync(Guid orderId, CancellationToken ct = default);
}

// 用例（应用服务）。持久化直接注入 EF Core 的 AppDbContext——
// 它内置 Unit of Work + Repository（DbSet<T> 即仓储），按本库约定不再包一层 IOrderRepository。
// C# 12 主构造函数把依赖声明在类型参数上（编译期生成只读字段，Native AOT 友好）。
// 通知仍走端口 INotifier（外部关注点才需要显式端口）。
public sealed class ConfirmOrderUseCase(
    AppDbContext db,
    INotifier notifier) : IConfirmOrderUseCase
{
    public async Task ConfirmAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await db.Orders.FindAsync(new object[] { orderId }, ct)
            ?? throw new InvalidOperationException($"订单 {orderId} 不存在");

        var confirmed = order with { IsConfirmed = true };
        db.Orders.Update(confirmed);
        await db.SaveChangesAsync(ct);
        await notifier.NotifyAsync($"订单 {orderId} 已确认", ct);
    }
}
```

### 2. 基础设施：扩展 AppDbContext 的 DbSet（新语法）

本库约定：**EF Core 的 `DbContext` 已经是 Unit of Work、`DbSet<T>` 已经是 Repository**，所以**坚决不另写 `IOrderRepository` / `EfOrderRepository` 这类仓储类**。直接**注入 `AppDbContext`、扩展对应的 `DbSet`** 即可——`AppDbContext` 本身就算“仓储模式”的落地。

`DbSet<T>` / `IQueryable<T>` 自带的能力（增删改查、`Where`、`Include` 等）够用时直接用；**它“没有的功能”用静态扩展方法补**，而不是再起一个仓储类：

```csharp
using Microsoft.EntityFrameworkCore;
using Wiki.AppCore;

// AppDbContext：用 C# 12 主构造函数把 DbContextOptions 声明在类型参数上（AOT 友好）。
// 扩展对应的 DbSet<Order> 即获得该实体的持久化能力，这就是“套壳 AppDbContext”的全部所需。
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
}

// 给 DbSet<Order> 补它“没有的”查询能力：用 C# 14 的 extension 块（最新惯用法，
// 替代旧的 static class + this 参数写法），挂在 IQueryable<Order> 上。
// 坚决不建仓储类；扩展方法组合成表达式树，由 EF 提供程序翻译，AOT 安全。
public static class OrderQuery
{
    extension(IQueryable<Order> source)
    {
        public IQueryable<Order> ByProduct(string product)
            => source.Where(o => o.Product == product);

        public IQueryable<Order> ConfirmedOnly()
            => source.Where(o => o.IsConfirmed);
    }
}

// 只有真正跨进程边界的关注点才做端口 + 适配器，例如用内置 HttpClient 发通知
public sealed class HttpNotifier(HttpClient http) : INotifier, IDisposable
{
    public async Task NotifyAsync(string message, CancellationToken ct = default)
        => await http.PostAsJsonAsync("/notify", new { message }, ct);

    public void Dispose() => http.Dispose();
}
```

> **EF Core 本身就是适配器模式（Adapter）。** 它把“领域/用例的持久化意图”翻译到具体数据库：`UseSqlServer` 是 SQL Server 适配器、`UseNpgsql` 是 Postgres 适配器——**更换数据库只换一行 `UseXxx`，领域与抽象完全不受影响**。这正是六边形“次适配器”想表达的边界，所以持久化这一层**不需要你再手写一个 `EfOrderRepository` 适配器**，EF Core 的提供程序（Provider）已经充当了那个适配器。

### 3. 通过 DI 接线（依赖倒置的落地点）

```csharp
using Microsoft.EntityFrameworkCore;
using Wiki.AppCore;

var builder = WebApplication.CreateBuilder(args);

// 持久化：直接注册 AppDbContext（它就是内置的仓储 + 工作单元）。
// 换数据库只换 UseXxx 一行 —— EF Core 本身就是适配器：UseSqlServer / UseNpgsql / UseSqlite
// 互不影响领域与抽象（六边形“次适配器”的边界由提供程序充当）。
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Orders")));
// 跨进程边界的端口才需要显式注册到适配器
builder.Services.AddHttpClient<INotifier, HttpNotifier>();

// 主端口（用例）注册
builder.Services.AddScoped<IConfirmOrderUseCase, ConfirmOrderUseCase>();

var app = builder.Build();
app.Run();
```

### 4. 主适配器：Minimal API 驱动核心

```csharp
// 主适配器：把 HTTP 请求翻译为核心用例调用，不承载业务规则
app.MapPost("/orders/{id:guid}/confirm", async (Guid id, IConfirmOrderUseCase useCase) =>
{
    await useCase.ConfirmAsync(id);
    return Results.Ok();
});
```

### 5. 测试（可测试性的来源）

```csharp
using Microsoft.EntityFrameworkCore;
using Wiki.AppCore;

// 持久化测试：用 EF Core 内存提供程序承载 AppDbContext，无需真实数据库即可驱动核心
var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseInMemoryDatabase("confirm-test")
    .Options;
var db = new AppDbContext(options);

// 跨进程端口仍可用内存替身换掉，无需真实 HTTP
public sealed class SpyNotifier : INotifier
{
    public List<string> Messages { get; } = new();
    public Task NotifyAsync(string message, CancellationToken ct = default)
    { Messages.Add(message); return Task.CompletedTask; }
}

var notifier = new SpyNotifier();
var useCase = new ConfirmOrderUseCase(db, notifier);
// ... 安排 db.Orders 数据后调用 ConfirmAsync 并断言 db / notifier.Messages
```

## 常见误区 {#common-pitfalls}

❌ **把业务逻辑放进适配器（贫血端口）。** 适配器只做“翻译”（HTTP↔领域、行↔实体），业务规则应留在核心用例/领域里。
✅ WHY：如果规则散落在 EF Core 适配器或 Minimal API 里，核心就空了，换适配器时行为会不一致，测试也无法只测核心。端口应当是“富含行为”的契约，适配器只负责边界转换。

❌ **让核心引用与业务无关的基础设施类型（如 HTTP 状态码、`SqlException`、第三方 SDK 类型），或把业务规则写进适配器。**
✅ WHY：这正是六边形要消除的反模式。一旦核心耦合具体基础设施，依赖倒置被破坏，核心难以演进与测试。本库的务实约定是：持久化直接注入 EF Core 的 `AppDbContext`（它已是内置的 Repository / Unit of Work，见 [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)），不再额外抽象；而真正跨进程的关注点（通知、第三方 HTTP）仍走端口，把 I/O 与协议细节挡在边界之外。

❌ **适配器直接调用另一个适配器（绕过核心）。** 比如通知适配器里直接去查数据库。
✅ WHY：适配器之间不应互相依赖，所有编排都应经由核心用例。否则数据流失去单一可控路径，核心不再“知道”完整业务，最终退化成散乱的脚本式胶水代码。

❌ **为每一个微小操作都定义一个端口，导致端口爆炸。**
✅ WHY：端口是架构边界，不是方法级别的细粒度契约。应面向“能力/用例/上下文”聚合端口（例如一个 `IPricingPort` 而非 `IGetPrice`/`ICalcDiscount`/`IGetTax` 十个细粒度接口），否则样板代码会淹没真实业务价值。

❌ **小项目强行套六边形。**
✅ WHY：对于只有两三个端点、无复杂领域规则的 CRUD 应用，端口 + 适配器开销（接口、多项目分层、DI 接线）会大于收益。六边形的价值在“I/O 多变 / 领域复杂 / 需高频替换或测试基础设施”时才会显现。先评估，再决定是否采用。

## 适用版本

六边形的原则与具体 .NET 版本无关（`introduced-in: general`），可在 .NET 6 至 .NET 10+ 的任何长期支持版本上使用。Minimal API 自 .NET 6 起可用，`AddHttpClient` 与 `Microsoft.Extensions.*` 内置于框架。本页示例用到的 C# 新语法：主构造函数（C# 12，.NET 8+）、`extension` 块（C# 14，.NET 10）与 `DbContext` 主构造函数——若目标框架低于对应版本，可改写为等价的旧写法（构造函数体 / `static class` 扩展方法）。

### Native AOT 兼容性

- **端口是接口，天然 AOT 友好**：`IConfirmOrderUseCase`、`INotifier` 等只是抽象契约，不触发反射或动态代码生成；`AppDbContext` 用内置 EF Core，配合编译模型（Compiled Model）减少运行时反射。
- **适配器可 AOT 兼容**：`HttpNotifier` 用内置 `System.Text.Json` 源生成（`[JsonSerializable]`）替代运行时反射序列化；EF Core 编译模型可减少运行时反射。
- **避免动态适配器发现 / 反射注册**：不要用程序集扫描或 `Activator.CreateInstance` 在运行时找适配器。`Native AOT` 下反射受限，应在 `Program.cs` 中**显式注册**每个端口到其适配器（如上面的 `AddHttpClient<INotifier, HttpNotifier>()`、直接 `AddDbContext<AppDbContext>`），保证裁剪器能保留类型并生成必要的封送代码。

## 参考资料

- 端口与适配器 / 现代 Web 应用架构（Microsoft Learn）：<https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/>
- 依赖倒置与内置 DI 实践见 [依赖注入](../dotnet/fundamentals/dependency-injection.md)。
- 与同心分层风格的对比见 [整洁架构](../architecture/clean-architecture.md)。
- 领域建模协作方式见 [DDD](../architecture/ddd.md)。
- 作为模块边界在单体中的运用见 [模块化单体](../architecture/modular-monolith.md)。
