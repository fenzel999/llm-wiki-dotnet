---
title: 模式匹配（pattern matching）
summary: 使用 is 模式、switch 表达式与属性/位置/关系模式写出简洁且可穷尽的数据分支逻辑。
tags: [pattern-matching, csharp, switch, 语法糖]
introduced-in: csharp7
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching
updated: 2026-07-10
---

## 概述

模式匹配（pattern matching）让我们能在 `is` 表达式与 `switch` 表达式中，对数据的类型、属性、位置与关系进行声明式分支，从而把一长串 `if/else` 与类型转换收敛为可读性更高的表达式。C# 自 7.0 起逐步引入类型模式，并在后续版本扩展出属性模式（property pattern）、位置模式（positional pattern）、关系模式（relational pattern）与逻辑模式（logical pattern），它们常与 `record` 配合使用，是编写数据驱动分支逻辑的有力工具。

## 正确做法

用 `switch` 表达式把对象分类写成一组模式，并尽可能利用关系模式与逻辑模式减少样板。下面的 `Classify` 方法先用 `null` 模式兜底，再用属性模式匹配原点、用位置加关系模式判断正象限，最后用逻辑模式 `and not ""` 处理非空字符串，整段逻辑紧凑且可穷尽。

```csharp
public record Point(int X, int Y);

string Classify(object obj) => obj switch
{
    null => "null",
    Point { X: 0, Y: 0 } => "origin",
    Point (> 0, > 0) => "positive",     // 位置 + 关系模式
    Point p when p.X == p.Y => "diagonal",
    string s and not "" => $"str:{s}",  // 逻辑模式
    _ => "other"
};

if (obj is Point { X: var x, Y: var y })
    Console.WriteLine($"{x},{y}");
```

## 反例（常见错误）

❌ 漏掉 `_` 兜底分支，编译器无法证明输入已被全部覆盖，会直接报“未穷尽”错误：

```csharp
❌ string Kind(object o) => o switch
{
    int n => "num",
    // 缺少 _ 兜底 → 编译错误：switch 表达式未穷尽
};
```

- 不了解 `is { }` 中 `{ }` 表示“非 null”的语义，容易写出冗余或相反的判断。
- 在模式里过度堆叠 `when` 子句，反而比普通 `if` 更难阅读，失去了模式匹配的清晰优势。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [record](../concepts/records.md)
- [可空引用类型](../concepts/nullable-reference-types.md)
- 官方文档：[模式匹配](https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching)
