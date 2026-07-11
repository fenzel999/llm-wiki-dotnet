---
title: 健壮性与工程质量
summary: 异常处理、日志、配置、单元测试、异步最佳实践五条规范合并成一篇，讲清为什么这样写系统更稳、更好维护。
tags: [standard, exception, logging, configuration, testing, async]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/
updated: 2026-07-10
---

命名与 API 约定解决的是"代码看起来对、用起来稳"，但系统真正跑起来之后，事情并不会总是按计划进行：依赖的下游服务可能超时，配置可能缺失，一个本应成功的保存可能意外失败。这一篇关心的是"出错之后"——当意外发生时，你的系统能不能把信息说清楚、能不能被诊断、能不能被验证、会不会卡死。

我们把五件工程实践放在一起讲：**异常处理**决定错误如何被表达、**日志**决定错误如何被记录、**配置**决定系统如何被注入可靠的参数、**单元测试**决定行为如何被验证、**异步最佳实践**决定并发路径如何不阻塞、不泄漏异常。它们同样是同一条主线上的工序：先决定"错了怎么抛"，再决定"错了怎么记"，然后让"对的行为"可被配置与测试固定下来，最后保证整条调用链在异步场景下依然可靠。

> **要点速览**
> - 异常、日志、配置、单元测试、异步最佳实践的规范合集。
> - 异常只在能处理处捕获、别吞；日志用结构化。
> - 配置用 Options；测试隔离依赖；异步一路 await。

## 异常处理 {#exception-handling}

异常处理的核心原则是让异常只表达真正异常的程序状态，并把诊断所需的信息完整保留下来。把异常留给不可恢复或违反前置条件的情况，而不是用于常规控制流，可以让正常路径更快、更清晰。当抛出的是具体类型、且携带了上下文与底层原因时，调用方才能精确捕获并处理，线上排错也才有迹可循。

抛异常前先确认它确实表示异常情形；优先抛出具体类型（如 `ArgumentNullException`、`InvalidOperationException`），而非笼统的 `Exception`。在入口用 `ArgumentNullException.ThrowIfNull` 这类守卫快速失败，并通过 `Exception.Data` 或 `InnerException` 保留排查所需的上下文。若因特殊原因必须吞掉异常，至少要记录日志并说明原因，绝不能静默忽略。避免在高频热路径中抛异常，因为栈展开与字符串分配的成本远高于普通分支判断。

下面的 `GetUser` 在入口守卫空参数，未命中时抛出携带 `RequestedId` 的具体异常；随后在调用外部客户端失败时，用 `InnerException` 保留底层 `HttpRequestException`，让上层异常既语义清晰又保留根因。

```csharp
public User GetUser(UserId id)
{
    ArgumentNullException.ThrowIfNull(id);

    if (!_store.TryGetValue(id, out var user))
    {
        throw new UserNotFoundException(id)
            .AddData("RequestedId", id.ToString());
    }

    return user;
}

// 用 InnerException 保留底层原因
try
{
    await _client.SendAsync(request, ct);
}
catch (HttpRequestException ex)
{
    throw new OrderSubmissionException("提交订单失败", ex)
        .AddData("OrderId", orderId);
}
```

`AddData` 是一个简单扩展方法，用于在抛出前把诊断键值附加到异常上：

```csharp
public static class ExceptionExtensions
{
    extension<T>(T ex) where T : Exception
    {
        public static T AddData(string key, string value)
        {
            ex.Data[key] = value;
            return ex;
        }
    }
}
```

❌ 以下三类错误分别展示了吞异常丢上下文、用异常做常规分支、以及抛出无上下文的笼统异常：

```csharp
// 错误1：吞异常，丢失上下文
try { DoWork(); } catch { }

// 错误2：用异常做常规控制流
try { var x = int.Parse(input); }
catch (FormatException) { x = 0; } // 应使用 int.TryParse

// 错误3：抛笼统 Exception，且无上下文
throw new Exception("出错了");
```

其他常见错误：

- 在每个层级都重新 `throw ex`（而非 `throw`），重置了调用栈，使原始抛出位置丢失。
- 用异常来实现正常的循环退出或业务分支，导致热路径性能急剧下降。
- 捕获过宽（如 `catch (Exception)`）后不做区分地处理，掩盖了本应上抛的严重错误。

异常把"哪里错了、为什么"封装好了，但真正要排线上问题，还得靠日志把它落到可检索的地方。

