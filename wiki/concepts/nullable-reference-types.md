---
title: 可空引用类型(NRT)与静态流分析
summary: 通过 <Nullable>enable</Nullable> 让编译器在编译期警告可能的 null 解引用，区分可空与不可空引用类型。
tags: [nullable, nrt, csharp, 类型系统]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

可空引用类型(Nullable Reference Types, NRT)是 C# 8 引入的编译期静态流分析(static flow analysis)特性。开启 `<Nullable>enable</Nullable>` 后，`string` 表示不可为 null，`string?` 表示可为 null。编译器会跟踪变量在赋值/分支中的 null 状态，并在可能为 null 的解引用处给出警告，而非运行时崩溃。

## 正确做法

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

## 常见误区

- 误以为 `string?` 会在运行时阻止 null：NRT 仅是编译期注解，运行时无区别。
- 滥用 `!` 压制所有警告，掩盖真实 null 风险。
- 库作者不标注可空性，导致调用方获得大量误导警告。
- 在已开启 NRT 的项目里，`null!` 初始化仅用于绕过快照构造的合法场景。

## 参考资料

- [异步](../concepts/async-await.md)
- [泛型](../concepts/generics.md)
