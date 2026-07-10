---
title: 异步反模式
summary: 两个最常见的异步误用——async void 与阻塞异步，及各自的危害与正确写法。
tags: [anti-pattern, async, exception-handling, deadlock]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/asynchronous-programming
updated: 2026-07-10
---

在 C# 的异步编程里，有两处坑几乎每个团队都踩过：一个是把方法写成 `async void`，另一个是忍不住用 `.Result` 把异步“等”成同步。它们看起来都能编译、都能跑，问题却往往要到生产环境才暴露。下面把这两个反模式放在一起讲，因为它们常常成对出现——你一旦在某一层用 `async void` 或 `.Wait()` 打破了异步链，异常和死锁就都跟着来了。

> **要点速览**
> - 本页收录异步反模式及正确写法（❌/✅ 对比）。
> - `async void` 除事件处理器外禁用——异常抓不到、无法 await。
> - 别用 `.Result`/`.Wait()` 阻塞异步（死锁/耗线程）；一路 `async/await`。

## async void {#async-void}

`async void` 的返回类型无法被调用方 `await`，调用方无从知道异步操作何时完成，也无法获取其结果。更危险的是：`async void` 中的未处理异常会直接抛到当前的 `SynchronizationContext`，在 UI/ASP.NET 等传统上下文中可能导致进程崩溃，而且很难在调用处用 `try/catch` 捕获。它之所以常见，往往是因为开发者图省事或误以为“不需要返回结果就可以用 void”，但只有事件处理程序才是 `async void` 少数合适用例。

❌ 错误写法

```csharp
public async void SendNotification(User user)
{
    var message = await _service.BuildMessageAsync(user);
    await _service.SendAsync(message);
    // 若此处抛出异常，调用方无法 try/catch 捕获
}
```

这个方法的返回类型是 `async void`，调用方既无法等待其完成，也无法捕获其中可能抛出的异常；一旦内部出错，异常会逃逸到同步上下文，轻则导致后续逻辑错乱，重则使进程崩溃。

✅ 正确写法

将返回类型改为 `Task`（或 `Task<T>`），让调用方能够正确地等待并捕获异常：

```csharp
public async Task SendNotificationAsync(User user)
{
    var facilitatedMessage = await _service.BuildMessageAsync(user);
    await _service.SendAsync(facilitatedMessage);
}

// 调用方可以正确等待并处理异常
public async Task NotifyAsync(User user)
{
    try
    {
        await SendNotificationAsync(user);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "通知用户 {Id} 失败", user.Id);
        throw;
    }
}
```

使用 `async Task` 后，调用链上的每一层都可以通过 `await` 正确等待，并且异常会以原始调用栈的形式逐层向上传播，便于在合适的位置统一处理与记录。

如何避免

- 默认把所有异步方法声明为返回 `Task` / `Task<T>`，仅在事件处理程序中才使用 `async void`。
- 在代码评审中把“`async void` 出现在非事件处理方法里”列为必须拦截的问题。
- 借助静态分析工具（如 Roslyn 分析器）对 `async void` 的使用发出告警。

> 与 `async void` 常常结伴出现的，是下一节要讲的阻塞异步——一旦你在调用链里用 `.Result` 把异步强行同步化，异常同样会找不到出口。

## 阻塞异步 {#blocking-async}

在异步方法上使用 `.Result`、`.Wait()` 或 `.GetAwaiter().GetResult()` 会阻塞当前线程去等待任务完成。在带有 `SynchronizationContext` 的环境（如 WinForms/WPF/旧 ASP.NET）中，被 `await` 的续体（continuation）需要回到原线程执行，而原线程正被 `.Result` 阻塞，于是形成死锁（deadlock）。即便侥幸不死锁，这种写法也会占用并耗尽线程池线程、降低吞吐。正确做法是“异步一路到底”（async all the way），避免在任何一层用同步方式去等待异步结果。

❌ 错误写法

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

✅ 正确写法

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

如何避免

- 坚持“异步一路到底”，不要用 `.Result` / `.Wait()` / `.GetAwaiter().GetResult()` 去阻塞异步代码。
- 若边界处必须桥接同步世界，优先使用 `ConfigureAwait(false)` 或专门的同步桥接工具，而非直接 `.Result`。
- 在代码评审中把对 `Task` 的同步阻塞调用列入禁止清单。

---

相关阅读：

- [异步最佳实践](../standards/quality-engineering.md#async-best-practices)
- [异常处理规范](../standards/quality-engineering.md#exception-handling)
- 官方文档：[Asynchronous programming with async and await](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
