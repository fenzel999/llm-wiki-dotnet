---
title: 依赖注入（Dependency Injection）
summary: .NET 内置容器的完整用法——生命周期、键控服务、多实现、工厂/开放泛型、作用域工厂、释放与校验。
tags: [di, dependency-injection]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/dependency-injection
updated: 2026-07-10
---

# 依赖注入（Dependency Injection）

> **要点速览**
> - DI = **构造函数注入**：容器按构造函数参数自动填依赖。**主构造函数只是 C# 12 语法糖，不是必选项**——传统构造函数完全等价。
> - 三生命周期：`Transient`（每次新建）/`Scoped`（每作用域一个，典型=每 HTTP 请求）/`Singleton`（全局唯一）。
> - 完整能力面：**键控服务**（net8+）、**多实现 + `IEnumerable<T>` 注入**、`TryAdd*` 幂等注册、**工厂注册**、**开放泛型注册**、`IServiceScopeFactory`（在单例/后台里用 scoped）、**释放语义**、**启动期校验**。
> - 别用 `IServiceProvider` 当服务定位器；别把 scoped/transient 俘获进 singleton（captive dependency）。
> - 显式注册、不做运行期程序集扫描——这样才**兼容 Native AOT**（[P16](../../governance/policy.md)）。

## 概述

依赖注入的出发点很朴素：一个类要用别的服务时，**别自己 `new`**，而是由外部在构造它时把依赖"送进门"。好处是解耦与可测试——`OrderService` 只认 `IOrderRepository` 接口，背后是 EF Core、内存实现还是测试假数据，它都不关心。

.NET 自带一套容器，两个核心类型：`IServiceCollection`（**注册**：声明"接口→实现→生命周期"）与 `IServiceProvider`（**解析**：按需取出实例并注入其依赖）。在 ASP.NET Core / 通用主机里，`builder.Services` 就是 `IServiceCollection`，`app.Services` 就是根 `IServiceProvider`，每个请求还会开一个 scope。

**关于主构造函数**：DI 靠的是"类有一个公共构造函数、参数就是依赖"。写成主构造函数只是少几行样板，和写传统构造函数**行为完全一致**，容器不区分二者。所以主构造函数是**风格选择，不是 DI 的必要条件**。

## 正确做法

### 1. 注册与解析、构造函数注入

```csharp
var services = new ServiceCollection();
services.AddScoped<IOrderService, OrderService>();   // 接口 → 实现
services.AddSingleton<IClock, SystemClock>();

var provider = services.BuildServiceProvider();
var svc = provider.GetRequiredService<IOrderService>();  // GetRequiredService：缺失即抛
var maybe = provider.GetService<IOrderService>();         // GetService：缺失返回 null
```

两种等价的构造函数注入写法（容器对它们一视同仁）：

```csharp
// 主构造函数（C# 12 / net8+）：语法糖
internal sealed class OrderService(AppDbContext db, IClock clock) : IOrderService
{
    public Task PlaceAsync() => /* 直接用 db、clock */ Task.CompletedTask;
}

// 传统构造函数：完全等价，容器行为一致
internal sealed class OrderService2 : IOrderService
{
    private readonly AppDbContext _db;
    private readonly IClock _clock;
    public OrderService2(AppDbContext db, IClock clock) { _db = db; _clock = clock; }
}
```

> 容器要求类**只有一个可解析的公共构造函数**（或能挑出参数最多且全部可满足的那个）。多个模糊的构造函数会抛异常。

### 2. 三种生命周期与如何选

| 生命周期 | 何时新建 | 用于 | 典型例子 |
|----------|----------|------|----------|
| `Transient` | 每次解析都新建 | 轻量、无状态、用完即弃 | 校验器、映射器 |
| `Scoped` | 每个作用域一个 | 每请求共享、持有请求级状态 | `DbContext`、工作单元 |
| `Singleton` | 全进程一个 | 无状态或线程安全的共享服务 | 缓存、配置、`HttpClient` 工厂 |

判断口诀：**"这个实例该跟谁同生共死？"** 跟随请求→`Scoped`；全局唯一且线程安全→`Singleton`；其余→`Transient`。`DbContext` 必须 `Scoped`（它非线程安全、代表一个工作单元）。

### 3. 工厂注册（需要参数或运行期决定实现）

当实现的构造需要"从容器取别的服务"或读配置时，用工厂委托：

```csharp
services.AddSingleton<IPaymentGateway>(sp =>
{
    var opts = sp.GetRequiredService<IOptions<PayOptions>>().Value;
    return new PaymentGateway(opts.Endpoint, sp.GetRequiredService<HttpClient>());
});
```

### 4. 开放泛型注册（一次注册一族类型）

```csharp
// 注册后：IRepository<Order> 解析到 Repository<Order>，IRepository<User> 到 Repository<User>
services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
```

### 5. 同一接口的多个实现 → `IEnumerable<T>` 注入

多次注册同一接口不会覆盖，而是**累加**；注入 `IEnumerable<T>` 拿到全部（按注册顺序）：

```csharp
services.AddScoped<INotifier, EmailNotifier>();
services.AddScoped<INotifier, SmsNotifier>();

internal sealed class Alerts(IEnumerable<INotifier> notifiers)   // 拿到 [Email, Sms]
{
    public Task FanOut(string msg) => Task.WhenAll(notifiers.Select(n => n.Send(msg)));
}
// 直接 GetRequiredService<INotifier>() 只会拿到"最后注册"的那个（SmsNotifier）
```

### 6. 幂等注册 `TryAdd*`（库/模块常用）

`TryAdd*` 仅在该服务**尚未注册**时才加入，避免库覆盖使用者的自定义实现；`TryAddEnumerable` 按实现类型去重地追加：

