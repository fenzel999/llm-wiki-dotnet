---
title: 设计与可维护性反模式
summary: 六类拖累可维护性的设计反模式：吞异常、过度可变、上帝方法、魔法数字、服务定位器、过早优化。
tags: [anti-pattern, exception-handling, immutability, design, readability, dependency-injection, performance]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/design-guidelines/member-design-guidelines
updated: 2026-07-10
---

写好能跑的代码不难，难的是写出能长期维护、别人看得懂、改得动又不怕改出事的代码。下面六个反模式，几乎都源于“图一时省事”：吞掉异常、默认可变、把逻辑全堆进一个方法、随手写死字面量、在内部偷偷取依赖、以及还没量就先优化。它们单独看似乎无伤大雅，叠在一起却会让一个项目的可维护性迅速恶化。我们把它们归到一起，方便对照着看——它们背后其实是同一件事：用短期的方便，换长期的痛苦。

## 吞掉异常 {#swallowing-exceptions}

空的 `catch {}` 会捕获异常却不作任何处理，异常信息被完全丢弃。程序看似“正常运行”，但其内部状态可能已经损坏，问题会在离真实错误点很远的地方以诡异的方式暴露，排查成本极高。此外，它还会吞掉 `OperationCanceledException` 之类的语义异常，破坏取消语义。这种写法常出于“不想让程序崩溃”的善意，却把故障藏到了更隐蔽、更致命的地方。

❌ 错误写法

```csharp
public User GetUser(int id)
{
    try
    {
        return _service.GetById(id);
    }
    catch
    {
        // 异常被静默吞掉，调用方永远不知道发生了什么
        return null;
    }
}
```

这个 `catch` 块捕获了所有异常却什么都不做，直接返回 `null`；调用方无法区分“用户不存在”和“数据库宕机”，任何底层故障都被悄悄掩盖，后续还容易因空引用引发连锁问题。

✅ 正确写法

记录异常后重新抛出，保留原始堆栈：

```csharp
public User GetUser(int id)
{
    try
    {
        return _service.GetById(id);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "加载用户 {Id} 失败", id);
        throw; // 保留原始堆栈信息后重新抛出
    }
}
```

若确实可恢复，应明确处理并保留上下文，而不是吞掉：

```csharp
public User GetUserOrDefault(int id)
{
    try
    {
        return _service.GetById(id);
    }
    catch (UserNotFoundException ex)
    {
        _logger.LogWarning(ex, "用户 {Id} 不存在，返回默认值", id);
        return User.Guest;
    }
}
```

要么记录后向上传播让调用方决策，要么针对特定可恢复异常做显式处理；无论哪种方式，异常的上下文都被保留，故障不会被无声隐藏。

如何避免

- 不要写空的 `catch` 块，至少记录日志，必要时重新抛出。
- 仅捕获你确实知道如何处理的具体异常类型，避免宽泛的 `catch (Exception)`。
- 可恢复场景返回默认值前，务必记录日志并保留异常上下文。

> 和吞异常经常一起出现的，是下一节的“过度可变”：对象被随意改来改去，出错时你根本不知道是谁、在哪儿动了它。

## 过度可变 {#excessive-mutability}

默认把所有类型都声明为可变的（可变 class 加公共 setter），会让对象在任何地方被悄悄修改，导致难以追踪的状态变化、并发下的数据竞争，以及被意外别名（aliasing）共享后产生 bug。这类问题之所以高发，是因为可变类型在传递时往往以引用共享，调用方无法预期它何时被改动。显式地把数据建模为不可变（immutable）可以消除整类问题，让代码更易推理、更安全，也更利于并发与缓存。

❌ 错误写法

```csharp
public class Money
{
    public decimal Amount { get; set; }
    public string Currency { get; set; }
}

var a = new Money { Amount = 100, Currency = "CNY" };
var b = a;
b.Amount = 200; // a.Amount 也被改成 200，调用方完全不知情
```

