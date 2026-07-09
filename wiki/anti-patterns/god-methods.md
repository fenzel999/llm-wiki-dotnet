---
title: 上帝方法（God Methods）
summary: 过长、职责过多的胖函数难以理解与测试，应按单一职责拆分。
tags: [anti-pattern, design, readability]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/design-guidelines/member-design-guidelines
updated: 2026-07-09
---

## 为什么是反模式

“上帝方法”是指一个函数承担了过多职责：上百行、嵌套层级深、混合了校验、计算、IO、转换等多种逻辑。它违反单一职责原则（SRP），难以阅读、难以单测、难以复用，且修改一处极易引入回归。长函数的圈复杂度（cyclomatic complexity）通常很高，是 bug 高发区。

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

## ✅ 正确写法

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

## 相关

- [命名规范](../standards/naming.md)
- [依赖注入](../concepts/dependency-injection.md)
