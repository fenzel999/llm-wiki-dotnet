---
title: async void 方法
summary: async void 无法被 await 且异常会逃逸到同步上下文，难以捕获。
tags: [anti-pattern, async, exception-handling]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 为什么是反模式

`async void` 的返回类型无法被调用方 `await`，调用方无从知道异步操作何时完成，也无法获取其结果。更危险的是：`async void` 中的未处理异常会直接抛到当前的 `SynchronizationContext`，在 UI/ASP.NET 等传统上下文中可能导致进程崩溃，且很难在调用处用 `try/catch` 捕获。仅事件处理程序是 `async void` 的少数合适用例。

## ❌ 错误写法

```csharp
public async void SendNotification(User user)
{
    var message = await _service.BuildMessageAsync(user);
    await _service.SendAsync(message);
    // 若此处抛出异常，调用方无法 try/catch 捕获
}
```

## ✅ 正确写法

```csharp
public async Task SendNotificationAsync(User user)
{
    var message = await _service.BuildMessageAsync(user);
    await _service.SendAsync(message);
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

## 相关

- [异步最佳实践](../standards/async-best-practices.md)
- [异常处理规范](../standards/exception-handling.md)