`Money` 的属性和可写，`b` 与 `a` 指向同一个实例，修改 `b` 会无声地改变 `a`，调用方对共享引用的修改毫无察觉，埋下状态不一致的隐患。

✅ 正确写法

优先使用 `record`（或只读属性加私有 setter），通过返回新实例来表达“变更”：

```csharp
public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (other.Currency != Currency)
            throw new InvalidOperationException("币种不一致");
        return this with { Amount = Amount + other.Amount };
    }
}

var a = new Money(100, "CNY");
var b = a.Add(new Money(50, "CNY")); // a 不变，b 是新实例
```

对于需要只读保证的类：

```csharp
public class Snapshot
{
    public decimal Amount { get; }
    public string Currency { get; }

    public Snapshot(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }
}
```

不可变类型在赋值或传递时不会互相影响，值一经创建便不会改变，因此天然线程安全、易于比较与缓存，也避免了别名带来的意外副作用。

如何避免

- 默认以 `record` 或只读属性建模数据，仅在有明确需求时才提供可写成员。
- 表达状态变化时返回新实例（如 `with` 表达式），而非就地修改。
- 在代码评审中关注“可变共享状态”，对公共 setter 的使用提出质疑。

> 可变状态难以追踪，过长的方法同样难以追踪——当一个函数里同时混入校验、计算、IO，你既看不懂也测不动，这就轮到“上帝方法”了。

## 上帝方法 {#god-methods}

“上帝方法”是指一个函数承担了过多职责：上百行、嵌套层级深、混合了校验、计算、IO、转换等多种逻辑。它违反单一职责原则（SRP），难以阅读、难以单测、难以复用，且修改一处极易引入回归。这种写法通常源于“先把功能堆进去再说”的临时取舍，但长函数的圈复杂度（cyclomatic complexity）通常很高，是 bug 的高发区，长期会严重拖累可维护性。

❌ 错误写法

```csharp
public void ProcessOrder(Order order)
{
    if (order == null) throw new ArgumentNullException(nameof(order));
    if (order.Items.Count == 0) throw new InvalidOperationException("空订单");

    decimal total = 0;
    foreach (var item in order.Items)
    {
        if (item.Quantity <= 0) continue;
        var price = item.UnitPrice * item.Quantity;
        if (item.Category == "Book") price *= 0.9m;
        total += price;
    }

    order.Total = total;
    var msg = $"订单 {order.Id} 金额 {total}";
    _email.Send(msg);
    _db.Save(order);

    if (total > 1000)
    {
        _logger.LogInformation("大额订单 {Id}", order.Id);
    }
}
```

`ProcessOrder` 把参数校验、金额计算、邮件通知与持久化全部塞进一个方法，多种职责纠缠在一起，既无法针对金额计算单独测试，也因为层层嵌套而难以阅读，任何改动都可能牵一发而动全身。

✅ 正确写法

按职责将方法拆分成更小、单一职责的函数，由主方法编排调用：

```csharp
public void ProcessOrder(Order order)
{
    Validate(order);
    order.Total = CalculateTotal(order);
    NotifyCustomer(order);
    Persist(order);
}

private static void Validate(Order order)
{
    if (order == null) throw new ArgumentNullException(nameof(order));
    if (order.Items.Count == 0) throw new InvalidOperationException("空订单");
}

private static decimal CalculateTotal(Order order)
{
    decimal total = 0;
    foreach (var item in order.Items)
    {
        if (item.Quantity <= 0) continue;
        total += ComputeItemPrice(item);
    }
    return total;
}

private static decimal ComputeItemPrice(OrderItem item)
{
    var price = item.UnitPrice * item.Quantity;
    return item.Category == "Book" ? price * 0.9m : price;
}

private void NotifyCustomer(Order order)
{
    _email.Send($"订单 {order.Id} 金额 {order.Total}");
}

private void Persist(Order order)
{
    _db.Save(order);
    if (order.Total > LargeOrderThreshold)
    {
        _logger.LogInformation("大额订单 {Id}", order.Id);
    }
}
```

