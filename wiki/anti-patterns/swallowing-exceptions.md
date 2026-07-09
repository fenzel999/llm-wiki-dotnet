---
title: 吞掉异常（空 catch 块）
summary: 空的 catch {} 会吞掉异常，导致问题被静默隐藏，难以排查。
tags: [anti-pattern, exception-handling]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/fundamentals/exceptions/
updated: 2026-07-10
---

## 为什么是反模式

空的 `catch {}` 会捕获异常却不作任何处理，异常信息被完全丢弃。程序看似“正常运行”，但其内部状态可能已经损坏，问题会在离真实错误点很远的地方以诡异的方式暴露，排查成本极高。此外，它还会吞掉 `OperationCanceledException` 之类的语义异常，破坏取消语义。这种写法常出于“不想让程序崩溃”的善意，却把故障藏到了更隐蔽、更致命的地方。

## ❌ 错误写法

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

## ✅ 正确写法

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

## 如何避免

- 不要写空的 `catch` 块，至少记录日志，必要时重新抛出。
- 仅捕获你确实知道如何处理的具体异常类型，避免宽泛的 `catch (Exception)`。
- 可恢复场景返回默认值前，务必记录日志并保留异常上下文。

- 相关：[异常处理规范](../standards/exception-handling.md)、[空处理](../standards/null-handling.md)、[类型化返回 Results/TypedResults](../patterns/minimal-api-organization.md)
- 官方文档：[Exceptions and exception handling](https://learn.microsoft.com/dotnet/csharp/fundamentals/exceptions/)
