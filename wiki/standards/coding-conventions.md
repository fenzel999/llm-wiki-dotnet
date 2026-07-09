---
title: 命名与 API 约定
summary: 命名、API 设计、空处理三条规范合并成一篇，讲清为什么这样写代码更健壮、更易演进。
tags: [standard, coding-style, naming, api-design, null]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/design-guidelines/
updated: 2026-07-10
---

写代码时，最容易被轻视、却影响最长远的往往是那些"看起来很小"的约定：一个标识符叫什么名字、一个公共方法的入口要不要校验、一个查不到的结果返回 `null` 还是抛异常。单个文件里这些选择或许无伤大雅，但当几十个类型、上百个接口共同构成一个系统时，它们会累积成巨大的认知负担 —— 阅读者要不断在"这个 `o` 到底是什么"、"这个 `Get` 到底会不会返回 `null`"之间切换注意力，而不是把精力放在真正的业务逻辑上。

这一篇把三件底层约定放在一起讲：**命名**、**API 设计**、**空处理**。它们其实是一条主线上的三道工序：先用一致的命名让代码"望文生义"，再用克制的 API 边界把无效状态挡在门外，最后用系统化的空处理把 `NullReferenceException` 消灭在编译期和入口处。下面分别展开，但请记得它们最终服务于同一个目标：让调用方无需猜测就能安全使用你的代码。

## 命名 {#naming}

命名规范统一了代码中的大小写与标识符风格，目标是降低认知负担，让代码在 IDE 中可预测、可搜索。一致的命名让阅读者能凭名称立刻判断一个标识符是类型、接口、字段还是局部变量，从而减少理解成本。当团队都遵循同一套约定（如接口 `I` 前缀、私有字段下划线前缀）时，重构与代码评审都会更顺畅，可维护性随之提高。

类型（class/struct/interface/enum）、方法、属性、事件以及公共字段使用 PascalCase（首字母大写）；局部变量与方法参数使用 camelCase（首字母小写）。私有实例字段使用 `_camelCase`（下划线前缀加 camelCase），这样在阅读与重构时能立刻区分字段与局部变量。接口以 `I` 前缀开头后接 PascalCase 名词（如 `IOrderService`），常量（`const`）与编译期 `static readonly` 使用全大写下划线（如 `MAX_RETRY_COUNT`）。避免在命名空间里用匈牙利前缀（如 `strName`、`iCount`）和无意义的缩写，优先写全 `Manager`、`Calculate`；命名空间本身使用 `PascalCase`，通常采用 `Company.Product.Feature` 形式。

下面的示例展示了接口、类、私有字段与常量各自的命名约定，以及 `ProcessAsync` 中局部变量采用的 camelCase：

```csharp
namespace Contoso.Ordering;

public interface IOrderService
{
    Task<Order?> GetByIdAsync(OrderId id, CancellationToken cancellationToken);
}

public class OrderProcessor
{
    private readonly IOrderService _orderService;
    private const int MaxRetryCount = 3;

    public OrderProcessor(IOrderService orderService)
    {
        _orderService = orderService;
    }

    public async Task ProcessAsync(Order order, CancellationToken cancellationToken)
    {
        var retryCount = 0;
        // ...
    }
}
```

编译期常量推荐用全大写下划线写法，与运行期只读字段在视觉上区分开：

```csharp
// 常量的全大写下划线写法
public static class Limits
{
    public const int MAX_BATCH_SIZE = 1000;
    public const string DEFAULT_CULTURE = "zh-CN";
}
```

⚠️ 注意，`MaxRetryCount` 与 `MAX_BATCH_SIZE` 只是不同团队的风格取舍（前者 PascalCase、后者全大写），关键是**在仓库内保持一致**，而不是某一种"绝对正确"的写法。下文谈到的"健壮与可演进"比命名细节更重要。

❌ 下面这个类混用了匈牙利前缀、缩写与混乱的字段命名，可读性很差且难以在 IDE 中定位：

```csharp
// 错误：匈牙利前缀、缩写、字段命名混乱
public class clsOrder
{
    private IOrderService objService; // 应使用 _orderService
    private int iCount;               // 应使用 _count 或局部 camelCase

    public void Calc(Order o)         // Calc/O 难读
    {
        string strName = o.Name;
    }
}
```

其他常见错误：

- 用单字母或含糊缩写（如 `Mgr`、`Calc`、`o`）作为公共成员名，丢失语义。
- 私有字段不加下划线前缀，与局部变量混淆，评审时难以分辨生命周期。
- 同一概念在不同类型里用不同命名（如 `orderId` 与 `orderID` 混用），破坏一致性。

命名解决的是"看起来像什么"，而接下来要谈的 API 设计解决的是"用起来安不安全"。

## API 设计 {#api-design}

API 设计规范定义了对公共接口的一组基本约束，目标是让库与应用服务在边界处稳健、可预测且易于演进。遵守这些规则能让错误在入口快速暴露、降低耦合面，并使调用方无需为每种方法编写差异化的处理逻辑。当接口既能防御无效输入、又对输出做出明确承诺时，整个系统的可维护性与稳定性都会随之提升。

公共 API 的第一道防线是参数校验守卫：在方法入口立即校验入参，遇到非法值抛出具体异常，避免无效状态流入内部逻辑。可见性应贯彻最小原则，类型默认设为 `private` 或 `internal`，只暴露真正需要对外契约的部分，防止内部实现细节外泄。方法的输入与输出类型应尽量不可变（如 `record`、只读结构或 `IReadOnlyList`），以此杜绝调用方悄然修改内部状态。同类操作要保持一致的返回语义，要么统一返回值、要么统一定义失败路径，不要时而返回结果时而返回 `null`。版本演进时优先用新增方法或重载来扩展能力，保持已有签名向后兼容，避免在升级时破坏既有调用方。

