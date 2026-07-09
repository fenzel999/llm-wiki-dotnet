---
title: 阻塞异步代码（Blocking on Async）
summary: 使用 .Result/.Wait() 阻塞异步调用易引发死锁，应一路 await。
tags: [anti-pattern, async, deadlock]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/asynchronous-programming
updated: 2026-07-10
---

## 为什么是反模式

在异步方法上使用 `.Result`、`.Wait()` 或 `.GetAwaiter().GetResult()` 会阻塞当前线程去等待任务完成。在带有 `SynchronizationContext` 的环境（如 WinForms/WPF/旧 ASP.NET）中，被 `await` 的续体（continuation）需要回到原线程执行，而原线程正被 `.Result` 阻塞，于是形成死锁（deadlock）。即便侥幸不死锁，这种写法也会占用并耗尽线程池线程、降低吞吐。正确做法是“异步一路到底”（async all the way），避免在任何一层用同步方式去等待异步结果。

## ❌ 错误写法

```csharp
public decimal GetTotal(int orderId)
{
    return FetchOrderAsync(orderId).Result; // 可能死锁
}

public void Save(Order order)
{
    SaveAsync(order).Wait(); // 阻塞调用线程
}
```

这两个方法用 `.Result` / `.Wait()` 把异步调用强行同步化，在带同步上下文的环境中极易造成死锁；即便不锁，也会阻塞调用线程，浪费线程池资源并拖慢整体吞吐。

## ✅ 正确写法

把方法改为异步并返回 `Task`，让调用链每一层都用 `await` 而不阻塞任何线程：

```csharp
public async Task<decimal> GetTotalAsync(int orderId)
{
    var order = await FetchOrderAsync(orderId);
    return order.Total;
}

public async Task SaveAsync(Order order)
{
    await PersistAsync(order);
}

// 调用方同样使用 await，不阻塞任何线程
public async Task ProcessAsync(int orderId)
{
    var total = await GetTotalAsync(orderId);
    _logger.LogInformation("订单金额 {Total}", total);
}
```

若确实必须从同步上下文桥接（应尽量避免），至少使用 `ConfigureAwait(false)` 缓解死锁，但这仍优于 `.Result`：

```csharp
public decimal GetTotal(int orderId)
{
    return FetchOrderAsync(orderId).ConfigureAwait(false).GetAwaiter().GetResult();
}
```

通过一路 `await`，没有任何线程被同步阻塞，续体按异步调度回到正确上下文执行，既避免了死锁，也保留了完整的异常传播链路。

## 如何避免

- 坚持“异步一路到底”，不要用 `.Result` / `.Wait()` / `.GetAwaiter().GetResult()` 去阻塞异步代码。
- 若边界处必须桥接同步世界，优先使用 `ConfigureAwait(false)` 或专门的同步桥接工具，而非直接 `.Result`。
- 在代码评审中把对 `Task` 的同步阻塞调用列入禁止清单。

- 相关：[异步最佳实践](../standards/async-best-practices.md)、[async void](../anti-patterns/async-void.md)、[异常处理规范](../standards/exception-handling.md)
- 官方文档：[Asynchronous programming with async and await](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
