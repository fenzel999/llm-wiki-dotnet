---
title: C# 现代语言特性
summary: 把 record、可空引用类型、泛型、模式匹配、Span/Memory、ValueTask 与源生成器串成一篇连贯的现代 C# 语言特性导览。
tags: [csharp, record, nullable, generics, pattern-matching, span, memory, valuetask, source-generators, 性能]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/
updated: 2026-07-10
---

## 概述

如果你是从几年前的 C# 回到今天，会发现这门语言在“写起来更顺手、跑起来更省心”这件事上走了很远。下面这七个特性，几乎覆盖了日常开发中最高频的痛点：如何用值语义建模数据、如何把 null 的隐患挡在编译期、如何既复用代码又不丢失类型安全、如何把一长串 `if/else` 写得更像声明、如何在热路径上避免无谓的分配、以及如何把运行时的反射挪到编译期完成。

它们彼此之间也不是孤立的：`record` 天生就和模式匹配配合默契，可空引用类型让泛型与异步代码更安全，`Span<T>` 与 `ValueTask<T>` 共同服务于“零分配”的目标，而源生成器又常常被用来替你写那些本该手敲的样板。所以与其逐个背诵，不如把它们放在一篇里顺着读下来——你会发现，它们其实是在回答同一个问题：怎样用更少的代码，写出既正确又快的程序。

先从一个最朴素的需求说起：能不能有一种类型，比较相等时看的是“内容”而不是“是不是同一个对象”？

## 记录 record {#records}

传统上，`class` 的相等性默认是引用相等——两个内容完全一样的对象，在 `==` 面前却不相等。要“按值比较”，你得自己重写 `Equals`、`GetHashCode`，甚至 `ToString`，又啰嗦又容易出错。`record` 的出现就是为了解决这件事：编译器会基于它的全部成员自动生成这些成员，于是“内容相同”的实例就被判定为相等。

更妙的是，记录支持“非破坏性变更”。通过 `with` 表达式，你可以基于一个已有实例，只改其中一两个字段，得到一份新副本，而原本的实例纹丝不动。这种“改一处、其余不变”的语义，特别适合建模 DTO、配置项、不可变数据——你不必再写一堆构造函数或拷贝方法。

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

上面的位置记录（positional record）用构造函数参数直接声明成员，连 `Deconstruct` 都帮你自动生成，解构赋值写起来非常自然。而当你需要在栈上承载那种“希望有值相等语义的小型数据”时，`record struct` 提供了值类型版本——它避免了堆分配，同时保留值相等。

不过有一点要心里有数：值相等是把双刃剑。凡是依赖“是不是同一个对象”来区分实例的地方，用 `record` 就会出错。

❌ 在需要用引用区分实例时仍使用 record，集合去重或字典键的行为会出乎意料：

```csharp
var dict = new Dictionary<Person, int>();
dict[new Person("A", 1)] = 1;
dict[new Person("A", 1)] = 2; // 覆盖同一键（值相等）；若本意按引用区分则出错
```

另外两个常见误会：一是以为 `record` 一定不可变——`record class` 的属性默认是 `init` 访问器，但你完全可以显式声明 `set`；二是继承 `record` 时，基类型与派生类型即便字段相同，比较结果也可能是 `False`，设计层次结构时要留意。

说完“怎么描述数据”，下一个绕不开的问题是：怎么避免 null 带来的崩溃。

## 可空引用类型 {#nullable}

`NullReferenceException` 大概是所有 .NET 开发者最熟悉的异常之一。可空引用类型（Nullable Reference Types, NRT）并不改变运行时行为，它是一套编译期的静态流分析：一旦你开启 `<Nullable>enable</Nullable>`，`string` 就被理解为“不可为 null”，而 `string?` 表示“可能为 null”。编译器会顺着赋值和分支，追踪每个变量当前到底“是不是可能为空”，在你打算解引用一个它判定为可能空的值时给出警告。

这意味着，大多数 null 隐患在敲代码的那一刻就被点出来了，而不必等到生产环境才炸。

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

