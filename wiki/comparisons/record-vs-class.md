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

`record` 和 `class` 在 C# 里都是引用类型——也就是说变量存的是"指向堆上对象的引用"，不是对象本身。但光看这点会让人误以为它们差不多，实际上两者想表达的东西完全不同：`record` 想说的是"这个值是什么"，而 `class` 想说的是"这个东西是谁"。

这一句话可以展开成两个关键差异。其一是**相等性**：`record` 默认按内容比较，两个 `record` 只要每个字段都一样，它们就相等；`class` 默认按"是不是同一个对象"比较，两个字段一模一样的 `class` 实例，只要不是同一个引用，就不相等。其二是**可变性**：`record` 主构造器里的属性默认是不可变的（`init` 访问器），配合 `with` 表达式可以做"不改原对象、只换个字段返回新副本"的非破坏性拷贝；`class` 默认可变，你爱怎么改就怎么改，改完原对象也跟着变。

所以选型的核心矛盾其实很清晰：**你关心的是"内容是否相同、能不能安全地当数据传来传去"，还是"它作为唯一一个实体、有自己的身份和状态"？** 前者用 `record`，后者用 `class`。如果连堆分配都不想要，还可以用 `record struct` 拿到值语义的同时避免引用类型的开销——这一点我们在 [record 值语义](../dotnet/csharp/modern-csharp.md#records) 里还会展开。

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

什么场景该用 `record`？最典型的就是那些"只为装数据而生"的东西：DTO、配置对象、消息、事件，以及那些一旦建好就不需要再变的领域模型。它们天然适合值语义——你不在乎它是不是"同一个对象实例"，你只关心"它装的内容对不对"。`record` 自动帮你生成基于全部成员的 `Equals` 和 `GetHashCode`，所以你把它直接扔进 `HashSet` 或当 `Dictionary` 的键，都不用自己写样板。再配合 `with`，改一个字段生成新副本这件事变得特别顺手，而又不破坏原对象。

`class` 则适合另一类东西：它有身份、有状态、生命周期长，而且你会在程序运行期间反复改动它。账户、连接、订单这种"现实世界里就是独一份"的实体，用 `class` 更自然——你希望 `acc1` 和 `acc2` 指向的就是同一个账户，改了余额两边都能看见；你也不希望"两个账户字段一样"就被判定成"它们是同一个"。复杂继承体系、需要引用相等语义的地方，同样该交给 `class`。

性能上有一点容易想当然：`record class` 仍然是引用类型，分配还是在堆上，所以别以为"用了 record 就零分配"——只有 `record struct` 才是真正的值类型、栈上分配。`with` 表达式每次都会造一个新对象，所以在"高频原地更新"的循环里硬用 `record` 反而会比直接用可变 `class` 更费。反过来，`record struct` 在既要值语义、又要避免堆分配时是个好答案。

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

上面这段把两种语义的"体感"摆得很清楚：`a` 和 `b` 是两个独立的 `Person`，改一个不影响另一个，比较的是内容；而 `acc1` 和 `acc2` 指向同一个 `Account`，改了一处另一处也跟着变，比较的是"是不是同一个对象"。

## 结论与建议

把选择标准压成一句话：**你要建模的是"数据"还是"实体"？**

如果它是数据——只携带信息、比较时看内容、建好之后基本不再变——那就用 `record`。它自动生成的相等与哈希能帮你省掉一大堆样板，尤其是当你要把对象当字典键、或者要频繁比较"两个东西装的是不是一样"的时候。如果同时还想要值语义又不想进堆，记得考虑 `record struct`（细节见 [record](../dotnet/csharp/modern-csharp.md#records)）。

如果它是有身份、有状态、会被反复修改的实体——"同一笔账户就是同一个对象"这种——那就用 `class`。它让你原地改状态、用引用标识唯一性，复杂的继承体系也更好表达。

最后给一个实践里的提醒：`with` 很优雅，但每次都分配新对象。如果你的对象在热路径上被成千上万次就地更新，`record` 的不可变 + 拷贝模型会拖慢你，那种时候一个可变的 `class` 反而更合适。相对的，如果你的对象建好后只读、只在边界处偶尔"换一个字段生成新版本"，那 `record` 几乎总是更省心、更不容易出 bug 的选择。

## 参考资料

- 相关：[record 值语义与不可变建模](../dotnet/csharp/modern-csharp.md#records)
- 相关：[Span 与内存安全](../dotnet/csharp/modern-csharp.md#span)
- 相关：[List 与 ImmutableArray 对比](list-vs-immutablearray.md)
- 官方文档：[record（C# 参考）](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
