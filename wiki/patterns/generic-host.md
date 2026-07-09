---
title: Generic Host 模式（通用宿主）
summary: 用 Host.CreateApplicationBuilder 托管后台服务，统一接入配置、日志与依赖注入。
tags: [pattern, hosting, background-service]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/generic-host
updated: 2026-07-09
---

## 意图

使用 Generic Host（通用宿主）统一托管长驻或后台服务（background service），集中管理配置（configuration）、日志（logging）与 [依赖注入](../concepts/dependency-injection.md)，并对应用生命周期（lifetime）做出响应。

## 正确做法

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

var builder = Host.CreateApplicationBuilder(args);

// 配置：自动读取 appsettings.json、环境变量、命令行
builder.Services.AddOptions<WorkerOptions>()
    .Bind(builder.Configuration.GetSection(WorkerOptions.Section))
    .ValidateOnStart();

// 日志：默认控制台等提供程序已接入
builder.Logging.AddConsole();

// 注册后台服务
builder.Services.AddHostedService<MyWorker>();

using var host = builder.Build();
await host.RunAsync();
```

后台服务实现 `BackgroundService`，注意取消令牌与异步释放：

```csharp
public sealed class MyWorker : BackgroundService
{
    private readonly ILogger<MyWorker> _logger;
    private readonly WorkerOptions _options;
    public MyWorker(ILogger<MyWorker> logger, IOptions<WorkerOptions> options)
        => (_logger, _options) = (logger, options.Value);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("心跳间隔 {Interval}s", _options.IntervalSeconds);
            await Task.Delay(TimeSpan.FromSeconds(_options.IntervalSeconds), stoppingToken);
        }
    }
}

public sealed class WorkerOptions
{
    public const string Section = "Worker";
    public int IntervalSeconds { get; set; } = 30;
}
```

生命周期：Ctrl+C / SIGTERM 触发 `stoppingToken` 取消，`RunAsync` 在优雅关闭后返回。

## 何时使用 / 何时不用

- 使用：控制台/后台任务、消息消费、定时作业、守护进程。
- 使用：希望复用与 ASP.NET Core 一致的配置/日志/DI 体系。
- 不用：单纯的短命令工具若无需 DI/后台循环，直接用 `Main` 即可，避免过度设计。
- 注意：`BackgroundService` 抛异常会终止宿主，需内部 try/catch 并配合 [释放与 using](../patterns/disposable-using.md) 释放资源。

## 参考资料

- [依赖注入](../concepts/dependency-injection.md)
- [Options 模式](../patterns/options-pattern.md)
- [释放与 using](../patterns/disposable-using.md)
