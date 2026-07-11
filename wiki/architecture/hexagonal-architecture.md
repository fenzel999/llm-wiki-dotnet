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
> - 可测试性来自“换适配器”：测试中用一个内存/桩适配器实现同一端口即可驱动或替身核心，无需启动真实数据库或网络。
> - 小应用不必上六边形——端口过多会带来样板代码负担，见[常见误区](#common-pitfalls)。

## 概述

六边形架构（Hexagonal Architecture，由 Alistair Cockburn 提出，又称 Ports & Adapters）是[整洁架构](../architecture/clean-architecture.md)、洋葱架构的思想近亲，但它用一个统一的隐喻组织代码：**中心是应用核心，周围是端口，端口之外是适配器**。

整体形状像一个六边形，每一“边”都是一个端口。端口分两类：

- **主端口（Primary / Driving Port）**：核心对外暴露的能力（用例接口），由“主适配器”从外部驱动，例如 Minimal API 端点、命令行、集成测试。
- **次端口（Secondary / Driven Port）**：核心需要向外调用的能力（出库接口），由“次适配器”实现，例如 EF Core 持久化、HttpClient 调用第三方、消息发送。

核心规则：**依赖只向内**。应用核心只引用自己定义的端口接口，绝不引用 `Microsoft.EntityFrameworkCore`、`System.Net.Http` 等基础设施类型。这是依赖倒置原则（DIP）的直接应用，与 [依赖注入](../dotnet/fundamentals/dependency-injection.md) 天然契合——运行时由 DI 容器把具体适配器“注入”到端口背后。

六边形与 [DDD](../architecture/ddd.md) 经常一起使用：领域模型与领域服务位于核心，仓储（Repository）端口就是典型的次端口，EF Core 仓储是适配器。它也常作为 [模块化单体](../architecture/modular-monolith.md) 内部模块的边界风格——每个模块用端口暴露能力、隐藏实现。

## 正确做法

下面的例子演示完整闭环：定义端口（领域侧）→ 实现次适配器（EF Core / HttpClient）→ 用 DI 接线 → 用 Minimal API 作主适配器驱动核心。不依赖任何第三方库。

### 1. 定义端口（在应用核心，不引用任何 I/O 类型）

```csharp
namespace Wiki.AppCore;

// 领域模型（核心，纯数据 + 行为，无基础设施依赖）
public sealed record Order(Guid Id, string Product, decimal Amount, bool IsConfirmed);

// 次端口（被核心调用的仓储接口，由外层适配器实现）
public interface IOrderRepository
{
    Task<Order?> GetAsync(Guid id, CancellationToken ct = default);
    Task SaveAsync(Order order, CancellationToken ct = default);
}

// 次端口（被核心调用，向外发通知）
public interface INotifier
{
    Task NotifyAsync(string message, CancellationToken ct = default);
}

// 主端口（核心暴露的用例，由外层驱动）
public interface IConfirmOrderUseCase
{
    Task ConfirmAsync(Guid orderId, CancellationToken ct = default);
}

// 用例实现：只依赖端口接口，绝不知道 EF Core / HttpClient 的存在
public sealed class ConfirmOrderUseCase : IConfirmOrderUseCase
{
    private readonly IOrderRepository _orders;
    private readonly INotifier _notifier;

    public ConfirmOrderUseCase(IOrderRepository orders, INotifier notifier)
    {
        _orders = orders;
        _notifier = notifier;
    }

    public async Task ConfirmAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _orders.GetAsync(orderId, ct)
            ?? throw new InvalidOperationException($"订单 {orderId} 不存在");

        var confirmed = order with { IsConfirmed = true };
        await _orders.SaveAsync(confirmed, ct);
        await _notifier.NotifyAsync($"订单 {orderId} 已确认", ct);
    }
}
```

### 2. 实现次适配器（基础设施层，依赖端口 + 具体技术）

```csharp
using Microsoft.EntityFrameworkCore;
using Wiki.AppCore;

// EF Core 持久化适配器：实现次端口 IOrderRepository
public sealed class EfOrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public EfOrderRepository(AppDbContext db) => _db = db;

    public async Task<Order?> GetAsync(Guid id, CancellationToken ct = default)
        => await _db.Orders.FindAsync(new object[] { id }, ct);

    public async Task SaveAsync(Order order, CancellationToken ct = default)
    {
        _db.Orders.Update(order);
        await _db.SaveChangesAsync(ct);
    }
}

// HTTP 通知适配器：实现次端口 INotifier，用内置 HttpClient
public sealed class HttpNotifier : INotifier, IDisposable
{
    private readonly HttpClient _http;
    public HttpNotifier(HttpClient http) => _http = http;

    public async Task NotifyAsync(string message, CancellationToken ct = default)
        => await _http.PostAsJsonAsync("/notify", new { message }, ct);

    public void Dispose() => _http.Dispose();
}

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Order> Orders => Set<Order>();
}
```

### 3. 通过 DI 接线（依赖倒置的落地点）

```csharp
using Microsoft.EntityFrameworkCore;
using Wiki.AppCore;

var builder = WebApplication.CreateBuilder(args);

// 次适配器注册到次端口
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Orders")));
builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
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

### 5. 用换适配器来测试（可测试性的来源）

```csharp
using Wiki.AppCore;

// 测试用内存适配器，实现同一端口，无需数据库
public sealed class InMemoryOrderRepository : IOrderRepository
{
    private readonly Dictionary<Guid, Order> _store = new();
    public Task<Order?> GetAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(_store.TryGetValue(id, out var o) ? o : null);
    public Task SaveAsync(Order order, CancellationToken ct = default)
    { _store[order.Id] = order; return Task.CompletedTask; }
}

public sealed class SpyNotifier : INotifier
{
    public List<string> Messages { get; } = new();
    public Task NotifyAsync(string message, CancellationToken ct = default)
    { Messages.Add(message); return Task.CompletedTask; }
}

// 测试：直接驱动核心，完全不经过 HTTP / EF Core
var repo = new InMemoryOrderRepository();
var notifier = new SpyNotifier();
var useCase = new ConfirmOrderUseCase(repo, notifier);
// ... 安排 repo 数据后调用 ConfirmAsync 并断言 notifier.Messages
```

## 常见误区 {#common-pitfalls}

❌ **把业务逻辑放进适配器（贫血端口）。** 适配器只做“翻译”（HTTP↔领域、行↔实体），业务规则应留在核心用例/领域里。
✅ WHY：如果规则散落在 EF Core 适配器或 Minimal API 里，核心就空了，换适配器时行为会不一致，测试也无法只测核心。端口应当是“富含行为”的契约，适配器只负责边界转换。

❌ **让核心引用基础设施类型（如 `DbContext`、HTTP 状态码、`SqlException`）。**
✅ WHY：这正是六边形要消除的反模式。一旦核心 `using Microsoft.EntityFrameworkCore`，依赖就向外泄漏，依赖倒置被破坏，核心无法脱离数据库单独测试与演进。核心只能通过自己定义的端口接口与外界通信。

❌ **适配器直接调用另一个适配器（绕过核心）。** 比如通知适配器里直接去查数据库。
✅ WHY：适配器之间不应互相依赖，所有编排都应经由核心用例。否则数据流失去单一可控路径，核心不再“知道”完整业务，最终退化成散乱的脚本式胶水代码。

❌ **为每一个微小操作都定义一个端口，导致端口爆炸。**
✅ WHY：端口是架构边界，不是方法级别的细粒度契约。应面向“能力/用例/上下文”聚合端口（例如一个 `IOrderRepository` 而非 `IGetOrder`/`ISaveOrder`/`IDeleteOrder` 十个接口），否则样板代码会淹没真实业务价值。

❌ **小项目强行套六边形。**
✅ WHY：对于只有两三个端点、无复杂领域规则的 CRUD 应用，端口 + 适配器开销（接口、多项目分层、DI 接线）会大于收益。六边形的价值在“I/O 多变 / 领域复杂 / 需高频替换或测试基础设施”时才会显现。先评估，再决定是否采用。

## 适用版本

六边形的原则与具体 .NET 版本无关（`introduced-in: general`），可在 .NET 6 至 .NET 10+ 的任何长期支持版本上使用。Minimal API 自 .NET 6 起可用，`AddHttpClient` 与 `Microsoft.Extensions.*` 内置于框架。

### Native AOT 兼容性

- **端口是接口，天然 AOT 友好**：`IOrderRepository`、`IConfirmOrderUseCase` 等只是抽象契约，不触发反射或动态代码生成。
- **适配器可 AOT 兼容**：使用内置 `System.Text.Json` 源生成（`[JsonSerializable]`）替代运行时反射序列化；EF Core 编译模型（Compiled Model）可减少运行时反射。
- **避免动态适配器发现 / 反射注册**：不要用程序集扫描或 `Activator.CreateInstance` 在运行时找适配器。`Native AOT` 下反射受限，应在 `Program.cs` 中**显式注册**每个适配器到其端口（如上面的 `AddScoped<IOrderRepository, EfOrderRepository>()`），保证裁剪器能保留类型并生成必要的封送代码。

## 参考资料

- 端口与适配器 / 现代 Web 应用架构（Microsoft Learn）：<https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/>
- 依赖倒置与内置 DI 实践见 [依赖注入](../dotnet/fundamentals/dependency-injection.md)。
- 与同心分层风格的对比见 [整洁架构](../architecture/clean-architecture.md)。
- 领域建模协作方式见 [DDD](../architecture/ddd.md)。
- 作为模块边界在单体中的运用见 [模块化单体](../architecture/modular-monolith.md)。
