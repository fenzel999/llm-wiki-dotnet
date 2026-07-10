---
title: 后台服务（BackgroundService / Worker）
summary: 用 BackgroundService 与 IHostedService 跑长时任务，Worker Service 模板构建无 Web 的托管进程。
tags: [background-service, hosted-service, worker]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/workers
updated: 2026-07-10
---

> **要点速览**
> - 长期后台任务用 `BackgroundService`（重写 `ExecuteAsync`）；无 Web 的常驻进程用 Worker 模板。
> - 定时循环用 `PeriodicTimer`，全程尊重 `stoppingToken` 实现优雅停机。
> - 托管服务是 singleton：用 scoped 服务（如 `DbContext`）要在循环内 `CreateScope()`。
> - 包住循环体 try/catch——未捕获异常 net6+ 会让宿主崩溃。

## 概述

很多工作不该由 HTTP 请求线程去干：定时轮询、消费消息队列、批处理、清理任务。这些"随应用一起启动、在后台长期运行"的活儿，交给 **`IHostedService`**，而绝大多数场景用它的便捷基类 **`BackgroundService`** 即可——你只需重写一个 `ExecuteAsync(CancellationToken)`。若整个进程本就没有 Web，只是个常驻后台程序，用 **Worker Service** 项目模板（`dotnet new worker`），它可以直接注册成 Windows 服务或 systemd 守护进程。

关键点是**优雅停机**：宿主关闭时会触发传入的 `CancellationToken`，你的循环必须监听它并及时退出，否则会被强制杀掉、留下未完成的工作。

## 正确做法

继承 `BackgroundService`，用 `PeriodicTimer` 做定时循环，并全程尊重 `stoppingToken`：

```csharp
public class CleanupWorker(IServiceProvider sp, ILogger<CleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            using var scope = sp.CreateScope();      // 后台里手动开 scope 用 scoped 服务
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.PurgeExpiredAsync(stoppingToken);
        }
    }
}

builder.Services.AddHostedService<CleanupWorker>();
```

## 常见误区

❌ 在 `ExecuteAsync` 里直接注入 scoped 服务（如 `DbContext`）。托管服务是 singleton，会捕获过期 scope。应在循环内 `CreateScope()` 按需解析。

❌ 忽略 `stoppingToken`，写死循环。停机时任务无法及时退出，被强杀，可能损坏数据。每次 await 都传入并检查它。

❌ 在 `ExecuteAsync` 里让未捕获异常冒泡——net6+ 默认会让整个宿主崩溃停机。用 try/catch 包住循环体并记录，决定重试还是退出。

## 适用版本

`IHostedService` 全版本通用；`BackgroundService`/Worker 模板 net3.0+；`PeriodicTimer` net6+；未处理异常导致停机的行为自 net6 起默认开启。

## 参考资料

- [依赖注入（作用域）](dependency-injection.md)
- [日志与可观测性](observability.md)
- 官方文档：[使用托管服务实现后台任务](https://learn.microsoft.com/dotnet/core/extensions/workers)
- 官方文档：[ASP.NET Core 中的托管服务](https://learn.microsoft.com/aspnet/core/fundamentals/host/hosted-services)