## 日志 {#logging}

日志规范规定使用 `Microsoft.Extensions.Logging.ILogger` 以结构化模板消息的方式记录日志，并合理选择级别、规避敏感数据。结构化日志让后端（如开源自托管的 Grafana Loki、ELK/OpenSearch、Seq）能够按属性过滤、聚合与告警，而不是只能做纯文本检索。当日志带上正确的级别、使用命名占位符并避免敏感信息外泄时，排错效率与系统安全性都会显著提升。

消息模板应使用命名占位符（如 `{CorrelationId}`），而非字符串拼接，这样既能避免拼接分配、也能防止日志注入。级别选择要符合语义：`Trace`/`Debug` 用于开发细节，`Information` 表示正常业务事件，`Warning` 用于可恢复的异常，`Error` 表示失败，`Critical` 则用于致命问题。严禁记录密码、令牌、身份证号等敏感数据，对必要的标识符要脱敏。用 `BeginScope` 建立请求或事务作用域（如 `CorrelationId`），让同一请求的日志自动聚合；记录异常时应把异常对象传给 `logger.LogError(ex, ...)`，交给提供程序处理结构化信息，而非手动 `ex.ToString()`。

下面的 `CreateAsync` 用 `BeginScope` 把 `CorrelationId` 绑定到整个请求作用域，正常与失败路径都使用命名占位符记录结构化消息，失败时把异常对象一并传入：

```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public async Task<Order> CreateAsync(CreateOrderCommand cmd, CancellationToken ct)
    {
        using (_logger.BeginScope(new Dictionary<string, object>
                   { ["CorrelationId"] = cmd.CorrelationId }))
        {
            _logger.LogInformation("创建订单开始: {OrderId}, {CustomerId}", cmd.OrderId, cmd.CustomerId);

            try
            {
                var order = await _repo.SaveAsync(cmd, ct);
                _logger.LogInformation("创建订单完成: {OrderId}", order.Id);
                return order;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "创建订单失败: {OrderId}", cmd.OrderId);
                throw;
            }
        }
    }
}
```

注意这里 `catch` 里 `LogError(ex, ...)` 之后是 `throw;`——异常被原样上抛，日志只是旁路记录，没有吞掉上下文，正好呼应上一节的异常处理原则。

❌ 以下三类错误分别展示了字符串拼接、记录敏感数据、以及把异常当字符串丢失结构化信息：

```csharp
// 错误1：字符串拼接，无法结构化检索
_logger.LogInformation("创建订单 " + cmd.OrderId + " 用户 " + cmd.CustomerId);

// 错误2：记录敏感数据
_logger.LogInformation("用户登录: {User} {Password}", user, password);

// 错误3：异常作为字符串，丢失结构化信息
_logger.LogError("失败: " + ex.ToString());
```

其他常见错误：

- 生产环境把级别开到 `Trace`/`Debug`，产生海量噪声并可能泄露内部细节。
- 在循环内部频繁打日志却不加采样，拖慢热路径并撑爆日志存储。
- 用 `Console.WriteLine` 绕过 `ILogger`，使日志脱离统一的级别与作用域体系。

日志要记录的是"运行时的状态"，而这些状态里有很大一部分来自系统启动时被注入的配置参数。

## 配置 {#configuration}

配置规范主张用 Options 模式把散落在各处的字符串配置键集中到强类型对象上，从而换取编译期类型安全、默认值与启动期校验。当配置以绑定类型而非原始字符串的形式注入到服务中时，拼写错误与类型错误能在构建或启动阶段被发现，而不是在运行时请求中才暴露。这种做法既减少了重复解析，也让配置来源与业务代码解耦，便于测试与演进。

推荐用强类型选项类承载配置，并通过 `GetRequiredSection` 获取必填节，让缺失配置尽早失败（fail-fast）。在 `Configure<TOptions>` 时结合 `ValidateDataAnnotations` 或 `Validate` 做绑定校验，并用 `ValidateOnStart` 把校验前移到应用启动时刻。绑定类型的属性命名应与配置节一致，必要时用 `[ConfigurationKeyName]` 做映射；使用 `record` 或不可变类能让配置在注入后不被意外修改。

下方示例中，`DatabaseOptions` 集中声明了节名与默认值，注册时完成绑定与校验，业务类通过 `IOptions<DatabaseOptions>` 直接拿到强类型对象，不再触碰任何字符串键。

