---
title: 管道行为模式（Pipeline Behavior）
summary: 用 MediatR 风格 IPipelineBehavior 或 DI 装饰器实现日志/验证/事务等横切关注点。
tags: [pattern, cross-cutting, mediatr]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 意图

将日志（logging）、验证（validation）、事务（transaction）、性能度量等横切关注点（cross-cutting concern）从业务 handler 中剥离，以管道（pipeline）方式统一包裹请求处理，保持 handler 只关注核心逻辑。

## 正确做法

MediatR 风格：实现 `IPipelineBehavior<TRequest, TResponse>`。

```csharp
using MediatR;
using Microsoft.Extensions.Logging;

namespace App.Behaviors;

public sealed class LoggingBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;
    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
        => _logger = logger;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("处理请求 {Request}", typeof(TRequest).Name);
        var response = await next();
        _logger.LogInformation("完成请求 {Request}", typeof(TRequest).Name);
        return response;
    }
}

// 事务行为示例
public sealed class TransactionBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
{
    private readonly AppDbContext _db;
    public TransactionBehavior(AppDbContext db) => _db = db;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
        var response = await next();
        await _db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
        return response;
    }
}
```

注册（MediatR 自动按注册顺序串成管道）：

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
});
```

不用 MediatR 时，可用 [依赖注入](../concepts/dependency-injection.md) 装饰器（decorator）实现同样效果。

## 何时使用 / 何时不用

- 使用：多条请求/handler 共享的横切逻辑（日志、验证、缓存、事务、重试）。
- 使用：希望 handler 保持精简、只写业务。
- 不用：单一 handler 特有逻辑不要硬塞进通用管道；直接写在 handler 内更清晰。
- 不用：管道顺序需谨慎，验证应在事务/业务之前。

## 参考资料

- [依赖注入](../concepts/dependency-injection.md)
- [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- [释放与 using](../patterns/disposable-using.md)
