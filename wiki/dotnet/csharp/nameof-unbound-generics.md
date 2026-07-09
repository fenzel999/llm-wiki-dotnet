---
title: nameof 非绑定泛型
summary: C# 14 允许对非绑定泛型类型使用 nameof，如 nameof(List<>) 返回 "List"。
tags: [csharp, nameof, generics, csharp14, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

C# 14 起，`nameof` 运算符可作用于 unbound generic（非绑定泛型，即不指定类型实参的泛型）。例如 `nameof(List<>)` 现在合法并返回 `"List"`。以往必须提供占位类型实参（如 `nameof(List<int>)`），在编写通用日志、诊断或源生成器辅助代码时更繁琐。

## 正确做法

```csharp
using System.Collections.Generic;

string a = nameof(List<>);              // "List"
string b = nameof(Dictionary<,>);      // "Dictionary"

Console.WriteLine($"{a}, {b}");        // List, Dictionary
```
<!-- ⚠️ needs-your-call: 确认 nameof(Dictionary<,>) 多元非绑定写法 -->

用于诊断消息时不再需要挑一个「无意义」的类型实参：

```csharp
// 旧写法：nameof(List<object>)
// 新写法：
throw new InvalidOperationException($"不支持 {nameof(List<>)} 类型");
```

## 常见错误

- 期望结果包含泛型元数（arity）或尖括号：`nameof(List<>)` 只返回 `"List"`，不含 `` `1 ``。
- 在旧语言版本（LangVersion < 14）使用会编译报错。
- 混淆 `nameof(List<>)` 与 `typeof(List<>)`：后者返回开放泛型的 `Type` 对象。

## 适用版本

=== "net10"
    支持 `nameof(List<>)` 非绑定泛型（C# 14）。

=== "net8"
    需提供类型实参：`nameof(List<int>)`。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[.NET 10 主题地图](../overview.md)