```csharp
public class DatabaseOptions
{
    public const string SectionName = "Database";

    public string ConnectionString { get; set; } = string.Empty;
    public int MaxPoolSize { get; set; } = 100;
    public TimeSpan CommandTimeout { get; set; } = TimeSpan.FromSeconds(30);
}

// 注册（Program.cs）
builder.Services
    .AddOptions<DatabaseOptions>()
    .BindConfiguration(DatabaseOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// 使用
public class OrderSettings
{
    private readonly DatabaseOptions _options;
    public OrderSettings(IOptions<DatabaseOptions> options) => _options = options.Value;
}
```

对应的 `appsettings.json` 节如下：

```json
{
  "Database": {
    "ConnectionString": "Server=.;Database=Orders",
    "MaxPoolSize": 200,
    "CommandTimeout": "00:00:45"
  }
}
```

❌ 下面这种做法直接读取字符串键并在业务代码里手动解析，既没有类型校验，也要等到运行时才可能发现配置缺失：

```csharp
// 错误：散落的字符串键，无类型校验
var cs = _config["Database:ConnectionString"];
var pool = int.Parse(_config["Database:MaxPoolSize"]!);
if (string.IsNullOrEmpty(cs)) { /* 运行时才发现问题 */ }
```

其他常见错误：

- 把配置键字符串（如 `"ConnectionStrings:Default"`）硬编码在多个业务文件中，重构时极易遗漏。
- 使用 `IOptions` 却未配置任何校验，让非法配置一路传递到运行时。
- 用可变的普通类承载配置，导致注入后配置被业务代码悄悄改写。

配置把"系统依赖什么参数"固定下來，而真正检验这些参数与行为是否正确的，是测试。

## 单元测试 {#unit-testing}

单元测试规范定义了一套让测试可读、独立且聚焦的写法，目标是让失败信息能直接指向问题所在。当测试方法以 `Method_Scenario_Expected` 命名、测试体遵循 AAA 结构、且彼此之间不共享可变状态时，测试既易于维护，也能安全地并行与重跑。把测试范围限定在自己的逻辑上、而不是去验证框架或运行时本身，可以避免脆弱测试并节省时间。

测试方法应命名为 `Method_Scenario_Expected`（方法_场景_预期结果），中文环境下可保留英文命名以便与测试框架兼容。测试体用 AAA 结构组织：Arrange（准备数据）、Act（执行被测行为）、Assert（断言结果），并用注释分隔三段。每个测试必须相互独立，避免共享可变状态，更不能依赖执行顺序。用 `Theory` 配合 `InlineData` 表达参数化用例，替代大量重复的 `Fact`；依赖通过 xUnit 的构造函数或 `IClassFixture` 注入，而不是测试类的静态字段。

下面的 `CalculatorTests` 用 `Add_TwoPositiveNumbers_ReturnsSum` 展示标准 AAA 三段式，并用 `Theory` 把多组输入合并到一个用例中，包括溢出回绕这一边界情况：

```csharp
public class CalculatorTests
{
    [Fact]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        // Arrange
        var calc = new Calculator();

        // Act
        var result = calc.Add(2, 3);

        // Assert
        Assert.Equal(5, result);
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(-1, 1, 0)]
    [InlineData(int.MaxValue, 1, int.MinValue)] // 溢出回绕
    public void Add_VariousInputs_ReturnsExpected(int a, int b, int expected)
    {
        var calc = new Calculator();
        Assert.Equal(expected, calc.Add(a, b));
    }
}
```

❌ 以下三类错误展示了无信息量命名、共享静态可变状态导致污染、以及测试框架本身的无意义用例：

```csharp
// 错误1：命名无信息量
[Fact]
public void Test1() { ... }

// 错误2：共享静态可变状态，测试间相互污染
public class BadTests
{
    private static int _counter; // 一个测试改了，另一个就挂
    [Fact] public void A() { _counter++; }
    [Fact] public void B() { Assert.Equal(0, _counter); }
}

// 错误3：测框架
[Fact]
public void List_Add_Works() => Assert.True(new List<int>().Count == 0);
```

其他常见错误：

- 一个测试里断言太多不相关的行为，失败时难以定位具体错误。
- 测试依赖文件、数据库或网络等外部状态，导致在 CI 上不稳定（flaky）。
- 用测试执行顺序来传递状态，重排或并行后结果随机失败。

