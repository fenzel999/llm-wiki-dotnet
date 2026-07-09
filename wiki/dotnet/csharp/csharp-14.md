---
title: C# 14 新特性
summary: .NET 10 / C# 14 的关键语言特性——extension 成员、field 关键字、空条件赋值、nameof 非绑定泛型、隐式 Span 转换、lambda 参数修饰符。
tags: [csharp, csharp14, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-14
updated: 2026-07-10
---

# C# 14 新特性

C# 14（随 .NET 10 发布）围绕「更少的样板、更强的表达能力」引入了一批语言特性。
本页汇总 6 个最常用的新特性；每个特性均含**正确做法**、**常见错误**与版本对照。

## extension 成员（extension 块） {#extension-members}

`extension` 块（extension members，扩展成员）将某个接收者类型的扩展方法、扩展属性甚至扩展运算符集中在一个块中声明，替代以往「静态类 + `this` 参数」的写法，可读性更好，并首次支持扩展属性与静态扩展成员。

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

仍可与传统 `this` 扩展方法互操作：

```csharp
public static class StringEx
{
    public static int WordCount(this string s) => s.Split(' ').Length;
}
```

**常见错误**
- 期望扩展成员能访问接收者的私有成员：扩展仍只能访问可见的公共/内部 API。
- 扩展属性中缓存状态：扩展不能为对象添加实例字段，属性应是纯计算。
- 与同名实例成员冲突时忘记实例成员优先于扩展成员被解析。

## field 关键字 {#field-keyword}

`field` 关键字（上下文关键字）允许在属性访问器内直接引用编译器生成的 backing field（支持字段），无需再显式声明私有字段即可在 `get`/`set` 中加入逻辑（校验、归一化、惰性计算等），减少样板代码。

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

**常见错误**
- 把 `field` 当普通标识符：若类型中已有名为 `field` 的成员会产生歧义，建议改名或用 `@field` 消歧。
- 在自动实现属性（无访问器体）中期望访问 `field`：需至少一个访问器带方法体。
- 误以为 `field` 能在方法或构造函数中直接引用；它只在该属性访问器内有效。

## 空条件赋值（?.=） {#null-conditional-assignment}

C# 14 将空条件运算符（`?.`）扩展到赋值左侧：`x?.Y = z;` 表示仅当 `x` 不为 null 时才把 `z` 赋给 `x.Y`；若 `x` 为 null 则整条赋值被跳过，`z` 也不会被求值。以往需要 `if (x != null) x.Y = z;`。

```csharp
public class Options { public string? Theme { get; set; } }

static void ApplyTheme(Options? opt, string theme)
{
    opt?.Theme = theme;   // opt 为 null 时什么都不做
}
```

同样适用于索引器：

```csharp
list?[0] = 42;   // list 非 null 才赋值
```

**常见错误**
- 误以为右侧 `z` 总会被求值：当左侧接收者为 null 时，右侧表达式不会被求值。
- 与复合赋值混淆：`x?.Y += z;` 也遵循同样的短路规则，但要注意 `Y` 需可读写。
- 把 `?.=` 用于值类型字段访问期望「无操作」——接收者必须是可为 null 的引用/可空类型。

## nameof 非绑定泛型 {#nameof-unbound-generics}

C# 14 起，`nameof` 可作用于 unbound generic（非绑定泛型，即不指定类型实参的泛型）。例如 `nameof(List<>)` 现在合法并返回 `"List"`。以往必须提供占位类型实参（如 `nameof(List<int>)`）。

```csharp
using System.Collections.Generic;

string a = nameof(List<>);         // "List"
string b = nameof(Dictionary<,>);   // "Dictionary"
Console.WriteLine($"{a}, {b}");     // List, Dictionary
```

**常见错误**
- 期望结果包含泛型元数（arity）或尖括号：`nameof(List<>)` 只返回 `"List"`，不含 `` `1 ``。
- 在旧语言版本（LangVersion < 14）使用会编译报错。
- 混淆 `nameof(List<>)` 与 `typeof(List<>)`：后者返回开放泛型的 `Type` 对象。

## 隐式 Span 转换 {#implicit-span-conversions}

.NET 10 / C# 14 改进了隐式 Span 转换：`string` 可隐式转换为 `ReadOnlySpan<char>`，数组 `T[]` 可隐式转换为 `Span<T>` / `ReadOnlySpan<T>`。这让接受 Span 参数的高性能 API 可直接传入字符串或数组，无需显式 `.AsSpan()`，减少分配并统一重载。

```csharp
static int CountSpaces(ReadOnlySpan<char> text)
{
    int count = 0;
    foreach (var c in text)
        if (c == ' ') count++;
    return count;
}

int n = CountSpaces("a b c");   // 2，字符串隐式转 ReadOnlySpan<char>
```

数组隐式转 `Span<T>`：

```csharp
static void Fill(Span<int> buffer)
{
    for (int i = 0; i < buffer.Length; i++)
        buffer[i] = i;
}

int[] arr = new int[4];
Fill(arr);   // arr => 0,1,2,3
```

**常见错误**
- 期望 `ReadOnlySpan<char>` 能改写字符串内容：字符串不可变，得到的是只读视图。
- 把栈上或临时 Span 存入字段/异步状态机：`Span<T>` 是 `ref struct`，不能跨 `await` 或装箱。
- 依赖旧代码里手动的 `.AsSpan()` 与新隐式转换产生二义重载解析问题。

## lambda 参数修饰符 {#lambda-parameter-modifiers}

C# 14 允许在 lambda 参数上直接使用 `ref`、`in`、`out` 修饰符，且无需再显式写出参数类型即可推断。以往要匹配含 `ref`/`out` 的委托签名，必须写出完整类型。

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

**常见错误**
- 对同时省略类型又用 `out` 的参数期望自动确定类型：编译器需能从委托目标推断，否则须写明类型。
- 忘记 `ref`/`out` lambda 无法转换为不带修饰符的 `Func<>`/`Action<>`，必须使用匹配的自定义委托。
- 在 `out` 分支未赋值即返回：与普通方法一样必须确保 `out` 参数被赋值。

## 适用版本

=== "net10"
    上述全部特性（C# 14）均可用：`extension` 块及扩展属性、属性访问器内 `field`、`x?.Y = z` 空条件赋值、`nameof(List<>)` 非绑定泛型、数组/字符串到 Span 的隐式转换、lambda 参数上的 `ref`/`in`/`out`。

=== "net8"
    仅支持传统 `this` 参数扩展方法；属性需手写私有字段；`nameof` 需提供类型实参；多数 Span 场景需显式 `.AsSpan()`；lambda 修饰符需写出完整参数类型。

## 参考资料

- 官方文档：[What's new in C# 14](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-14)
- 相关：[.NET 10 主题地图](../overview.md) · [隐式 Span 与 JIT 优化](../runtime/jit-optimizations.md)
