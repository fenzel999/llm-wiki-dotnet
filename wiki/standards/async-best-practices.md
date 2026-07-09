---
title: 异步最佳实践
summary: 避免阻塞异步（.Result/.Wait），async 一路到底，传递 CancellationToken。
tags: [standard, async]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 规则

- 不要使用 `.Result`、`.Wait()`、`.GetAwaiter().GetResult()` 阻塞异步调用（见 [阻塞异步反模式](../anti-patterns/blocking-async.md)），会引发死锁并吞掉异常。
- `async` 一路到底（async all the way）：从入口到叶子节点保持 `async/await`，不要中途混合同步调用。
- 在 I/O 操作的 API 上接受并传递 `CancellationToken`，让调用方能够取消。
- 高频、低开销的异步方法考虑返回 `ValueTask`（见 [ValueTask 概念](../concepts/value-task.md)）以减少分配。
- 使用 `ConfigureAwait(false)` 仅在库代码中（UI/ASP.NET Core 已无同步上下文需求，可省略）。

## 正确做法

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

```csharp
// 高频低开销场景用 ValueTask
public ValueTask<int> ReadCachedAsync(CancellationToken ct)
    => _cache.TryGet(out var v)
        ? new ValueTask<int>(v)
        : new ValueTask<int>(LoadAsync(ct));
```

## 反例

```csharp
// 错误1：阻塞导致死锁风险
var order = GetOrderAsync(id).Result;

// 错误2：async void（除事件处理器外）
public async void Save(Order o) { await _repo.SaveAsync(o); }

// 错误3：吞掉取消，不传递 token
public async Task<Order> Get(OrderId id) => await _repo.GetAsync(id); // 缺 CancellationToken
```

## 理由

`.Result`/`.Wait()` 在存在同步上下文时会死锁，且会把 `AggregateException` 扁平化丢失内部异常。`async` 一路到底保留异步的吞吐与可取消性。传递 `CancellationToken` 是协作取消的基础，使系统能优雅降级。`ValueTask` 在热路径上减少堆分配。相关：[异常处理](../standards/exception-handling.md)、[单元测试](../standards/unit-testing.md)。