```csharp
services.TryAddScoped<IClock, SystemClock>();                       // 已有则不动
services.TryAddEnumerable(ServiceDescriptor.Scoped<INotifier, EmailNotifier>());
```

### 7. 键控服务（Keyed Services，net8+）

同一接口按 **key** 区分多个实现，按需取指定的那个：

```csharp
services.AddKeyedScoped<INotifier, EmailNotifier>("email");
services.AddKeyedScoped<INotifier, SmsNotifier>("sms");

// 构造函数按 key 注入
internal sealed class OrderConfirm([FromKeyedServices("email")] INotifier notifier);

// 或手动解析
var sms = provider.GetRequiredKeyedService<INotifier>("sms");
```

### 8. 在单例/后台服务里安全使用 Scoped：`IServiceScopeFactory`

Singleton（含 `BackgroundService`）**不能**直接注入 Scoped（如 `DbContext`）——那是俘获依赖。正确做法是每次工作**手动开 scope**：

```csharp
internal sealed class OutboxWorker(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();               // 每轮一个作用域
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await PumpAsync(db, ct);
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }
}
```

### 9. 释放（Disposal）语义

**容器只负责释放它自己创建的实例**：`Scoped`/`Singleton` 的 `IDisposable`/`IAsyncDisposable` 会在其作用域/容器销毁时被释放。`Transient` 的可释放实例会被**创建它的那个作用域**追踪并一起释放——所以从**根容器/单例**里解析 transient disposable，会被挂到根上直到进程结束，形成泄漏。

```csharp
// 你自己 new 的（如工厂里 new 出来）容器不管，需自己 using
// 从容器解析的，交给容器；别对注入进来的依赖手动 Dispose
```

### 10. 装饰器（无内置，手写）

.NET 容器没有内置装饰器；用工厂手写包装（[P10](../../governance/policy.md) 不引第三方 Scrutor）：

```csharp
services.AddScoped<OrderService>();                                  // 内层具体实现
services.AddScoped<IOrderService>(sp =>
    new CachingOrderService(sp.GetRequiredService<OrderService>(),   // 装饰
                            sp.GetRequiredService<IMemoryCache>()));
```

### 11. 启动期校验（尽早暴露配置错误）

```csharp
var provider = services.BuildServiceProvider(new ServiceProviderOptions
{
    ValidateScopes = true,     // 从根解析 scoped 立即报错（防俘获）
    ValidateOnBuild = true,    // 启动时校验每个注册都能构造
});
```

> 通用主机在 **Development** 环境默认 `ValidateScopes = true`。生产建议也开 `ValidateOnBuild`，把"缺注册"从运行时前移到启动时。

### 12. 不经容器构造对象：`ActivatorUtilities`

需要 new 一个"部分参数来自容器、部分自己传"的对象时：

```csharp
// runtime 参数 order，其余依赖由 provider 补齐
var handler = ActivatorUtilities.CreateInstance<OrderHandler>(provider, order);
```

## 常见误区

❌ **把 `IServiceProvider` 注入进构造函数，然后在类里 `GetRequiredService`**——退化成服务定位器（[反模式](../../anti-patterns/design-antipatterns.md#service-locator)），依赖被藏起来、无法从签名看出、难测试。依赖应写在构造函数参数上。

❌ **俘获依赖（captive dependency）**：把 `Scoped`/`Transient` 注入 `Singleton`。scoped 实例会被单例长期持有、跨请求共享，导致数据串扰甚至内存泄漏。需要时用 `IServiceScopeFactory` 开 scope（见 §8）；开 `ValidateScopes` 让它在启动就报错。

❌ **从根容器/单例解析 transient disposable**：该实例被根作用域追踪，直到进程退出才释放，累积成泄漏。让 disposable 走 scoped，或在自建 scope 内解析。

❌ **可变状态注册为 Singleton 却不加线程安全**：并发下产生极难复现的 bug。单例要么无状态，要么自己保证线程安全。

❌ **构造函数参数爆炸**（注入十几个服务）：往往是类职责过多的信号，不是 DI 的问题。拆分职责，而不是塞更多依赖。

❌ **靠运行期程序集扫描"自动注册所有服务"**：依赖反射，**破坏 Native AOT**（[P16](../../governance/policy.md)），也让依赖关系变隐晦。显式 `Add*` 每个服务。

## 适用版本

生命周期、`IEnumerable` 注入、`TryAdd*`、开放泛型、工厂注册、`IServiceScopeFactory`、`ActivatorUtilities` **全版本通用**。**键控服务（Keyed Services）自 net8 引入**（`AddKeyed*` / `[FromKeyedServices]` / `GetRequiredKeyedService`）。

### Native AOT 兼容性

.NET 内置容器**兼容 Native AOT**（[P16](../../governance/policy.md)、[AOT 兼容性矩阵](../aot/aot-compatibility.md)）：只要用**显式注册**（`Add*`/`TryAdd*`/键控/工厂/开放泛型都可以），不做**运行期程序集扫描**或基于反射的约定装配。工厂委托里也别用反射按名字创建类型。`ActivatorUtilities.CreateInstance<T>` 是 AOT 安全的（编译期已知类型）。

## 参考资料

- [配置与 Options（`IOptions` 注入与校验）](configuration-options.md) · [组合与架构模式（Host/管道）](../../patterns/composition.md) · [后台服务（scope 用法）](background-services.md)
- [服务定位器反模式](../../anti-patterns/design-antipatterns.md#service-locator) · [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[.NET 中的依赖注入](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection) · [依赖注入准则](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection-guidelines) · [键控服务](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection#keyed-services)
