---
title: field 关键字
summary: C# 14 在属性访问器中用 field 引用编译器生成的支持字段，免手写私有字段。
tags: [csharp, field, properties, csharp14, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

C# 14 的 `field` 关键字（上下文关键字）允许在属性访问器内直接引用编译器生成的 backing field（支持字段），无需再显式声明私有字段即可在 `get`/`set` 中加入逻辑（校验、归一化、惰性计算等），减少样板代码。

## 正确做法

在 setter 中做非空校验，无需手写 `_name`：

```csharp
public class User
{
    public string Name
    {
        get => field;
        set => field = value ?? throw new ArgumentNullException(nameof(value));
    }
}
```

只写需要的访问器，另一侧仍自动使用同一支持字段：

```csharp
public class Temperature
{
    public double Celsius
    {
        get => field;
        set => field = Math.Round(value, 2);
    }
}
```

## 常见错误

- 把 `field` 当普通标识符：若类型中已有名为 `field` 的成员会产生歧义，建议改名或用 `this.field` / `@field` 消歧。
- 在自动实现属性（无访问器体）中期望访问 `field`：需至少一个访问器带方法体。
- 误以为 `field` 能在方法或构造函数中直接引用；它只在该属性访问器内有效。

## 适用版本

=== "net10"
    `field` 关键字正式可用（C# 14）。

=== "net8"
    需手写私有字段：`private string _name;`。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[.NET 10 主题地图](../overview.md)

