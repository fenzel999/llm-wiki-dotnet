---
title: 过度可变性（Excessive Mutability）
summary: 默认使用可变类型易被意外修改引发 bug，应优先使用 record/只读。
tags: [anti-pattern, immutability, design]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 为什么是反模式

默认把所有类型都声明为可变的（可变 class + 公共 setter），会让对象在任何地方被悄悄修改，导致难以追踪的状态变化、并发下的数据竞争，以及被意外别名（aliasing）共享后产生的 bug。显式地把数据建模为不可变（immutable）可以消除一类整类问题，让代码更易推理、更安全、更利于并发与缓存。

## ❌ 错误写法

```csharp
public class Money
{
    public decimal Amount { get; set; }
    public string Currency { get; set; }
}

var a = new Money { Amount = 100, Currency = "CNY" };
var b = a;
b.Amount = 200; // a.Amount 也被改成 200，调用方完全不知情
```

## ✅ 正确写法

优先使用 `record`（或只读属性 + 私有 setter），并通过返回新实例表达“变更”：

```csharp
public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (other.Currency != Currency)
            throw new InvalidOperationException("币种不一致");
        return this with { Amount = Amount + other.Amount };
    }
}

var a = new Money(100, "CNY");
var b = a.Add(new Money(50, "CNY")); // a 不变，b 是新实例
```

对于需要只读保证的类：

```csharp
public class Snapshot
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Snapshot(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }
}
```

## 相关

- [依赖注入](../concepts/dependency-injection.md)
- [空处理](../standards/null-handling.md)