拆分后每个函数只做一件事，命名即文档，金额计算等纯逻辑可以脱离 IO 单独单测，整体圈复杂度下降，修改与复用的风险也随之降低。

如何避免

- 遵循单一职责原则，把长函数按“校验 / 计算 / 通知 / 持久化”等职责拆分成小方法。
- 关注圈复杂度与方法的嵌套层级，超过合理阈值就考虑提取方法。
- 在代码评审中把“一个方法做多件事”作为重点检查项。

> 长方法里往往还藏着另一个毛病：散落各处的字面量，比如那个 `1000`、那个 `0.9m`，读的人完全不知道它们代表什么——这就是魔法数字。

## 魔法数字 {#magic-numbers}

“魔法数字 / 魔法字符串”指散落在代码中的、没有明显含义的字面量（如 `if (status == 3)`、`Thread.Sleep(5000)`）。阅读者无法理解其意图，相同含义的取值在多处重复出现时，一旦需要修改便极易遗漏，从而引发隐蔽 bug。这种写法把业务规则硬编码进逻辑，既不利于配置，也不利于测试，还让代码意图对维护者完全不透明。

❌ 错误写法

```csharp
public bool CanCheckout(Order order)
{
    if (order.Total < 100)
    {
        return false;
    }

    if (order.Items.Count > 50)
    {
        return false;
    }

    return true;
}
```

方法里的 `100` 和 `50` 没有任何语义说明，读者无法判断它们是阈值、配置还是随手写下的测试值；如果结算规则在别处也用到了同样的数值，将来要调整时很难保证全部同步修改。

✅ 正确写法

用具名常量（或枚举、配置）取代字面量，让意图一目了然：

```csharp
public const decimal MinimumCheckoutAmount = 100m;
public const int MaxOrderItemCount = 50;

public bool CanCheckout(Order order)
{
    if (order.Total < MinimumCheckoutAmount)
    {
        return false;
    }

    if (order.Items.Count > MaxOrderItemCount)
    {
        return false;
    }

    return true;
}
```

更具表达力的做法是使用枚举（enum）或读取配置：

```csharp
public enum OrderStatus
{
    Pending = 1,
    Paid = 2,
    Shipped = 3
}

if (order.Status == OrderStatus.Paid) { /* ... */ }

var threshold = _config.GetValue<decimal>("Checkout:MinAmount");
```

具名常量、枚举和配置把“含义”从“数值”中剥离出来，既自解释，又能在单点修改、全局生效，显著降低遗漏和误改的风险。

如何避免

- 用 `const`、枚举或配置项取代散落的字面量，让每个取值都有明确语义名称。
- 把可能变化的业务阈值外置到配置文件，避免硬编码。
- 在代码评审中把“裸字面量”列为需要命名或提取的信号。

> 魔法数字让依赖关系不透明，而下面这个反模式，则把依赖关系整个藏了起来。

## 服务定位器 {#service-locator}

服务定位器（Service Locator）让组件在内部通过 `ServiceLocator.Get<T>()` 主动拉取依赖，而不是由外部注入。这带来若干问题：依赖关系被隐藏，阅读代码时无法从构造函数看出它真正需要什么；难以测试，因为必须预先配置一个全局定位器；会造成隐式全局状态与生命周期混乱，并与具体的依赖注入容器耦合。这种写法看似“解耦”，实则把依赖隐藏进了运行时，比显式的构造函数注入更脆弱。依赖注入（DI）的“构造函数注入”才是正确的显式依赖方式。

❌ 错误写法

```csharp
public class OrderService
{
    public void Place(Order order)
    {
        var repo = ServiceLocator.Get<IOrderService>();
        var email = ServiceLocator.Get<IEmailService>();

        repo.Save(order);
        email.Send($"已下单 {order.Id}");
    }
}
```

`OrderService` 在方法内部偷偷拉取依赖，构造函数看不出它需要哪些服务；要测试时只能去配置全局定位器，且依赖的真实来源对调用方完全不可见，生命周期也难以控制。

