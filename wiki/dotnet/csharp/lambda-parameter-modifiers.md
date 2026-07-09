---
title: lambda 参数修饰符
summary: C# 14 允许在 lambda 参数上使用 ref/in/out 修饰符，无需显式写出参数类型。
tags: [csharp, lambda, ref, csharp14, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

C# 14 允许在 lambda（匿名函数）参数上直接使用 `ref`、`in`、`out` 参数修饰符，且无需再显式写出参数类型即可推断。以往要匹配含 `ref`/`out` 的委托签名，必须写出完整类型；现在可省略，代码更简洁。

## 正确做法

```csharp
delegate void RefAction(ref int x);

RefAction inc = (ref x) => x++;

int value = 41;
inc(ref value);
Console.WriteLine(value);   // 42
```

`out` 参数：

```csharp
delegate bool TryParse(string s, out int result);

TryParse parse = (string s, out result) => int.TryParse(s, out result);
if (parse("10", out int r))
    Console.WriteLine(r);   // 10
```
<!-- ⚠️ needs-your-call: 确认 out 参数是否可完全省略类型（(s, out result) =>） -->

## 常见错误

- 对同时省略类型又用 `out` 的参数期望自动确定类型：编译器需能从委托目标推断，否则须写明类型。
- 忘记 `ref`/`out` lambda 无法转换为不带修饰符的 `Func<>`/`Action<>`，必须使用匹配的自定义委托。
- 在 `out` 分支未赋值即返回：与普通方法一样必须确保 `out` 参数被赋值。

## 适用版本

=== "net10"
    支持 lambda 参数上的 `ref`/`in`/`out` 修饰符（C# 14）。

=== "net8"
    需写出完整参数类型，且部分修饰符组合不被支持。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[隐式 Span 转换](implicit-span-conversions.md)

