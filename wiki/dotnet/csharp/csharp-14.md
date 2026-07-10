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

> **要点速览**
> - C# 14 亮点：extension 成员（块）、`field` 关键字、`?.=` 空条件赋值。
> - 还有 nameof 非绑定泛型、隐式 Span 转换、lambda 参数修饰符。
> - 首选新写法（P1）：`field` 取代属性样板、extension 块取代静态扩展类。

## 概述

C# 14 随 .NET 10 一起到来，这一版的风格很统一：它不是在堆新概念，而是在把那些我们写了无数遍、却始终无法绕开的样板代码（boilerplate）一点点抹掉。你大概也有过这样的经历——为了给一个字符串加个 `WordCount` 助手方法，专门建一个静态类、写上 `this` 参数；为了给一个属性加上非空校验，先声明一个私有字段、再写 `get`/`set`；为了把一段字符串交给一个高性能方法，先 `.AsSpan()` 一下。这些事单独看都不大，但日积月累，代码里全是“为了语言本身而存在的噪音”。

本页挑出六个最常用、也最能体现这个方向的新特性来讲：extension 成员（扩展块）、`field` 关键字、空条件赋值（`?.=`）、`nameof` 非绑定泛型、隐式 Span 转换，以及 lambda 参数修饰符。每个特性我都先说它到底解决了什么实际问题，再给一段能直接抄的示例，最后指出容易踩的坑。

需要说明的是，按本库的[治理约定](../../governance/policy.md)，凡是存在新旧两种写法的地方，我都会把 C# 14 的新写法作为首选展示，旧写法只作为背景交代，不会把两者摆成“等价并列”——因为那样会误导读者继续用老办法。

## extension 成员（extension 块） {#extension-members}

先说扩展成员。过去要给某个类型“加点方法”，标准做法是在一个静态类里写静态方法，并把第一个参数标上 `this`：

```csharp
public static class StringEx
{
    public static int WordCount(this string s) => s.Split(' ').Length;
}
```

这能跑，但有几个别扭的地方：所有扩展方法散落在静态类各处，看不出它们其实都“挂”在同一个类型上；而且你只能扩展方法，想加个扩展属性或者扩展运算符，语言根本不支持。C# 14 的 `extension` 块就是冲着这些来的——它把“属于某个接收者类型的所有扩展”收拢到一个块里，还能扩展属性，甚至静态成员：

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

你会发现 `WordCount` 现在直接像属性一样读，可读性明显好了一截。如果团队里还有老代码用着 `this` 参数的写法，两者可以并存、互不影响：

```csharp
public static class StringEx
{
    public static int WordCount(this string s) => s.Split(' ').Length;
}
```

不过扩展再怎么“像成员”，本质仍是静态分发，有几点要记牢：扩展只能访问接收者公开或内部的 API，碰不到私有成员；扩展属性不能给对象偷偷加状态，它应当是个纯计算（你不能指望在扩展里缓存东西）；当某个扩展和接收者自身的实例成员同名时，实例成员永远优先被解析。

## field 关键字 {#field-keyword}

再看属性。C# 早就有自动属性 `public string Name { get; set; }`，但只要你需要在 `set` 里做点校验，就得退回“先声明私有字段 + 手写 get/set”的老路。C# 14 的 `field` 关键字让这件事重新变轻：在属性访问器里，你可以直接用 `field` 引用编译器自动生成的那个支持字段（backing field），而不用自己再声明一遍。

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

只对一侧加逻辑也行，另一侧会自动复用同一个支持字段：

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

这里有个现实的小坑：`field` 是上下文关键字（contextual keyword），只有出现在属性访问器里时才表示“支持字段”。如果你的类型里恰好已经有一个叫 `field` 的成员，就会产生歧义——这时候要么给那个成员改名，要么用 `@field` 来消歧。另外，自动实现的属性（连访问器体都没有的那种）里是碰不到 `field` 的，你得至少给一个访问器写上方法体；而且 `field` 只在属性访问器内部有效，不能拿到构造函数或普通方法里当变量用。

## 空条件赋值（?.=） {#null-conditional-assignment}

空条件运算符 `?.` 我们早就用惯了：`x?.Y` 在 `x` 为 null 时直接返回 null，而不是抛 `NullReferenceException`。C# 14 把它往前推了一步——现在它可以出现在赋值的左侧了。`x?.Y = z;` 的意思是：只有当 `x` 不为 null 时，才把 `z` 赋给 `x.Y`；如果 `x` 为 null，整条赋值被跳过，连右侧的 `z` 都不会被求值。

想想以前你是怎么写的：

```csharp
public class Options { public string? Theme { get; set; } }

static void ApplyTheme(Options? opt, string theme)
{
    opt?.Theme = theme;   // opt 为 null 时什么都不做
}
```

没有这个语法时，你得包一层 `if (opt != null) opt.Theme = theme;`。它对索引器同样有效：

```csharp
list?[0] = 42;   // list 非 null 才赋值
```