下面的示例以应用服务（被最小 API 端点调用）为例；Web 层统一走最小 API，不使用 Controller。数据访问直接注入 `DbContext`，不引入仓储/工作单元。可以看到 `GetAsync` 在入口用 `ArgumentNullException.ThrowIfNull` 守卫，未找到时抛出具体异常，并返回一个不可变的 `OrderView`，整个输入输出都不暴露可变状态。

```csharp
public sealed class OrderService
{
    private readonly AppDbContext _db;

    public OrderService(AppDbContext db) => _db = db;

    public async Task<OrderView> GetAsync(OrderId id, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(id);

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new OrderNotFoundException(id);

        return order.ToView(); // 返回不可变视图
    }
}

public readonly record struct OrderId(Guid Value);

public sealed record OrderView(Guid Id, IReadOnlyList<OrderLine> Lines);
```

❌ 以下写法展示了三类典型错误：缺少守卫让 `null` 流入内部、对外暴露可变集合、以及返回类型前后不一致。

```csharp
// 错误1：缺少守卫，null 流入内部
public Order Get(OrderId id) => _db.Orders.Find(id); // id 为 null 时内部才崩

// 错误2：暴露可变内部集合
public List<OrderLine> Lines => _lines; // 调用方可改内部状态

// 错误3：返回类型不一致
public Order? GetA(int id);     // 有时返回 null
public Order GetB(int id);      // 有时抛异常
```

其他常见错误：

- 把内部类型（`internal` 实现类）直接公开为 `public` 返回类型，导致后续无法自由重构。
- 在公共方法上省略参数校验，把 `null` 检查推给调用方，最终在更深层级才崩溃。
- 为扩展能力而直接修改既有方法签名，破坏已有调用方的编译与运行。

守卫参数、守卫返回，这些动作本质上都是在回答一个问题："如果查不到怎么办？"而这正好把我们引向空处理。

## 空处理 {#null-handling}

空处理规范的目标是系统性地消灭 `NullReferenceException`，办法是把 null 检查前移到编译期、并在边界处做出明确的非空承诺。当可空引用类型（NRT）被启用、公共入口都被守卫、且集合永远不为 null 时，调用方无需处处判空即可安全使用返回值。这套约定让 API 更易用也更健壮，也把"未找到"与"空结果"在语义上清晰区分开来。

首先应在项目中启用 Nullable Reference Types（NRT），让编译器在编译期警告可能的 `null` 解引用。公共 API 入口用 `ArgumentNullException.ThrowIfNull(arg)` 守卫参数，一旦为空立即失败，避免无效 `null` 在系统内部传播。不要把 `null` 当作"未找到/空"的合法返回值——未找到应抛具体异常，或在最小 API 中返回 `Results.NotFound()`。返回集合时一律返回空集合（如 `Array.Empty<T>()` 或 `ImmutableArray<T>.Empty`）而非 `null`。属性或字段若非必要不要声明为可空（`string?`），要明确区分"有值"与"无值"两种状态。

下面的 `GetUser` 在入口守卫空参数，未命中时抛具体异常并返回非 null 保证；`GetOrders` 则在无结果时返回 `Array.Empty<Order>()`，调用方无需判空即可遍历：

```csharp
#nullable enable

public User GetUser(UserId id)
{
    ArgumentNullException.ThrowIfNull(id);

    if (!_store.TryGetValue(id, out var user))
        throw new UserNotFoundException(id);

    return user; // 返回非 null 保证
}

public IReadOnlyList<Order> GetOrders(UserId id)
    => _store.TryGetOrders(id, out var orders)
        ? orders
        : Array.Empty<Order>(); // 空集合而非 null
```

可以看到，这与上一节的 API 设计原则一脉相承：入口守卫、不可变输出、返回类型前后一致。区别只在于这里把"空"这件事讲得更透——`null` 不该被当成一种普通的业务结果。

❌ 以下三类错误分别展示了用 `null` 表示未找到、返回 null 集合、以及不守卫就直接解引用：

```csharp
// 错误1：返回 null 表示未找到，调用方易 NRE
public User? GetUser(UserId id)
    => _store.TryGetValue(id, out var u) ? u : null;

// 错误2：返回 null 集合
public List<Order> GetOrders() => _empty ? null : _orders;

// 错误3：不守卫直接解引用
public void Print(UserId id) => Console.WriteLine(id.Value); // id 可能为 null
```

其他常见错误：

- 把 `null` 与"空"混为一谈，导致调用方在 `foreach` 上抛出 `NullReferenceException`。
- 在 NRT 启用后仍大量使用 `!` 强制解引用，掩盖而非消除真实的空风险。
- 对外暴露 `string?` 但文档未说明何时为 null，调用方被迫猜测。

命名、API 设计、空处理这三件事合起来，决定了你的代码"看起来对、用起来稳"。但真正到了运行时，错误还是会发生——下一类工程实践（[健壮性与工程质量](quality-engineering.md)）会继续讨论异常、日志、配置、测试与异步，把"出错之后"也料理妥当。

## 参考资料

- 相关：[健壮性与工程质量](quality-engineering.md)
- 官方文档：[Framework Design Guidelines](https://learn.microsoft.com/dotnet/standard/design-guidelines/)
- 官方文档：[C# coding style conventions](https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style)
- 官方文档：[Nullable reference types](https://learn.microsoft.com/dotnet/csharp/nullable-references)
