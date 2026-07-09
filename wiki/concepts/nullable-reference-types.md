---
title: 可空引用类型（NRT）与静态流分析
summary: 通过 <Nullable>enable</Nullable> 让编译器在编译期警告可能的 null 解引用，区分可空与不可空引用类型。
tags: [nullable, nrt, csharp, 类型系统]
introduced-in: csharp8
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/nullable-references
updated: 2026-07-10
---

## 概述

可空引用类型（Nullable Reference Types, NRT）是 C# 8 引入的编译期静态流分析（static flow analysis）特性，它不改变运行时行为，只在编译期帮助我们发现潜在的 null 解引用。开启 `<Nullable>enable</Nullable>` 后，`string` 表示“不可为 null”，而 `string?` 表示“可能为 null”；编译器会沿赋值与分支追踪每个变量的 null 状态，在它判定可能为空却仍被解引用的地方给出警告。这样大多数 null 相关的缺陷都能在编码阶段被发现，而不是等到生产环境才崩溃。

## 正确做法

在项目文件中开启 NRT，然后让编译器借助控制流自动推断 null 状态。下面的 `GetName` 方法在 `user is null` 分支返回后，编译器即判定后续 `user` 为非 null，从而安全访问 `user.Name`；只有在确实无法被分析、而你又确信非空时，才用 null 容忍运算符 `!` 显式声明。

```csharp
#nullable enable

string GetName(User? user)
{
    if (user is null)
        return "anonymous";

    // 此处 user 已被流分析判定为非 null
    return user.Name;

    // 若明确知道非空但无法被分析，可用 null 容忍运算符(Null-forgiving)
    // return user!.Name;
}

public class User
{
    public string Name { get; set; } = string.Empty;
}
```

在项目文件开启：

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

## 反例（常见错误）

❌ 滥用 `!` 压制所有警告，表面上编译通过，运行时却仍是空引用解引用：

```csharp
❌ string? name = null;
int len = name!.Length; // 编译期无警告，运行期 NullReferenceException
```

- 误以为 `string?` 会在运行时阻止 null：NRT 仅是编译期注解，运行时的行为与过去完全一致。
- 库作者不标注可空性，会导致调用方拿到大量具有误导性的警告，削弱 NRT 的价值。
- `null!` 初始化只应用于绕过序列化/快照构造等编译器确实无法分析的合法场景，不应滥用。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [异步](../concepts/async-await.md)
- [泛型](../concepts/generics.md)
- 官方文档：[可空引用类型](https://learn.microsoft.com/dotnet/csharp/nullable-references)