测试覆盖的是同步路径，但当逻辑淹没在 I/O 与并发之中时，异步写法本身也会引入新的坑。

## 异步最佳实践 {#async-best-practices}

异步最佳实践关注的是如何正确地编写和组合 `async/await` 代码，避免死锁、异常丢失与不可取消的问题。当异步调用从入口一路贯穿到叶子节点、并且协作取消被妥善传递时，应用才能在 I/O 密集场景下保持高吞吐与可响应性。遵守这些规则能让系统在压力下优雅降级，而不是在某一处阻塞调用中整体停滞。

最核心的两条原则是：第一，永远不要用 `.Result`、`.Wait()` 或 `.GetAwaiter().GetResult()` 去阻塞异步调用，这类写法在存在同步上下文时会引发死锁，并且会把 `AggregateException` 扁平化从而丢失内部异常；第二，`async` 要从入口贯穿到底，中途不要退回到同步调用。`CancellationToken` 应当随 I/O 操作一路传递，使调用方能够协作取消。对于高频、低开销的异步方法，可考虑返回 `ValueTask` 以减少堆分配；而 `ConfigureAwait(false)` 仅在库代码中有意义，ASP.NET Core 与 UI 框架已无同步上下文需求，通常可省略。

下面的示例中，`GetOrderAsync` 通过 `ConfigureAwait(false)` 断开库代码的上下文依赖，并把 `cancellationToken` 向下传递；`ProcessAsync` 则继续 `await`，全程不阻塞任何线程。

```csharp
public async Task<Order?> GetOrderAsync(OrderId id, CancellationToken cancellationToken)
{
    using var activity = _diagnostics.Start("GetOrder");
    var order = await _repo.GetAsync(id, cancellationToken).ConfigureAwait(false);
    return order;
}

// 调用方继续 await，不阻塞
public async Task ProcessAsync(OrderId id, CancellationToken ct)
{
    var order = await GetOrderAsync(id, ct);
    if (order is null) return;
    await _pipeline.RunAsync(order, ct);
}
```

在高频低开销场景下，用 `ValueTask` 可以避免每次调用都产生 `Task` 分配的额外开销：

```csharp
// 高频低开销场景用 ValueTask
public ValueTask<int> ReadCachedAsync(CancellationToken ct)
    => _cache.TryGet(out var v)
        ? new ValueTask<int>(v)
        : new ValueTask<int>(LoadAsync(ct));
```

异步链路里一旦抛异常，依然会沿着 `await` 一路上抛——所以这里"不阻塞、不吞取消、不丢异常"的纪律，和本文开头讲的异常处理是同一套世界观：错误就让它冒出来，并带上下文。

❌ 以下三类错误分别展示了阻塞死锁风险、`async void` 的失控异常，以及吞掉取消信号：

```csharp
// 错误1：阻塞导致死锁风险
var order = GetOrderAsync(id).Result;

// 错误2：async void（除事件处理器外）
public async void Save(Order o) { await _repo.SaveAsync(o); }

// 错误3：吞掉取消，不传递 token
public async Task<Order> Get(OrderId id) => await _repo.GetAsync(id); // 缺 CancellationToken
```

其他常见错误：

- 在热路径上用 `Task.Run` 把同步工作包装成"假异步"，反而徒增线程池压力。
- 忽略 `CancellationToken.ThrowIfCancellationRequested`，让长时间运行的方法无法被取消。
- 在 ASP.NET Core 中无谓地调用 `ConfigureAwait(false)`，增加无收益的代码噪音。

从命名到 API 边界，从空处理到异常、日志、配置、测试与异步，这一组实践合起来构成了一个"出错也能被理解、被验证、被恢复"的系统骨架。与之相对，[命名与 API 约定](coding-conventions.md)处理的则是"写出清晰稳定的接口"这一前提。两篇互为表里，建议一起阅读。

## 参考资料

- 相关：[命名与 API 约定](coding-conventions.md)
- 官方文档：[Exceptions and exception handling](https://learn.microsoft.com/dotnet/csharp/fundamentals/exceptions/)
- 官方文档：[Logging in .NET](https://learn.microsoft.com/dotnet/core/extensions/logging)
- 官方文档：[Options pattern in .NET](https://learn.microsoft.com/dotnet/core/extensions/options)
- 官方文档：[Unit testing in .NET](https://learn.microsoft.com/dotnet/core/testing/)
- 官方文档：[Asynchronous programming with async and await](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