✅ 正确写法

通过构造函数显式声明依赖，由外部注入：

```csharp
public class OrderService
{
    private readonly IOrderService _orderService;
    private readonly IEmailService _email;

    public OrderService(IOrderService orderService, IEmailService email)
    {
        _orderService = orderService;
        _email = email;
    }

    public void Place(Order order)
    {
        _orderService.Save(order);
        _email.Send($"已下单 {order.Id}");
    }
}
```

依赖在构造函数中显式声明，可测试性大幅提升：

```csharp
var service = new OrderService(new FakeOrderService(), new FakeEmailService());
service.Place(order);
```

构造函数注入让依赖关系一目了然，测试时可直接传入替身（fake/stub），容器也只需负责装配，组件不再与具体的定位器或容器耦合。

如何避免

- 用构造函数注入声明依赖，不要在任何方法内部调用服务定位器。
- 把“通过全局定位器取依赖”列为代码评审的禁止项。
- 仅在真正的组合根（composition root）处接触 DI 容器，业务代码保持无感知。

> 显式注入是为了让代码清晰可测；与之相对，最后一个反模式则是为了“更快”而主动把代码写得更难懂——而且是没量过的“更快”。

## 过早优化 {#premature-optimization}

“过早优化是万恶之源”。在没有任何性能度量（profiling/benchmark）的情况下，凭直觉用复杂结构、手工内联、刻意避免分配等手段去“优化”，往往既没解决真实瓶颈（真实热点通常需要数据才能定位），又大幅牺牲了代码可读性与可维护性，还可能引入新 bug。这种写法常源于对性能的不必要担忧，但其代价是代码更难理解与演进，而收益却多半是臆想出来的。

❌ 错误写法

```csharp
// 为“可能更快”而牺牲可读性，但没有任何度量证明这是瓶颈
public int CountMatches(string text, char c)
{
    var span = text.AsSpan();
    var count = 0;
    for (var i = 0; i < span.Length; i++)
    {
        if (span[i] == c) count++;
    }
    return count; // 实际 LINQ.Count 已足够，且更清晰
}
```

为了一个并未被证实的热点，用 `Span` 加手写循环替代清晰的实现，代码更长也更难读；在没有基准数据支撑时，这种“优化”几乎无法带来真实收益，反而增加了维护负担。

✅ 正确写法

先写清晰正确的版本，确认是瓶颈后再针对性优化：

```csharp
public int CountMatches(string text, char c)
{
    return text.Count(ch => ch == c);
}
```

当基准测试证明此处是热点，再针对该热点做最小化、有注释依据的优化，并保留基准：

```csharp
// 经 BenchmarkDotNet 验证此处为热点（见 MyBench.cs），用 Span 减少分配
public int CountMatches(ReadOnlySpan<char> span, char c)
{
    var count = 0;
    foreach (var ch in span)
    {
        if (ch == c) count++;
    }
    return count;
}
```

遵循“先正确、后度量、再优化”的顺序，可读性版本满足了绝大多数场景，而真正的优化被限制在已验证的热点内，并带有可复现的基准作为依据。

如何避免

- 先写清晰、正确、可测试的代码，把优化留到性能度量确认瓶颈之后。
- 用 BenchmarkDotNet 等基准工具定位真实热点，避免凭直觉优化。
- 任何偏离直观写法的优化都附带注释，说明依据与基准来源。

---

相关阅读：

- [异常处理规范](../standards/quality-engineering.md#exception-handling)
- [空处理](../standards/coding-conventions.md#null-handling)
- [依赖注入](../dotnet/fundamentals/dependency-injection.md)
- [命名规范](../standards/coding-conventions.md#naming)
- [Span 与内存优化](../dotnet/csharp/modern-csharp.md#span)
- [异步最佳实践](../standards/quality-engineering.md#async-best-practices)
- 官方文档：[.NET performance](https://learn.microsoft.com/dotnet/standard/performance/)
