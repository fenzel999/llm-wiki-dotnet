---
title: 魔法数字（Magic Numbers）
summary: 直接在代码中使用无含义的字面量，可读性和可维护性极差。
tags: [anti-pattern, readability, naming]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 为什么是反模式

“魔法数字/魔法字符串”指散落在代码中的、没有明显含义的字面量（如 `if (status == 3)`、`Thread.Sleep(5000)`）。阅读者无法理解其意图，相同含义的取值在多处重复出现时一旦需要修改极易遗漏，引发隐蔽 bug。它们还把业务规则硬编码到逻辑中，难以配置与测试。

## ❌ 错误写法

```csharp
public bool CanCheckout(Order order)
{
    if (order.Total < 100)
    {
        return false;
    }

    if (order.Items.Count > 50)
    {
        return false;
    }

    return true;
}
```

## ✅ 正确写法

```csharp
public const decimal MinimumCheckoutAmount = 100m;
public const int MaxOrderItemCount = 50;

public bool CanCheckout(Order order)
{
    if (order.Total < MinimumCheckoutAmount)
    {
        return false;
    }

    if (order.Items.Count > MaxOrderItemCount)
    {
        return false;
    }

    return true;
}
```

更具表达力的做法是使用枚举（enum）或读取配置：

```csharp
public enum OrderStatus
{
    Pending = 1,
    Paid = 2,
    Shipped = 3
}

if (order.Status == OrderStatus.Paid) { /* ... */ }

var threshold = _config.GetValue<decimal>("Checkout:MinAmount");
```

## 相关

- [命名规范](../standards/naming.md)
- [依赖注入](../concepts/dependency-injection.md)
