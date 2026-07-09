---
title: 过度可变性（Excessive Mutability）
summary: 默认使用可变类型易被意外修改引发 bug，应优先使用 record/只读。
tags: [anti-pattern, immutability, design]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record
updated: 2026-07-10
---

## 为什么是反模式

默认把所有类型都声明为可变的（可变 class 加公共 setter），会让对象在任何地方被悄悄修改，导致难以追踪的状态变化、并发下的数据竞争，以及被意外别名（aliasing）共享后产生 bug。这类问题之所以高发，是因为可变类型在传递时往往以引用共享，调用方无法预期它何时被改动。显式地把数据建模为不可变（immutable）可以消除整类问题，让代码更易推理、更安全，也更利于并发与缓存。

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

`Money` 的属性和可写，`b` 与 `a` 指向同一个实例，修改 `b` 会无声地改变 `a`，调用方对共享引用的修改毫无察觉，埋下状态不一致的隐患。

## ✅ 正确写法

优先使用 `record`（或只读属性加私有 setter），通过返回新实例来表达“变更”：

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

不可变类型在赋值或传递时不会互相影响，值一经创建便不会改变，因此天然线程安全、易于比较与缓存，也避免了别名带来的意外副作用。

## 如何避免

- 默认以 `record` 或只读属性建模数据，仅在有明确需求时才提供可写成员。
- 表达状态变化时返回新实例（如 `with` 表达式），而非就地修改。
- 在代码评审中关注“可变共享状态”，对公共 setter 的使用提出质疑。

- 相关：[依赖注入](../concepts/dependency-injection.md)、[空处理](../standards/null-handling.md)
- 官方文档：[Records (C# reference)](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
