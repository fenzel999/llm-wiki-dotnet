---
title: 上帝方法（God Methods）
summary: 过长、职责过多的胖函数难以理解与测试，应按单一职责拆分。
tags: [anti-pattern, design, readability]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/design-guidelines/member-design-guidelines
updated: 2026-07-10
---

## 为什么是反模式

“上帝方法”是指一个函数承担了过多职责：上百行、嵌套层级深、混合了校验、计算、IO、转换等多种逻辑。它违反单一职责原则（SRP），难以阅读、难以单测、难以复用，且修改一处极易引入回归。这种写法通常源于“先把功能堆进去再说”的临时取舍，但长函数的圈复杂度（cyclomatic complexity）通常很高，是 bug 的高发区，长期会严重拖累可维护性。

## ❌ 错误写法

```csharp
public void ProcessOrder(Order order)
{
    if (order == null) throw new ArgumentNullException(nameof(order));
    if (order.Items.Count == 0) throw new InvalidOperationException("空订单");

    decimal total = 0;
    foreach (var item in order.Items)
    {
        if (item.Quantity <= 0) continue;
        var price = item.UnitPrice * item.Quantity;
        if (item.Category == "Book") price *= 0.9m;
        total += price;
    }

    order.Total = total;
    var msg = $"订单 {order.Id} 金额 {total}";
    _email.Send(msg);
    _db.Save(order);

    if (total > 1000)
    {
        _logger.LogInformation("大额订单 {Id}", order.Id);
    }
}
```

`ProcessOrder` 把参数校验、金额计算、邮件通知与持久化全部塞进一个方法，多种职责纠缠在一起，既无法针对金额计算单独测试，也因为层层嵌套而难以阅读，任何改动都可能牵一发而动全身。

## ✅ 正确写法

按职责将方法拆分成更小、单一职责的函数，由主方法编排调用：

```csharp
public void ProcessOrder(Order order)
{
    Validate(order);
    order.Total = CalculateTotal(order);
    NotifyCustomer(order);
    Persist(order);
}

private static void Validate(Order order)
{
    if (order == null) throw new ArgumentNullException(nameof(order));
    if (order.Items.Count == 0) throw new InvalidOperationException("空订单");
}

private static decimal CalculateTotal(Order order)
{
    decimal total = 0;
    foreach (var item in order.Items)
    {
        if (item.Quantity <= 0) continue;
        total += ComputeItemPrice(item);
    }
    return total;
}

private static decimal ComputeItemPrice(OrderItem item)
{
    var price = item.UnitPrice * item.Quantity;
    return item.Category == "Book" ? price * 0.9m : price;
}

private void NotifyCustomer(Order order)
{
    _email.Send($"订单 {order.Id} 金额 {order.Total}");
}

private void Persist(Order order)
{
    _db.Save(order);
    if (order.Total > LargeOrderThreshold)
    {
        _logger.LogInformation("大额订单 {Id}", order.Id);
    }
}
```

拆分后每个函数只做一件事，命名即文档，金额计算等纯逻辑可以脱离 IO 单独单测，整体圈复杂度下降，修改与复用的风险也随之降低。

## 如何避免

- 遵循单一职责原则，把长函数按“校验 / 计算 / 通知 / 持久化”等职责拆分成小方法。
- 关注圈复杂度与方法的嵌套层级，超过合理阈值就考虑提取方法。
- 在代码评审中把“一个方法做多件事”作为重点检查项。

- 相关：[命名规范](../standards/naming.md)、[依赖注入](../concepts/dependency-injection.md)
- 官方文档：[Member design guidelines](https://learn.microsoft.com/dotnet/standard/design-guidelines/member-design-guidelines)
