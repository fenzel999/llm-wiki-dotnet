---
title: 异步编程（async/await）
summary: 基于 Task 的异步模型与 await 状态机；理解 ConfigureAwait、避免阻塞死锁、用 WhenAll 并发；AOT 友好。
tags: [async, await, task, csharp]
introduced-in: csharp5
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/asynchronous-programming
updated: 2026-07-11
---

# 异步编程（async/await）

> **要点速览**
> - `await` 挂起而不阻塞线程，释放线程去干别的活。
> - 别用 `.Result`/`.Wait()` 阻塞（死锁风险）；并发要先发起任务再一起 `await`（或 `Task.WhenAll`）。
> - `async void` 只用于事件处理；别"点火就忘"忘了 `await`。
> - 现代 ASP.NET Core **没有**同步上下文，`ConfigureAwait(false)` 主要是历史/库代码习惯（见下）；加 `CancellationToken` 支持取消。

## 概述

`Task`/`Task<T>` 代表"一个将来会完成的操作"。`async` 方法被编译器改写成状态机：遇到 `await` 时挂起并把控制权交还调用方，操作完成后从挂起点继续（延续 continuation）。`await` 的好处是**不阻塞线程**——线程在等待期间可以去处理别的请求。

延续默认调度回原始 `SynchronizationContext`。在桌面 UI 这类"只有一个上下文线程"的环境里，这是为方便更新界面，但也制造了经典死锁（见误区）。在 **ASP.NET Core** 中**不存在**同步上下文，延续在线程池上继续，所以传统"必须 `ConfigureAwait(false)` 防死锁"在 Web 后端基本不成立；但它仍是库代码的良好习惯（库不应假定调用方上下文）。

## 正确做法

### 1. 并发：先发起再一起等

```csharp
public async Task<string> FetchAsync(HttpClient client, string url, CancellationToken ct)
{
    using var resp = await client.GetAsync(url, ct).ConfigureAwait(false);
    return await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
}

// 真正并发：先各自发起，再统一 await
var tA = GetA(ct);   // 立即拿到 Task，不 await
var tB = GetB(ct);
var (a, b) = (await tA, await tB);
// 或等待一组：
var results = await Task.WhenAll(GetA(ct), GetB(ct));
```

### 2. ConfigureAwait 何时用？

| 场景 | 用 `ConfigureAwait(false)`？ | 理由 |
|------|------------------------------|------|
| 库代码（被任意调用方复用） | ✅ 习惯上用 | 不假定调用方上下文，释放并发 |
| ASP.NET Core 后端 | 非必须 | 无同步上下文，延续在线程池 |
| 桌面 UI 代码（要回 UI 线程更新） | ❌ 不要 | 需回到 UI 上下文 |
| `async void` 事件处理 | 不用 | 见误区 |

### 3. 支持取消

异步 API 几乎都接受 `CancellationToken`；自己写的异步方法也应把它一路透传，让调用方能中止长时间操作（见 [弹性与容错](../fundamentals/resilience.md)）。

## 常见误区

❌ **用 `.Result`/`.Wait()` 阻塞异步调用**（尤其 UI/旧 ASP.NET），让延续死等被占用的上下文 → 死锁：
```csharp
var html = FetchAsync(client, url).Result; // 可能死锁
```
应一路 `async/await` 到顶层。

❌ **`async void` 用于普通方法**。异常无法被 `catch`、难组合；`async void` 只应出现在事件处理程序。

❌ **"点火就忘"忘了 `await`**。任务悄悄 fire-and-forget，出错无从知晓、易资源泄漏。若要后台跑，用 `Task.Run` + 显式 `await` 或 [后台服务](../fundamentals/background-services.md)。

❌ **误写"伪并行"**：`var (a,b) = (await GetA(), await GetB());` 因左到右求值，会先等完 `GetA` 再调用 `GetB`，实际串行。先发起再统一 `await` 或用 `Task.WhenAll`。

❌ **库代码保留 `ConfigureAwait(true)` 限制并发**。库通常没有"必须回原线程"的理由，用 `false` 释放调用方。

## 适用版本

`async/await` C# 5+；ASP.NET Core 无同步上下文自 netcore 起。示例面向 net8+。

### Native AOT 兼容性

`Task`/`async/await` 与状态机是运行时特性，**AOT 安全**（[AOT 矩阵](../aot/aot-compatibility.md)）。注意：`CancellationToken`、委托均无反射；若异步结果需 JSON 序列化，走 `System.Text.Json` **源生成**（见 [序列化](serialization.md)）。

## 参考资料

- [ValueTask 与零分配异步](modern-csharp.md#value-task) · [Span 与 Memory 零拷贝](modern-csharp.md#span)
- [弹性与容错（取消/超时/重试）](../fundamentals/resilience.md) · [后台服务](../fundamentals/background-services.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[异步编程（C#）](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
