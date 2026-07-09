---
title: 服务定位器模式（Service Locator）
summary: 通过 ServiceLocator.Get<T>() 隐藏依赖，破坏显式依赖与可测试性。
tags: [anti-pattern, dependency-injection, design]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/dependency-injection
updated: 2026-07-10
---

## 为什么是反模式

服务定位器（Service Locator）让组件在内部通过 `ServiceLocator.Get<T>()` 主动拉取依赖，而不是由外部注入。这带来若干问题：依赖关系被隐藏，阅读代码时无法从构造函数看出它真正需要什么；难以测试，因为必须预先配置一个全局定位器；会造成隐式全局状态与生命周期混乱，并与具体的依赖注入容器耦合。这种写法看似“解耦”，实则把依赖隐藏进了运行时，比显式的构造函数注入更脆弱。依赖注入（DI）的“构造函数注入”才是正确的显式依赖方式。

## ❌ 错误写法

```csharp
public class OrderService
{
    public void Place(Order order)
    {
        var repo = ServiceLocator.Get<IOrderService>();
        var email = ServiceLocator.Get<IEmailService>();

        repo.Save(order);
        email.Send($"已下单 {order.Id}");
    }
}
```

`OrderService` 在方法内部偷偷拉取依赖，构造函数看不出它需要哪些服务；要测试时只能去配置全局定位器，且依赖的真实来源对调用方完全不可见，生命周期也难以控制。

## ✅ 正确写法

通过构造函数显式声明依赖，由外部注入：

```csharp
public class OrderService
{
    private readonly IOrderService _orderService;
    private readonly IEmailService _email;

    public OrderService(IOrderService orderService, IEmailService email)
    {
        _orderService = orderService;
        _email = email;
    }

    public void Place(Order order)
    {
        _orderService.Save(order);
        _email.Send($"已下单 {order.Id}");
    }
}
```

依赖在构造函数中显式声明，可测试性大幅提升：

```csharp
var service = new OrderService(new FakeOrderService(), new FakeEmailService());
service.Place(order);
```

构造函数注入让依赖关系一目了然，测试时可直接传入替身（fake/stub），容器也只需负责装配，组件不再与具体的定位器或容器耦合。

## 如何避免

- 用构造函数注入声明依赖，不要在任何方法内部调用服务定位器。
- 把“通过全局定位器取依赖”列为代码评审的禁止项。
- 仅在真正的组合根（composition root）处接触 DI 容器，业务代码保持无感知。

- 相关：[依赖注入](../concepts/dependency-injection.md)、[命名规范](../standards/naming.md)
- 官方文档：[Dependency injection in .NET](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection)
