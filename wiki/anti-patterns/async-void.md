---
title: async void 方法
summary: async void 无法被 await 且异常会逃逸到同步上下文，难以捕获。
tags: [anti-pattern, async, exception-handling]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/asynchronous-programming
updated: 2026-07-10
---

## 为什么是反模式

`async void` 的返回类型无法被调用方 `await`，调用方无从知道异步操作何时完成，也无法获取其结果。更危险的是：`async void` 中的未处理异常会直接抛到当前的 `SynchronizationContext`，在 UI/ASP.NET 等传统上下文中可能导致进程崩溃，且很难在调用处用 `try/catch` 捕获。它之所以常见，往往是因为开发者图省事或误以为“不需要返回结果就可以用 void”，但只有事件处理程序才是 `async void` 少数合适用例。

## ❌ 错误写法

```csharp
public async void SendNotification(User user)
{
    var message = await _service.BuildMessageAsync(user);
    await _service.SendAsync(message);
    // 若此处抛出异常，调用方无法 try/catch 捕获
}
```

这个方法的返回类型是 `async void`，调用方既无法等待其完成，也无法捕获其中可能抛出的异常；一旦内部出错，异常会逃逸到同步上下文，轻则导致后续逻辑错乱，重则使进程崩溃。

## ✅ 正确写法

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

## 如何避免

- 默认把所有异步方法声明为返回 `Task` / `Task<T>`，仅在事件处理程序中才使用 `async void`。
- 在代码评审中把“`async void` 出现在非事件处理方法里”列为必须拦截的问题。
- 借助静态分析工具（如 Roslyn 分析器）对 `async void` 的使用发出告警。

- 相关：[异步最佳实践](../standards/async-best-practices.md)、[异常处理规范](../standards/exception-handling.md)
- 官方文档：[Asynchronous programming with async and await](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