在上面的例子里，进入 `if` 分支后编译器就“知道”`user` 不是 null，所以随后访问 `user.Name` 是安全的。只有在它确实分析不出来、而你又确信非空时，才动用 null 容忍运算符 `!` 显式声明。项目层面开启它只需一行：

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

这里最容易踩的坑，是把 `!` 当成“消除警告的万能橡皮擦”。

❌ 滥用 `!` 压制所有警告，表面上编译通过，运行时却仍是空引用解引用：

```csharp
string? name = null;
int len = name!.Length; // 编译期无警告，运行期 NullReferenceException
```

记住：`string?` 只是编译期注解，运行时的行为和过去完全一致，它不会在运行时阻止你赋 null。库作者如果不标注可空性，调用方就会收到一堆有误导性的警告，反而削弱了 NRT 的价值；`null!` 初始化也只应留给序列化、快照构造这类编译器真的分析不了、而你在语义上确定合法的场景。

数据的形状定好了、null 也防住了，接下来就是怎么写出既能复用、又不丢类型安全的代码。

## 泛型 {#generics}

“同样的算法，套在不同的类型上”——泛型（generics）让这件事在编译期就完成，既复用了代码，又避免了早年用 `object` 带来的装箱拆箱和类型转换异常，因此同时拿到类型安全和运行性能。你可以把泛型理解成“类型也是参数”：`List<T>` 里的 `T` 在编译时就被具体化为真实的类型。

约束（constraints）用 `where` 子句表达“类型参数必须具备哪些能力”，例如 `where T : IComparable<T>` 表示 `T` 必须可比较，`where T : class, new()` 表示 `T` 是引用类型且有无参构造函数。再往深一点，协变（`out`）与逆变（`in`）让接口和委托在“更宽或更窄”的具体类型之间保持赋值兼容，这正是 LINQ 与函数式风格代码能顺畅工作的底层基础。

```csharp
public T Max<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) >= 0 ? a : b;

public class Store<T> where T : class, new()
{
    private readonly List<T> _items = new();
    public void Add(T item) => _items.Add(item);
}

// 协变：IEnumerable<out T>
IEnumerable<string> strings = new List<string>();
IEnumerable<object> objects = strings;
```

协变那一行很能说明问题：因为 `IEnumerable<out T>` 只“生产”元素（你只会从中读出 `T`），所以“能读出 string 的序列”自然也能被当作“能读出 object 的序列”来用。相反，凡是“消费”元素的接口（比如比较器）就更适合用逆变 `in`。

❌ 退回用 `object` 来“泛型化”，会重新引入装箱并丢失编译期检查：

```csharp
object boxed = 123;
int x = (int)boxed; // 装箱/拆箱；若实际类型不符会抛 InvalidCastException
```

