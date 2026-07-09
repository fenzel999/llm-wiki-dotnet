---
title: 依赖注入（Dependency Injection）
summary: 通过容器管理对象生命周期（transient/scoped/singleton），用构造函数注入取代服务定位器。
tags: [di, dependency-injection, 生命周期, 架构]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/dependency-injection
updated: 2026-07-10
---

## 概述

依赖注入（Dependency Injection, DI）是一种将对象所依赖的服务交由外部容器在构造时提供、而非由类自行 `new` 出来的设计方式，它让组件之间的耦合降到最低、也便于测试与替换实现。.NET 内置的 `IServiceCollection` / `IServiceProvider` 支持三种生命周期：transient（每次解析都新建）、scoped（每个作用域一个实例）与 singleton（全局唯一）。在大多数业务代码里，应当优先采用构造函数注入（constructor injection），让依赖在类型签名上就一目了然，而不是在方法体内部临时向容器索取。

## 正确做法

使用 `ServiceCollection` 按所需生命周期注册服务，并通过构造函数把依赖声明在类的顶部。下面的示例先注册 scoped 与 singleton 服务，再从根提供器解析 `IOrderService`，而 `OrderService` 通过构造函数接收 `AppDbContext`，依赖关系清晰且由容器保证：

```csharp
var services = new ServiceCollection();
services.AddScoped<IOrderService, OrderService>();
services.AddScoped<ISession, Session>();
services.AddSingleton<ICache, Cache>();

var provider = services.BuildServiceProvider();
var service = provider.GetRequiredService<IOrderService>();

public class OrderService
{
    private readonly AppDbContext _db;
    public OrderService(AppDbContext db) => _db = db; // 构造函数注入
}
```

## 反例（常见错误）

❌ 在构造函数里直接调用 `provider.GetService`，会让类重新变成“自己找依赖”，退化成服务定位器（Service Locator）反模式：

```csharp
❌ public class OrderService
{
    public OrderService(IServiceProvider provider)
        => _db = provider.GetRequiredService<AppDbContext>(); // 服务定位器反模式
}
```

- 把 scoped 服务注入到 singleton 中，会跨越请求边界共享状态，造成数据串扰与内存泄漏。
- 将带有可变状态的类型注册为 singleton，却没有做线程安全保护，会在并发下产生难以复现的 bug。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [异步](../concepts/async-await.md)
- [泛型](../concepts/generics.md)
- [服务定位器反模式](../anti-patterns/service-locator.md)
- 官方文档：[.NET 中的依赖注入](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection)
