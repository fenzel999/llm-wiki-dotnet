---
title: record 值语义与不可变建模
summary: record 提供基于值的相等性与非破坏性变更（with），适合建模 DTO 与不可变数据。
tags: [record, csharp, 值语义, 不可变]
introduced-in: csharp9
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record
updated: 2026-07-10
---

## 概述

`record` 是一种具有值语义（value semantics）的引用类型：编译器会基于其全部字段与属性自动生成相等性比较与 `ToString`，因此两个“内容相同”的 record 实例会被判定为相等。非破坏性变更通过 `with` 表达式生成只修改个别属性、其余保持不变的副本，非常适合建模 DTO、配置与不可变数据。位置记录（positional record）用构造函数参数直接声明成员，而 `record struct` 则提供值类型版本的 record，二者在需要值相等语义时各有用途。

## 正确做法

用位置记录声明数据载体，并用 `with` 生成“改一处、其余不变”的新实例。下面的 `Person` 在比较时按值相等；`with { Age = 31 }` 返回的是 `a` 的副本而非原地修改，所以 `a == b` 为 `False`。位置记录还会自动提供 `Deconstruct`，让解构赋值变得自然；当需要在栈上承载值相等的小型数据时，可改用 `record struct`。

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

## 反例（常见错误）

❌ 需要按引用区分实例时仍使用 record，会因其值相等语义导致集合去重/字典键行为出乎意料：

```csharp
❌ var dict = new Dictionary<Person, int>();
dict[new Person("A", 1)] = 1;
dict[new Person("A", 1)] = 2; // 覆盖同一键（值相等）；若本意按引用区分则出错
```

- 以为 record 一定不可变：`record class` 的属性默认是 `init` 访问器，但你仍可以显式声明 `set`。
- 继承 record 时，基类型与派生类型实例即便字段相同也可能比较为 `False`，设计层次结构时需留意。

## 适用版本

`record class` 自 C# 9 引入；`record struct` 自 C# 10 引入。两者在所有受支持版本中均可使用，无运行行为差异，仅取决于所选语言版本。

## 参考资料

- [可空引用类型](../concepts/nullable-reference-types.md)
- [泛型](../concepts/generics.md)
- 官方文档：[record 类型](https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record)