约束写得太严会限制复用，太松又没法调用成员，需要权衡抽象的层级。在值类型泛型上频繁装箱时，应考虑针对值类型特化，或借助 [Span 与 Memory](#span) 这类零拷贝手段。另外别忘了 `out`（生产者、协变）和 `in`（消费者、逆变）的方向反了会直接导致编译错误。

有了泛型打底，我们就能把“按数据的形状做分支”这件事写得更优雅，这就轮到模式匹配出场了。

## 模式匹配 {#pattern-matching}

早年的 C# 里，判断一个对象“是什么、里面有什么”，往往是一连串 `if (obj is Foo f) { ... } else if (obj is Bar b) { ... }`。模式匹配（pattern matching）把这类分支收敛进 `is` 表达式和 `switch` 表达式里，让你对类型、属性、位置、关系做声明式匹配，可读性一下子就上去了。它从 C# 7 的类型模式起步，后来陆续加入了属性模式、位置模式、关系模式和逻辑模式，常常和 [`record`](#records) 搭配使用。

```csharp
public record Point(int X, int Y);

string Classify(object obj) => obj switch
{
    null => "null",
    Point { X: 0, Y: 0 } => "origin",
    Point (> 0, > 0) => "positive",     // 位置 + 关系模式
    Point p when p.X == p.Y => "diagonal",
    string s and not "" => $"str:{s}",  // 逻辑模式
    _ => "other"
};

if (obj is Point { X: var x, Y: var y })
    Console.WriteLine($"{x},{y}");
```

这段 `Classify` 很能体现模式匹配的简洁：用 `null` 模式兜底，用属性模式匹配原点，用“位置 + 关系模式”判断正象限，再用逻辑模式 `and not ""` 处理非空字符串。`is` 配合 `var` 还能顺手把解构出来的值赋给局部变量，一气呵成。

但 `switch` 表达式有个硬要求：它必须“穷尽”——也就是说，所有可能输入都得有去处。

❌ 漏掉 `_` 兜底分支，编译器无法证明输入已被全部覆盖，会直接报“未穷尽”错误：

```csharp
string Kind(object o) => o switch
{
    int n => "num",
    // 缺少 _ 兜底 → 编译错误：switch 表达式未穷尽
};
```

还有两个小坑：不要误以为 `is { }` 里的 `{ }` 表示“任意对象”，它实际表示“非 null”；也别在模式里过度堆叠 `when` 子句，那样反而不如普通 `if` 好读，把模式匹配的清晰优势丢掉了。

从“怎么描述与分支数据”，我们转向“怎么让代码跑得更快”——先从不分配内存的切片说起。

## Span 与 Memory {#span}

很多性能瓶颈，其实都来自“为了处理一段数据而先复制一份”。`Span<T>` 与 `ReadOnlySpan<T>` 是对连续内存（数组、栈内存、非托管内存）的类型安全零拷贝视图：你拿到的是一段引用，而不是副本。不过因为它本质上是栈上的一段引用，所以 `Span<T>` 只能活在栈上——不能出现在 `async` 方法里，也不能作为类的字段。当内存需要跨过异步边界、或要被长期持有，就该用堆友好的等价物 `Memory<T>`。

```csharp
// 栈上零拷贝切片
Span<byte> buffer = stackalloc byte[256];
var slice = buffer.Slice(0, 100);
Parse(slice);

// 异步场景使用 Memory<T>
async Task ProcessAsync(Memory<byte> mem)
{
    await File.WriteAsync(mem);
}

// 获取 List<T> 底层数组缓冲（避免拷贝）
var list = new List<int> { 1, 2, 3 };
Span<int> raw = CollectionsMarshal.AsSpan(list);
```

`stackalloc` 在栈上分配临时缓冲、`Slice` 取出子区间、再用 `CollectionsMarshal.AsSpan` 直接拿到 `List<T>` 底层数组——整套下来全程没有复制，特别适合解析、编码这类热路径。而 `Memory<T>` 则安全地穿过 `await`，把零拷贝的好处延伸到异步场景。

它最危险的地方，也正因为“活在栈上”。

❌ 把 `stackalloc` 得到的缓冲返回给调用方，栈帧回收后该引用即悬垂，访问它是未定义行为：

```csharp
Span<byte> Bad()
{
    Span<byte> buf = stackalloc byte[64];
    return buf; // 悬垂引用：栈内存已回收
}
```

总之，`async` 方法体或类字段里都不能用 `Span<T>`，会直接编译失败；跨 `await` 的缓冲必须用 `Memory<T>`（或 `ReadOnlyMemory<T>`），不要试图用 `Span<T>` 硬扛异步。

和“栈上零拷贝”一脉相承的，是异步世界里对“少分配一个对象”的追求。

## ValueTask {#value-task}

在基于 [`async/await`](async-await.md) 的代码里，每次返回一个 `Task` 都意味着一次堆分配。绝大多数时候这无所谓，但在高频调用的热路径上，分配压力会被放大得非常明显。`ValueTask<T>`（以及非泛型的 `ValueTask`）就是为此而生的结构体类型：当方法的结果常常已经“同步可用”时，它可以避免为每次调用都分配一个 `Task`。比如缓存命中这种“快速路径”，直接返回包着值的 `ValueTask<T>` 即可，零分配。

```csharp
public ValueTask<int> ReadAsync()
{
    if (_cache.TryGetValue(out var v))
        return new ValueTask<int>(v);            // 同步命中，零分配
    return new ValueTask<int>(SlowReadAsync());  // 异步路径
}

// 仅 await 一次
int result = await ReadAsync();
```

代价是 `ValueTask<T>` 的使用比 `Task` 更受约束：它不能被无条件地多次 `await`，也不该被随意存起来反复用。调用方最省心的做法就是“只 await 一次，拿到结果就走”。

❌ 对同一个 `ValueTask<T>` 连续 `await` 两次，第二次的结果未定义，可能返回错误或抛出异常：

```csharp
ValueTask<int> t = ReadAsync();
int a = await t;
int b = await t; // 第二次结果未定义或抛异常
```

另外，不要在公共 API 里盲目铺开 `ValueTask`——它会增加调用方的心智负担，只在确有分配热点的地方使用。也别误以为它“永远更快”：在同步冷路径上，它反而可能带来额外开销。需要把 [Span 与 Memory](#span) 的零拷贝和这里的零分配结合起来看，二者都是“热路径优化”的工具箱成员。

最后一个话题，把视角从“怎么写代码”拉到“怎么让编译器替你写代码”。

## 源生成器 {#source-generators}

有些代码，你明明可以写得出来，却一遍遍重复：序列化的样板、依赖注入的注册、各种强类型的配置绑定……源生成器（Source Generators）是 Roslyn 的编译器扩展，它在编译期读取并分析你的代码，再生成新的 C# 源文件一并参与编译。相比运行时的反射，它没有运行时开销，且天然兼容 AOT（Ahead-Of-Time）编译，能显著改善启动性能与程序体积。

现代做法推荐实现 `IIncrementalGenerator`：它通过缓存输入实现增量执行，只在相关源真正变更时才重新生成，把对编译速度的影响降到最低。

```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Text;
using System.Text;

[Generator]
public class HelloGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext ctx)
    {
        ctx.RegisterSourceOutput(ctx.CompilationProvider, (spc, compilation) =>
        {
            var src = "namespace Gen { public static class Hi { public const string M = \"hi\"; } }";
            spc.AddSource("Hi.g.cs", SourceText.From(src, Encoding.UTF8));
        });
    }
}
```

示例在编译期注入了一个常量类，整个过程不会在每次保存时都全量重跑。它与 [依赖注入](../fundamentals/dependency-injection.md) 也常常是搭档——很多 DI 框架正是靠源生成器在编译期把注册代码准备好，既快又能在 AOT 下工作。

❌ 仍使用旧的 `ISourceGenerator` 接口，每次重编译都会全量执行 `Execute`，在大型项目里明显拖慢构建：

```csharp
[Generator]
public class Old : ISourceGenerator
{
    public void Initialize(GeneratorInitializationContext c) { }
    public void Execute(GeneratorExecutionContext c) { /* 每次重编译都全量执行，缓慢 */ }
}
```

另外，在生成器内部做耗时或 IO 操作会拖慢整个解决方案的编译；也别以为源生成器能替代反射的全部场景——涉及复杂动态行为时，运行时反射依然不可替代。关于不同 .NET 版本下接口的差异：

=== "net5 / net6 之前"
    早期仅提供 `ISourceGenerator` 接口（.NET 5 引入），每次重编译都重新执行，性能与缓存能力较弱，现已不推荐用于新项目。
=== "net6+"
    提供 `IIncrementalGenerator`（.NET 6 起），支持基于缓存的增量执行，是当前推荐写法，也是绝大多数新生成器的首选。

---

把上面七块串起来看，它们其实是现代 C# 的一条主线：用 [`record`](#records) 和[可空引用类型](#nullable)把数据描述得既准确又安全，用[泛型](#generics)和[模式匹配](#pattern-matching)把逻辑写得既通用又清晰，再用[Span 与 Memory](#span)、[ValueTask](#value-task)和[源生成器](#source-generators)把性能与样板消灭在编译期。理解了这条线，再去读[异步编程](async-await.md)与[依赖注入](../fundamentals/dependency-injection.md)那两篇，会顺理成章得多。

## 参考资料

- 官方文档：[C# 语言指南](https://learn.microsoft.com/dotnet/csharp/)
- [异步编程](async-await.md)
- [依赖注入](../fundamentals/dependency-injection.md)
