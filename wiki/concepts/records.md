---
title: record 值语义与不可变建模
summary: record 提供基于值的相等性与非破坏性变更(with)，适合建模 DTO 与不可变数据。
tags: [record, csharp, 值语义, 不可变]
introduced-in: net10
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record
updated: 2026-07-09
---

## 概述

`record` 是一种具有值语义(value semantics)的引用类型：默认基于所有字段/属性生成相等性比较与 `ToString`。非破坏性变更通过 `with` 表达式生成副本。位置记录(positional record)用构造函数参数声明成员，`record struct` 则提供值类型的 record。

## 正确做法

```csharp
public record Person(string Name, int Age);

var a = new Person("Alice", 30);
var b = a with { Age = 31 };   // 拷贝并修改单个属性
Console.WriteLine(a == b);     // False，值相等

// 位置记录自动提供 Deconstruct
var (name, age) = b;

// 值类型 record
public record struct Point(int X, int Y);
```

## 常见误区

- 以为 record 一定是不可变的：`record class` 属性默认有 `init` 访问器，但仍可声明 `set`。
- 在需要引用相等时用 record，导致集合去重/字典键行为异常。
- 继承 record 时基类型与派生类型比较可能返回 false，注意层次结构设计。

## 参考资料

- [可空引用类型](../concepts/nullable-reference-types.md)
- [泛型](../concepts/generics.md)
