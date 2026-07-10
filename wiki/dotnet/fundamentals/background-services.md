---
title: 后台服务（BackgroundService / Worker）
summary: 用 BackgroundService 跑长时任务；优雅停机、作用域、异常隔离、队列化与 AOT 注意。
tags: [background-service, hosted-service, worker]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/workers
updated: 2026-07-10
---

# 后台服务（BackgroundService / Worker）

> **要点速览**
> - 长时后台任务用 `BackgroundService`（重写 `ExecuteAsync`）；无 Web 的常驻进程用 Worker 模板（`dotnet new worker`）。
> - 托管服务是 **singleton**：要用 scoped（如 `DbContext`）必须在循环内 `CreateScope()`。
> - 全程尊重 `stoppingToken` 实现优雅停机；循环体 try/catch，未捕获异常 net6+ 会让宿主崩溃。
> - 需"请求中提交后台工作"时用 `Channel` 队列：`QueueBackgroundWorkItem` + 后台消费。
> - `BackgroundService` 本身**兼容 Native AOT**；里面用 scoped 走 `IServiceScopeFactory`（见 [P16](../../governance/policy.md)）。

## 概述

不该由 HTTP 线程干的活——定时轮询、消费消息、批处理、清理——交给 **`IHostedService`**。绝大多数场景用便捷基类 **`BackgroundService`**，只需重写 `ExecuteAsync(CancellationToken)`。纯后台进程用 **Worker Service** 模板，可直接注册成 Windows 服务或 systemd。

关键是**优雅停机**：宿主关闭时触发传入的 token，循环必须监听并及时退出，否则被强杀、留下未完成工作。net6+ 起，`BackgroundService` 中未处理的异常默认会让整个宿主崩溃停机——所以循环体要自己兜住异常。

## 正确做法

### 1. 定时循环：尊重 stoppingToken、循环内开 scope

```csharp
public class CleanupWorker(IServiceProvider sp, ILogger<CleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))   // token 取消即退出
        {
            try
            {
                using var scope = sp.CreateScope();               // 后台里手动开 scope 用 scoped 服务
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.PurgeExpiredAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "清理失败，下一轮重试");
            }
        }
    }
}
builder.Services.AddHostedService<CleanupWorker>();
```

### 2. 队列化后台工作（请求中提交，后台消费）

用 `Channel` 把"HTTP 请求里产生的后台任务"交给后台 worker，避免阻塞请求：

```csharp
public sealed class WorkQueue : IWorkQueue
{
    private readonly Channel<Func<CancellationToken, ValueTask>> _ch = Channel.CreateUnbounded<Func<CancellationToken, ValueTask>>();
    public void Queue(Func<CancellationToken, ValueTask> work) => _ch.Writer.TryWrite(work);
    public IAsyncEnumerable<Func<CancellationToken, ValueTask>> Reader => _ch.Reader.ReadAllAsync();
}

public class WorkConsumer(IWorkQueue queue, IServiceScopeFactory scopes) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var work in queue.Reader.WithCancellation(stoppingToken))
        {
            using var scope = scopes.CreateScope();
            try { await work(stoppingToken); }
            catch (Exception ex) { /* 记录，不阻塞后续 */ }
        }
    }
}
// 端点里：queue.Queue(ct => email.SendAsync(order, ct));
```

### 3. 注册与生命周期

- `AddHostedService<T>()` 注册；`T` 是 singleton。
- 与 Web 同进程时，后台服务随 Web 一起启停；纯 Worker 模板则无 `app.MapGet` 之类端点。

## 常见误区

❌ **在 `ExecuteAsync` 直接注入 scoped 服务**（如 `DbContext`）。托管服务是 singleton，会捕获过期 scope（captive dependency）。循环内 `CreateScope()`（见 §1）。

❌ **忽略 `stoppingToken`、写死循环**。停机时无法及时退出，被强杀可能损坏数据。每次 `await` 都传入并检查它。

❌ **循环体未捕获异常**。net6+ 默认让整个宿主崩溃停机。用 try/catch 包住、记录后继续或按策略退出。

❌ **在后台服务里做重活却不设并发上限/背压**。无限堆积会吃光内存。用有界的 `Channel`（`.CreateBounded`）或限流控制。

❌ **把 `DbContext` 当作能在多次循环间复用的长生命周期对象**。它非线程安全、代表一个工作单元——每次工作新建 scope 解析新的。

## 适用版本

`IHostedService`/`BackgroundService`/`Worker` 全版本通用；`PeriodicTimer` net6+；未处理异常导致停机默认自 net6 起。`Channel` 全版本通用。

### Native AOT 兼容性

`BackgroundService`/托管服务机制**兼容 Native AOT**（[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）。注意：worker 里用 scoped 服务必须走 `IServiceScopeFactory.CreateScope()`（AOT 安全），不要注入 scoped；`Channel`、定时循环无反射，AOT 友好。

## 参考资料

- [依赖注入（作用域 / IServiceScopeFactory）](dependency-injection.md) · [异步编程（取消令牌）](../csharp/async-await.md)
- [日志与可观测性](observability.md) · [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[使用托管服务实现后台任务](https://learn.microsoft.com/dotnet/core/extensions/workers)
