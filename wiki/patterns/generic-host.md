---
title: Generic Host 模式（通用宿主）
summary: 用 Host.CreateApplicationBuilder 托管后台服务，统一接入配置、日志与依赖注入。
tags: [pattern, hosting, background-service]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/generic-host
updated: 2026-07-10
---

## 概述

Generic Host（通用宿主）用于统一托管长驻或后台服务（background service），集中管理配置（configuration）、日志（logging）与 [依赖注入](../concepts/dependency-injection.md)，并对应用生命周期（lifetime）做出响应。当你编写控制台程序、消息消费、定时作业或守护进程，且希望复用与 ASP.NET Core 一致的配置/日志/DI 体系时，应当使用它；而一个单纯运行一次就退出的短命令工具，若不需要 DI 或后台循环，直接用 `Main` 即可，不必引入宿主。

## 正确做法

通过 `Host.CreateApplicationBuilder` 创建构建器，它已自动接入 `appsettings.json`、环境变量与命令行参数。下面的示例演示了如何绑定强类型配置、添加控制台日志并注册一个后台服务：

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

后台服务通过继承 `BackgroundService` 实现，需要正确响应取消令牌并完成异步释放。下面的 `MyWorker` 在收到取消信号前周期性地打印心跳：

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

生命周期方面，按下 Ctrl+C 或收到 SIGTERM 会触发 `stoppingToken` 取消，`RunAsync` 在优雅关闭后返回。若需在退出前释放资源，可结合 [释放与 using](../patterns/disposable-using.md) 模式处理。

## 反例（常见错误）

❌ 在 `BackgroundService` 的 `ExecuteAsync` 中未处理异常，导致宿主被未捕获异常直接终止：

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    await DoWorkAsync(stoppingToken); // 抛异常会终止整个宿主
}
```

- 忽略 `stoppingToken`：循环不检查取消信号，导致关闭时无法优雅退出。
- 过度设计：为无需后台循环与 DI 的短工具引入整个宿主，徒增复杂度。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- 相关：[依赖注入](../concepts/dependency-injection.md)
- 相关：[Options 模式](../patterns/options-pattern.md)
- 相关：[释放与 using](../patterns/disposable-using.md)
- 官方文档：[.NET 通用宿主](https://learn.microsoft.com/dotnet/core/extensions/generic-host)
