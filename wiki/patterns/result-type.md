---
title: Result 类型模式（显式错误处理）
summary: 用 Result<T> 显式表达成功/失败，避免用异常控制正常业务流。
tags: [pattern, error-handling]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 意图

在领域层与边界层之间，显式地表达操作可能失败（例如校验未通过、业务规则冲突），而不是依赖抛异常（exception）来传递预期的、可恢复的错误。这样调用方必须处理失败分支，返回值即文档。

## 正确做法

定义一个 `Result<T>`（或 `Result`）联合式类型，配合错误对象而非抛异常：

```csharp
namespace App.Domain;

public readonly struct Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess { get; }

    private Result(T? value, Error? error, bool isSuccess)
    {
        Value = value;
        Error = error;
        IsSuccess = isSuccess;
    }

    public static Result<T> Ok(T value) => new(value, null, true);
    public static Result<T> Fail(Error error) => new(default, error, false);

    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<Error, TOut> onFailure)
        => IsSuccess ? onSuccess(Value!) : onFailure(Error!);
}

public sealed record Error(string Code, string Message);

// 使用方必须处理两种分支
public Result<Order> CreateOrder(OrderRequest request)
{
    if (string.IsNullOrWhiteSpace(request.CustomerId))
        return Result<Order>.Fail(new Error("INVALID_CUSTOMER", "客户标识不能为空"));

    var order = new Order(request.CustomerId, request.Items);
    return Result<Order>.Ok(order);
}

// 调用处显式处理
var result = CreateOrder(request);
if (result.IsSuccess)
    Console.WriteLine($"已创建订单 {result.Value!.Id}");
else
    Console.WriteLine($"错误 {result.Error!.Code}: {result.Error.Message}");
```

借助扩展方法可让失败传播更顺畅：

```csharp
public static class ResultExtensions
{
    public static Result<TOut> Bind<TIn, TOut>(
        this Result<TIn> result, Func<TIn, Result<TOut>> binder)
        => result.IsSuccess ? binder(result.Value!) : Result<TOut>.Fail(result.Error!);
}
```

## 何时使用 / 何时不用

- 使用：预期内、可恢复的业务失败（校验、规则违规、找不到资源）。
- 使用：在领域层 / 应用层返回错误，避免污染调用栈。
- 不用：真正的程序异常（空引用、越界、IO 中断）仍应抛异常，交由上层兜底。
- 不用：性能敏感的热路径大量分配错误对象时需权衡；可改用 `Result`（无泛型值）减少分配。

与 `[Result 类型](#)` 相关的取舍参见 [释放与 using](../patterns/disposable-using.md) 中的资源安全约定，确保错误分支也不会泄漏资源。

## 参考资料

- [依赖注入](../concepts/dependency-injection.md)
- [释放与 using](../patterns/disposable-using.md)
- [Options 模式](../patterns/options-pattern.md)
