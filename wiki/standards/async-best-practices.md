---
title: 异步最佳实践
summary: 避免阻塞异步（.Result/.Wait），async 一路到底，传递 CancellationToken。
tags: [standard, async]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/asynchronous-programming
updated: 2026-07-10
---

## 概述

异步最佳实践关注的是如何正确地编写和组合 `async/await` 代码，避免死锁、异常丢失与不可取消的问题。当异步调用从入口一路贯穿到叶子节点、并且协作取消被妥善传递时，应用才能在 I/O 密集场景下保持高吞吐与可响应性。遵守这些规则能让系统在压力下优雅降级，而不是在某一处阻塞调用中整体停滞。

## 正确做法

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

## 反例（常见错误）

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

- 在热路径上用 `Task.Run` 把同步工作包装成“假异步”，反而徒增线程池压力。
- 忽略 `CancellationToken.ThrowIfCancellationRequested`，让长时间运行的方法无法被取消。
- 在 ASP.NET Core 中无谓地调用 `ConfigureAwait(false)`，增加无收益的代码噪音。

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[阻塞异步反模式](../anti-patterns/blocking-async.md)
- 相关：[ValueTask 概念](../concepts/value-task.md)
- 相关：[异常处理](../standards/exception-handling.md)
- 官方文档：[Asynchronous programming with async and await](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
