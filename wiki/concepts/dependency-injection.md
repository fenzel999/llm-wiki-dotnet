---
title: 依赖注入(Dependency Injection)
summary: 通过容器管理对象生命周期(transient/scoped/singleton)，用构造函数注入取代服务定位器。
tags: [di, 依赖注入, 生命周期, 架构]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

依赖注入(Dependency Injection, DI)将对象依赖由外部容器(container)在构造时提供，而非由类自行创建。.NET 内置 `IServiceCollection`/`IServiceProvider`，支持三种生命周期：transient(每次新建)、scoped(每作用域一个)、singleton(全局唯一)。推荐使用构造函数注入(constructor injection)。

## 正确做法

```csharp
var services = new ServiceCollection();
services.AddTransient<IRepository, Repository>();
services.AddScoped<ISession, Session>();
services.AddSingleton<ICache, Cache>();

var provider = services.BuildServiceProvider();
var repo = provider.GetRequiredService<IRepository>();

public class OrderService
{
    private readonly IRepository _repo;
    public OrderService(IRepository repo) => _repo = repo; // 构造函数注入
}
```

## 常见误区

- 在构造函数中调用 `provider.GetService`，退化成服务定位器(Service Locator)反模式，见 [anti-patterns/service-locator](../anti-patterns/service-locator.md)。
- 将 scoped 服务注入 singleton，导致跨请求状态泄漏。
- 注册为 singleton 但有可变状态却未做线程安全。

## 参考资料

- [异步](../concepts/async-await.md)
- [泛型](../concepts/generics.md)
