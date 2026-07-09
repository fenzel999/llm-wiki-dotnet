---
title: 模式匹配(pattern matching)
summary: 使用 is 模式、switch 表达式与属性/位置/关系模式写出简洁且可穷尽的数据分支逻辑。
tags: [pattern-matching, csharp, switch, 语法糖]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching
updated: 2026-07-09
---

## 概述

模式匹配(pattern matching)允许在 `is` 表达式与 `switch` 表达式中对数据的类型、属性、位置与关系进行声明式分支。C# 提供类型模式、属性模式(property pattern)、位置模式(positional pattern)、关系模式(relational pattern)等，常配合 `record` 使用。

## 正确做法

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

## 常见误区

- switch 表达式遗漏 `_` 兜底，导致编译器报“未穷尽”错误。
- 在 is 模式里用 `{ }` 不了解其表示“非 null”。
- 过度嵌套 `when` 子句，反而比普通 if 更难读。

## 参考资料

- [record](../concepts/records.md)
- [可空引用类型](../concepts/nullable-reference-types.md)
