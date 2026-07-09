---
title: 空条件赋值（?.=）
summary: C# 14 允许 x?.Y = z，仅当 x 非 null 时才执行赋值。
tags: [csharp, null-conditional, csharp14, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

C# 14 将空条件运算符（null-conditional operator，`?.`）扩展到赋值左侧：`x?.Y = z;` 表示仅当 `x` 不为 null 时才把 `z` 赋给 `x.Y`；若 `x` 为 null 则整条赋值被跳过，`z` 也不会求值副作用地写入。以往需要 `if (x != null) x.Y = z;`。

## 正确做法

```csharp
public class Options
{
    public string? Theme { get; set; }
}

static void ApplyTheme(Options? opt, string theme)
{
    opt?.Theme = theme;   // opt 为 null 时什么都不做
}
```

同样适用于索引器与事件字段：

```csharp
list?[0] = 42;            // list 非 null 才赋值
```
<!-- ⚠️ needs-your-call: 确认索引器形式 list?[0] = 42; 的支持范围 -->

## 常见错误

- 误以为右侧 `z` 总会被求值：当左侧接收者为 null 时，右侧表达式不会被求值。
- 与复合赋值混淆：`x?.Y += z;` 也遵循同样的短路规则，但要注意 `Y` 需可读写。
- 把 `?.=` 用于值类型字段访问期望「无操作」——接收者必须是可为 null 的引用/可空类型。

## 适用版本

=== "net10"
    支持 `x?.Y = z;` 空条件赋值（C# 14）。

=== "net8"
    需显式判空：`if (x is not null) x.Y = z;`。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[field 关键字](field-keyword.md)

