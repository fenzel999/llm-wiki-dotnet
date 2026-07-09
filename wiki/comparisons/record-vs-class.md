---
title: record 与 class 对比
summary: record 提供值语义与不可变建模，class 提供引用语义与可变状态；按相等性与生命周期选型。
tags: [comparison, record, class, 值语义, 引用语义]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record
updated: 2026-07-10
---

## 概述

`record` 与 `class` 都是引用类型，但语义取向不同：`record` 提供值语义（value semantics），按内容比较相等性，并默认不可变、支持 `with` 非破坏性拷贝，适合建模数据；`class` 提供引用语义（reference semantics），按对象标识比较，适合需要可变状态、长生命周期与唯一身份的实体。选型的核心矛盾是“值相等 / 不可变”与“引用身份 / 可变状态”。下面按维度展开，需要零堆分配的值语义时可用 `record struct`。

## 取舍对比

| 维度 | record（记录类型） | class（类） |
|------|-------------------|-------------|
| 语义 | 值语义(value semantics)，按内容比较相等性 | 引用语义(reference semantics)，按对象标识比较 |
| 相等性 | `==`/`Equals` 默认比较所有字段/属性 | 默认比较引用（同一对象才相等） |
| 不可变性 | 默认 `init` 访问器，配合 `with` 非破坏性变更 | 默认 `set`，可变状态 |
| 哈希 | 自动基于成员生成，适合做 `Dictionary`/`HashSet` 键 | 需手动实现 `GetHashCode` |
| 拷贝 | `with` 表达式生成浅拷贝副本 | 需手动写拷贝构造或克隆逻辑 |
| 继承 | 支持但跨层级比较易返回 false | 完整继承体系 |
| 性能 | 引用类型（record class）仍有堆分配；record struct 为值类型 | 引用类型，堆分配；可变更新就地完成 |
| 典型开销 | `with` 每次产生新对象分配 | 原地修改无额外分配 |

**何时用 record**

- DTO、配置、消息、事件、不可变领域模型。
- 需要值相等、`with` 拷贝、清晰 `ToString` 时。
- 需要零堆分配的值语义时，用 `record struct`（见 [record](../concepts/modern-csharp.md#records)）。

**何时用 class**

- 需要可变状态与长生命周期、身份唯一（同一对象即同一实体）。
- 复杂继承层次，或需引用相等语义时。

```csharp
// record：值语义 + 不可变 + with 拷贝
public record Person(string Name, int Age);

var a = new Person("Alice", 30);
var b = a with { Age = 31 };   // 非破坏性变更，生成新副本
Console.WriteLine(a == b);     // False：内容不同
Console.WriteLine(a with { }); // 等价拷贝

// class：引用语义 + 可变状态 + 身份
public class Account
{
    public string Id { get; set; } = "";
    public decimal Balance { get; set; }
}

var acc1 = new Account { Id = "A1", Balance = 100 };
var acc2 = acc1;                // 同一引用
acc2.Balance = 200;
Console.WriteLine(acc1.Balance); // 200：引用共享，变更可见
Console.WriteLine(acc1 == acc2); // True：引用相等
```

## 结论与建议

默认按“是否关心相等性 / 是否不可变”来选：建模数据且要值相等与不可变，用 `record`；建模有身份、可变的实体，用 `class`。当对象需要作为字典键或频繁比较内容时，`record` 自动生成的相等与哈希能省去大量样板。若同时要值语义又不想堆分配，选 `record struct`。注意 `with` 每次产生新对象分配，高频原地更新场景用 `class` 反而更省。

## 参考资料

- 相关：[record 值语义与不可变建模](../concepts/modern-csharp.md#records)
- 相关：[Span 与内存安全](../concepts/modern-csharp.md#span)
- 相关：[List 与 ImmutableArray 对比](list-vs-immutablearray.md)
- 官方文档：[record（C# 参考）](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
