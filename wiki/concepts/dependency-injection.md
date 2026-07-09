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

依赖注入（Dependency Injection, DI）听起来像个大词，但它的出发点特别朴素：一个类需要用到别的服务时，别自己 `new`，而是由外部在构造它的时候把依赖“送进门”。这样做最大的好处是解耦——`OrderService` 只认 `IOrderRepository` 这个接口，至于背后是 EF Core、还是内存实现、还是测试用的假数据，它一概不关心。于是替换实现、做单元测试都变得轻而易举。

.NET 自带一套轻量容器，核心是 `IServiceCollection`（用来注册）和 `IServiceProvider`（用来解析）。它用三种生命周期来表达“这个实例该活多久”：transient 表示每次解析都新建一个；scoped 表示同一个作用域（典型如一次 HTTP 请求）内共享一个；singleton 则是整个应用进程里全局唯一。绝大多数业务代码，最推荐的做法是构造函数注入——把依赖写在类的构造函数参数上，谁依赖什么，看签名就一目了然，而不是在方法体内临时向容器“要”东西。

## 正确做法

先用 `ServiceCollection` 按各个服务实际需要的生命周期注册，再从根提供器解析出你想要的那个；而具体的服务类，把依赖通过构造函数接进来，由容器保证它能拿到。下面这段就是最典型的一幕：

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

可以看到，`OrderService` 的依赖 `AppDbContext` 清清楚楚写在构造函数上，容器在创建它时会自动把注册好的实例填进来。这种“依赖即签名”的风格，让类的契约对人和对编译器都同样透明。

## 常见误区

❌ 在构造函数里直接去找容器要服务，类重新变成“自己负责找依赖”，退化成服务定位器（Service Locator）反模式：

```csharp
public class OrderService
{
    public OrderService(IServiceProvider provider)
        => _db = provider.GetRequiredService<AppDbContext>(); // 服务定位器反模式
}
```

除了这个典型的反模式，生命周期用错也是高频事故：

- 把 scoped 服务注入到 singleton 中，会让本应“每请求一个”的实例被跨请求共享，造成数据串扰，甚至内存泄漏。
- 把带有可变状态的类型注册为 singleton，却没做线程安全保护，并发下就会出现极难复现的 bug。

所以注册时先想清楚：这个服务该跟谁同生共死？想清楚生命周期，比多写几行业务代码更重要。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [异步编程](async-await.md)
- [泛型与约束](modern-csharp.md#generics)
- [服务定位器反模式](../anti-patterns/design-antipatterns.md#service-locator)
- 官方文档：[.NET 中的依赖注入](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection)