有两处容易误解。第一，因为左侧接收者为 null 时整条语句被短路，所以右侧表达式其实根本不会执行——别在右侧放一个有副作用、且你期待它一定运行的逻辑。第二，复合赋值如 `x?.Y += z;` 也遵守同样的短路规则，但要注意 `Y` 必须可读可写。最后，这个语法只能用在“可为 null 的接收者”上，接收者本身得是可为 null 的引用或可空类型。

## nameof 非绑定泛型 {#nameof-unbound-generics}

`nameof` 在日志、参数校验里几乎是标配，但过去它有个小限制：作用在泛型类型上时，你必须给出具体的类型实参，`nameof(List<int>)` 才能编译，返回的却是 `"List"`——那个 `int` 纯粹是为了“糊弄”编译器。C# 14 放开了这个限制，现在你可以直接写非绑定泛型（unbound generic），不指定任何类型实参：

```csharp
using System.Collections.Generic;

string a = nameof(List<>);         // "List"
string b = nameof(Dictionary<,>);   // "Dictionary"
Console.WriteLine($"{a}, {b}");     // List, Dictionary
```

用处主要是写泛型基础设施、做反射或诊断代码时少写点占位类型。但要清楚：返回值依然只是类型名 `"List"`，不含任何元数（arity）或反引号后缀，它不会告诉你这是个 `List\`1`。如果你是在 .NET 8 或更低语言版本（LangVersion < 14）下写，这段代码会直接编译报错。也别把它和 `typeof(List<>)` 搞混——后者返回的是开放泛型的 `Type` 对象，用途完全不同。

## 隐式 Span 转换 {#implicit-span-conversions}

这一节值得多看一眼，因为后面讲 [JIT 性能优化](../runtime/jit-optimizations.md) 时还会用到它。长期以来，写高性能代码的人都有一个习惯：用 `Span<T>` / `ReadOnlySpan<T>` 来表示一段连续内存，从而避免数组、字符串带来的额外分配。但用起来有个摩擦点——你写了一个接收 `ReadOnlySpan<char>` 的方法，调用时却总得先 `.AsSpan()` 把字符串或数组转一下。C# 14 把这道坎抹平了：在 .NET 10 / C# 14 下，`string` 会隐式转换成 `ReadOnlySpan<char>`，数组 `T[]` 会隐式转换成 `Span<T>` 或 `ReadOnlySpan<T>`。

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

数组也一样：

```csharp
static void Fill(Span<int> buffer)
{
    for (int i = 0; i < buffer.Length; i++)
        buffer[i] = i;
}

int[] arr = new int[4];
Fill(arr);   // arr => 0,1,2,3
```

好处有两层：调用处更干净，不需要到处 `.AsSpan()`；同时因为 `Span` 是 `ref struct`，它避免堆分配，配合 JIT 的边界检查消除，热路径上能拿到实打实的性能。但 `Span<T>` 的代价你也得记着：字符串是不可变的，所以转出来的 `ReadOnlySpan<char>` 只是个只读视图，改不了内容；`Span<T>` 是栈上类型，不能塞进字段、不能跨 `await`、不能装箱——这些老规矩一条没变。另外，如果你旧代码里手动写了 `.AsSpan()`，升级后和新隐式转换同时存在于重载解析时，要留意二义性问题。

## lambda 参数修饰符 {#lambda-parameter-modifiers}

最后一个小特性，但写互操作或和底层委托打交道的人会喜欢。过去，如果你想让一个 lambda 去匹配带 `ref` / `out` 参数的委托，必须老老实实写出完整参数类型；C# 14 允许你直接在 lambda 参数上标 `ref`、`in`、`out`，而且类型能让编译器推断时就不用写。

```csharp
delegate void RefAction(ref int x);

RefAction inc = (ref x) => x++;

int value = 41;
inc(ref value);
Console.WriteLine(value);   // 42
```

`out` 也是同理：

```csharp
delegate bool TryParse(string s, out int result);

TryParse parse = (string s, out result) => int.TryParse(s, out result);
if (parse("10", out int r))
    Console.WriteLine(r);   // 10
```

两个注意点：一是如果你既省略类型又用 `out`，编译器得能从目标委托推断出来，推断不了就得把类型补上；二是带 `ref`/`out` 的 lambda 无法转换成普通的 `Func<>`/`Action<>`——你必须为它准备匹配的自定义委托。最后别忘了，和普通方法一样，`out` 分支在所有返回路径上都必须赋值，否则编译不过。

## 适用版本

=== "net10"
    上述全部特性（C# 14）均可用：`extension` 块及扩展属性、属性访问器内 `field`、`x?.Y = z` 空条件赋值、`nameof(List<>)` 非绑定泛型、数组/字符串到 Span 的隐式转换、lambda 参数上的 `ref`/`in`/`out`。

=== "net8"
    仅支持传统 `this` 参数扩展方法；属性需手写私有字段；`nameof` 需提供类型实参；多数 Span 场景需显式 `.AsSpan()`；lambda 修饰符需写出完整参数类型。

## 参考资料

- 相关：[.NET 10 主题地图](../overview.md)
- 相关：[隐式 Span 与 JIT 优化](../runtime/jit-optimizations.md)
- 官方文档：[What's new in C# 14](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-14)
