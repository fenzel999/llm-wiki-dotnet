---
title: 异常处理
summary: 只在异常情形抛异常，抛具体类型，保留上下文，不在热路径抛异常。
tags: [standard, exception]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/fundamentals/exceptions/
updated: 2026-07-10
---

## 概述

异常处理的核心原则是让异常只表达真正异常的程序状态，并把诊断所需的信息完整保留下来。把异常留给不可恢复或违反前置条件的情况，而不是用于常规控制流，可以让正常路径更快、更清晰。当抛出的是具体类型、且携带了上下文与底层原因时，调用方才能精确捕获并处理，线上排错也才有迹可循。

## 正确做法

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
    public static T AddData<T>(this T ex, string key, string value) where T : Exception
    {
        ex.Data[key] = value;
        return ex;
    }
}
```

## 反例（常见错误）

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

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[吞异常反模式](../anti-patterns/swallowing-exceptions.md)
- 相关：[异步最佳实践](../standards/async-best-practices.md)
- 相关：[日志](../standards/logging.md)
- 官方文档：[Exceptions and exception handling](https://learn.microsoft.com/dotnet/csharp/fundamentals/exceptions/)
