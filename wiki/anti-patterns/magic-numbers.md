---
title: 魔法数字（Magic Numbers）
summary: 直接在代码中使用无含义的字面量，可读性和可维护性极差。
tags: [anti-pattern, readability, naming]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style
updated: 2026-07-10
---

## 为什么是反模式

“魔法数字 / 魔法字符串”指散落在代码中的、没有明显含义的字面量（如 `if (status == 3)`、`Thread.Sleep(5000)`）。阅读者无法理解其意图，相同含义的取值在多处重复出现时，一旦需要修改便极易遗漏，从而引发隐蔽 bug。这种写法把业务规则硬编码进逻辑，既不利于配置，也不利于测试，还让代码意图对维护者完全不透明。

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

方法里的 `100` 和 `50` 没有任何语义说明，读者无法判断它们是阈值、配置还是随手写下的测试值；如果结算规则在别处也用到了同样的数值，将来要调整时很难保证全部同步修改。

## ✅ 正确写法

用具名常量（或枚举、配置）取代字面量，让意图一目了然：

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

具名常量、枚举和配置把“含义”从“数值”中剥离出来，既自解释，又能在单点修改、全局生效，显著降低遗漏和误改的风险。

## 如何避免

- 用 `const`、枚举或配置项取代散落的字面量，让每个取值都有明确语义名称。
- 把可能变化的业务阈值外置到配置文件，避免硬编码。
- 在代码评审中把“裸字面量”列为需要命名或提取的信号。

- 相关：[命名规范](../standards/naming.md)、[依赖注入](../concepts/dependency-injection.md)
- 官方文档：[C# coding style](https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style)
