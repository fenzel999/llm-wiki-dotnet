---
title: 管道行为模式（Pipeline Behavior）
summary: 用 MediatR 风格 IPipelineBehavior 或 DI 装饰器实现日志/验证/事务等横切关注点。
tags: [pattern, cross-cutting, mediatr]
introduced-in: general
applies-to: [all]
status: stable
source: https://github.com/jbogard/MediatR
updated: 2026-07-10
---

## 概述

管道行为模式将日志（logging）、验证（validation）、事务（transaction）、性能度量等横切关注点（cross-cutting concern）从业务 handler 中剥离，以管道（pipeline）方式统一包裹请求处理，让 handler 只关注核心逻辑。当多条请求/handler 共享同一类横切逻辑、且希望 handler 保持精简时，应当使用它；而某个 handler 特有的逻辑强行塞进通用管道反而会增加理解成本，应直接写在 handler 内部。

## 正确做法

以 MediatR 风格为例，实现 `IPipelineBehavior<TRequest, TResponse>` 即可定义一个行为。下面先定义一个日志行为，在请求处理前后各记一条日志：

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
```

再定义一个事务行为，把整个 handler 包进一个数据库事务中，提交或异常回滚都交给 EF Core 管理：

```csharp
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

注册时按声明顺序串成管道，MediatR 会依次包裹请求处理。下面的配置先记日志、再开事务：

```csharp
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
});
```

若不使用 MediatR，同样的效果也可通过 [依赖注入](../concepts/dependency-injection.md) 的装饰器（decorator）实现，把横切逻辑包在真实 handler 外层。

## 反例（常见错误）

❌ 把验证行为排在事务之后，导致无效请求也开启了数据库事务：

```csharp
cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
cfg.AddOpenBehavior(typeof(ValidationBehavior<,>)); // 顺序错误：应先验证
```

- 把单一 handler 特有的逻辑硬塞进通用管道：直接写在 handler 内更清晰。
- 忽略管道顺序：验证、鉴权等前置逻辑应排在事务/业务之前。
- 在行为中吞掉异常或返回错误响应却不记录，导致问题难以排查。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- 相关：[依赖注入](../concepts/dependency-injection.md)
- 相关：[EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- 相关：[释放与 using](../patterns/disposable-using.md)
- 官方文档：[MediatR](https://github.com/jbogard/MediatR)
