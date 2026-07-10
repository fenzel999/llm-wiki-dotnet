---
title: record 与 class 对比
summary: record 提供值语义与不可变建模，class 提供引用语义与可变状态；按相等性与生命周期选型；附 record struct 与 AOT 说明。
tags: [comparison, record, class]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record
updated: 2026-07-11
---

# record 与 class 对比

> **要点速览**
> - `record` = 值相等 + 不可变建模；`class` = 引用相等 + 可变状态。
> - DTO/值对象/不可变数据用 record；有身份/可变/复杂继承用 class。
> - 想避免堆分配用 `record struct`（值类型）；普通 `record` 仍是引用类型，会堆分配。
> - `record` 也支持可变属性（`set`），"不可变"是约定不是强制——关键差异是**默认值相等**。

## 概述

`record` 和 `class` 在 C# 里都是引用类型——变量存的是"指向堆上对象的引用"，不是对象本身。但两者想表达的东西完全不同：`record` 想说"这个值是什么"，`class` 想说"这个东西是谁"。展开成两个关键差异：

1. **相等性**：`record` 默认按内容比较；`class` 默认按引用（同一对象才相等）。
2. **可变性**：`record` 主构造器属性默认 `init`（配合 `with` 非破坏性拷贝）；`class` 默认可变。

选型核心矛盾：**你关心"内容是否相同、能否安全当数据传来传去"，还是"它作为唯一实体有身份和状态"？** 前者 `record`，后者 `class`。

## 取舍对比

| 维度 | record | class |
|------|--------|-------|
| 语义 | 值语义，按内容比较 | 引用语义，按对象标识比较 |
| 相等性 | `==`/`Equals` 比较所有字段 | 默认比较引用 |
| 不可变性 | 默认 `init`，`with` 非破坏性变更 | 默认可变 |
| 哈希 | 自动基于成员生成 | 需手写 `GetHashCode` |
| 拷贝 | `with` 浅拷贝副本 | 需手写克隆 |
| 继承 | 支持；跨层级比较靠 `EqualityContract` | 完整继承体系 |
| 分配 | `record class` 仍堆分配；`record struct` 值类型栈分配 | 引用类型堆分配 |
| 典型开销 | `with` 每次新分配 | 原地改无额外分配 |

## 正确做法

### 1. 按"数据 vs 实体"选型

| 它是什么 | 用 | 例子 |
|----------|----|------|
| 只为装数据、比较看内容、建好基本不变 | `record` | DTO、配置、消息、领域事件、值对象 |
| 有身份、有状态、运行期反复改 | `class` | Account、Connection、Order 聚合根 |
| 要值语义又不想进堆 | `record struct` | 热点路径上的小值对象（Money、Point） |

### 2. 示例

```csharp
// record：值语义 + 不可变 + with 拷贝
public record Person(string Name, int Age);

var a = new Person("Alice", 30);
var b = a with { Age = 31 };   // 非破坏性变更，生成新副本
Console.WriteLine(a == b);     // False：内容不同

// record struct：值类型、无堆分配
public readonly record struct Money(decimal Amount, string Currency);

// class：引用语义 + 可变状态 + 身份
public class Account
{
    public string Id { get; set; } = "";
    public decimal Balance { get; set; }
}
var acc1 = new Account { Id = "A1", Balance = 100 };
var acc2 = acc1;                // 同一引用
acc2.Balance = 200;
Console.WriteLine(acc1.Balance); // 200：变更共享可见
Console.WriteLine(acc1 == acc2); // True：引用相等
```

`record` 自动生成基于全部成员的 `Equals`/`GetHashCode`，可直接作 `Dictionary`/`HashSet` 键，无需样板。

## 常见误区

❌ **以为"用了 record 就零分配"**。`record class` 仍是引用类型、堆分配；只有 `record struct` 才是值类型。高频创建的小数据考虑 `record struct`。

❌ **在热路径上用 `with` 反复拷贝**。`with` 每次产生新对象分配，成千上万次就地更新时，可变 `class` 反而更省。record 适合"建好后只读、只在边界偶尔换字段生成新版本"。

❌ **以为 record 一定不可变**。`record` 也能写 `set` 可变属性；不可变是约定（默认 `init`）。需要真不可变就坚持 `init`/`readonly record struct`。

❌ **把有身份的领域实体（如聚合根）定义成 record**。聚合根是"同一份"，应用 `class` + 引用相等，否则"两个字段相同的订单"会被误判为相等。

## 适用版本

`record`（class/struct）C# 9+；`readonly record struct` C# 10+；`with` 表达式同代。

### Native AOT 兼容性

`record` 与 `class` 都是普通 C# 类型，**AOT 安全**（[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。注意：若 record 作为 JSON 序列化目标，需 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）；`with`/相等性生成的成员无反射，不影响 AOT。

## 参考资料

- [record 值语义与不可变建模](../dotnet/csharp/modern-csharp.md#records) · [Span 与内存安全](../dotnet/csharp/modern-csharp.md#span)
- [List 与 ImmutableArray 对比](list-vs-immutablearray.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[record（C# 参考）](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
