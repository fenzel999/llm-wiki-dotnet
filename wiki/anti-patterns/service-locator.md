---
title: 服务定位器模式（Service Locator）
summary: 通过 ServiceLocator.Get<T>() 隐藏依赖，破坏显式依赖与可测试性。
tags: [anti-pattern, dependency-injection, design]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 为什么是反模式

服务定位器（Service Locator）让组件在内部通过 `ServiceLocator.Get<T>()` 主动拉取依赖，而不是由外部注入。这带来若干问题：依赖关系被隐藏，阅读代码时无法从构造函数看出它真正需要什么；难以测试（必须预先配置全局定位器）；造成隐式全局状态与生命周期混乱；与依赖注入容器耦合。依赖注入（DI）的“构造函数注入”才是正确的显式依赖方式。

## ❌ 错误写法

```csharp
public class OrderService
{
    public void Place(Order order)
    {
        var repo = ServiceLocator.Get<IOrderRepository>();
        var email = ServiceLocator.Get<IEmailService>();

        repo.Save(order);
        email.Send($"已下单 {order.Id}");
    }
}
```

## ✅ 正确写法

```csharp
public class OrderService
{
    private readonly IOrderRepository _repo;
    private readonly IEmailService _email;

    public OrderService(IOrderRepository repo, IEmailService email)
    {
        _repo = repo;
        _email = email;
    }

    public void Place(Order order)
    {
        _repo.Save(order);
        _email.Send($"已下单 {order.Id}");
    }
}
```

依赖在构造函数中显式声明，可测试性大幅提升：

```csharp
var service = new OrderService(new FakeOrderRepository(), new FakeEmailService());
service.Place(order);
```

## 相关

- [依赖注入](../concepts/dependency-injection.md)
- [命名规范](../standards/naming.md)
