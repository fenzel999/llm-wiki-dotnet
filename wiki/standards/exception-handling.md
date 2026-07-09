---
title: 异常处理
summary: 只在异常情形抛异常，抛具体类型，保留上下文，不在热路径抛异常。
tags: [standard, exception]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 规则

- 异常只用于表示**真正异常**的程序状态（不可恢复或违反前置条件），不要用于控制流（如用异常做常规分支）。
- 抛出**具体**的异常类型（`ArgumentNullException`、`InvalidOperationException` 等），而非笼统的 `Exception`。
- 不要吞异常（见 [吞异常反模式](../anti-patterns/swallowing-exceptions.md)）；若必须吞，要记录日志并说明原因。
- 通过 `Exception.Data` 或 `InnerException` 保留上下文，便于排查。
- 避免在高频热路径（hot path）中抛异常，异常的成本远高于普通分支判断。

## 正确做法

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

## 反例

```csharp
// 错误1：吞异常，丢失上下文
try { DoWork(); } catch { }

// 错误2：用异常做常规控制流
try { var x = int.Parse(input); }
catch (FormatException) { x = 0; } // 应使用 int.TryParse

// 错误3：抛笼统 Exception，且无上下文
throw new Exception("出错了");
```

## 理由

具体异常类型让调用方能精确 `catch` 并处理；保留 `InnerException` 与 `Data` 让线上排错有迹可循。热路径中的异常会触发栈展开与字符串分配，严重影响吞吐。把异常留给异常情形，可使正常路径更快、更清晰。相关：[异步最佳实践](../standards/async-best-practices.md)、[日志](../standards/logging.md)。
