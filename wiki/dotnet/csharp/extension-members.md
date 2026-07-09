---
title: extension 成员（extension 块）
summary: C# 14 用 extension 块统一声明扩展方法、属性与运算符，替代传统静态扩展类。
tags: [csharp, extension, csharp14, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

C# 14 引入 `extension` 块（extension members，扩展成员），将某个接收者类型的扩展方法、扩展属性甚至扩展运算符集中在一个块中声明，替代以往「静态类 + `this` 参数」的写法，可读性更好，并首次支持扩展属性/静态扩展成员。

## 正确做法

用 `extension(接收者)` 声明实例扩展方法与属性：

```csharp
public static class StringExtensions
{
    extension(string s)
    {
        public int WordCount => s.Split(' ').Length;
        public bool IsBlank() => string.IsNullOrWhiteSpace(s);
    }
}

// 用法
int n = "hello world".WordCount;   // 2
bool b = "  ".IsBlank();           // true
```
<!-- ⚠️ needs-your-call: 确认 C# 14 extension 块的最终语法形式（extension(string s) { ... }） -->

仍可与传统 `this` 扩展方法互操作：

```csharp
public static class StringEx
{
    public static int WordCount(this string s) => s.Split(' ').Length;
}
```

## 常见错误

- 期望扩展成员能访问接收者的私有成员：扩展仍只能访问可见的公共/内部 API。
- 扩展属性中缓存状态：扩展不能为对象添加实例字段，属性应是纯计算。
- 与同名实例成员冲突时忘记实例成员优先于扩展成员被解析。

## 适用版本

=== "net10"
    支持 `extension` 块及扩展属性/静态扩展成员。

=== "net8"
    仅支持传统 `this` 参数扩展方法，无扩展属性。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[.NET 10 主题地图](../overview.md)

