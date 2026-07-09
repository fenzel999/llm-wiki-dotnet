---
title: 吞掉异常（空 catch 块）
summary: 空的 catch {} 会吞掉异常，导致问题被静默隐藏，难以排查。
tags: [anti-pattern, exception-handling]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 为什么是反模式

空的 `catch {}` 会捕获异常却不作任何处理，异常信息被完全丢弃。程序看似“正常运行”，但其内部状态可能已经损坏，问题会在离真实错误点很远的地方以诡异的方式暴露，排查成本极高。此外，它还会吞掉 `OperationCanceledException` 之类的语义异常，破坏取消语义。

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

## ✅ 正确写法

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

## 相关

- [异常处理规范](../standards/exception-handling.md)
- [空处理](../standards/null-handling.md)
- [类型化返回 Results/TypedResults](../patterns/minimal-api-organization.md)
